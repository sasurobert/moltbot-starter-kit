import {
  Address,
  TransactionComputer,
  VariadicValue,
} from '@multiversx/sdk-core';
import axios from 'axios';
import {CONFIG} from './config';
import * as identityAbiJson from './abis/identity-registry.abi.json';
import * as validationAbiJson from './abis/validation-registry.abi.json';
import {Logger} from './utils/logger';
import {PoWSolver} from './pow';
import {
  loadSignerWithAddress,
  createProvider,
  createEntrypoint,
  createPatchedAbi,
  withRelayer,
} from './chain';

export class Validator {
  private logger = new Logger('Validator');
  private relayerUrl: string | null = null;
  private relayerAddress: string | null = null;
  private txComputer = new TransactionComputer();

  setRelayerConfig(url: string, address: string) {
    this.relayerUrl = url;
    this.relayerAddress = address;
  }
  async submitProof(jobId: string, resultHash: string): Promise<string> {
    this.logger.info(`Submitting proof for ${jobId}:hash=${resultHash}`);

    const provider = createProvider('moltbot');
    const {signer, senderAddress} = await loadSignerWithAddress();

    const entrypoint = createEntrypoint();
    const validationAbi = createPatchedAbi(validationAbiJson);
    const factory =
      entrypoint.createSmartContractTransactionsFactory(validationAbi);
    const receiver = new Address(CONFIG.ADDRESSES.VALIDATION_REGISTRY);

    // Each attempt re-fetches the nonce and re-signs, so a retry uses a fresh
    // transaction object instead of re-broadcasting an already-rejected one.
    const buildAndSign = async () => {
      const account = await this.withTimeout(
        provider.getAccount({bech32: () => senderAddress.toBech32()}),
        'Fetching Account',
      );

      const tx = await factory.createTransactionForExecute(senderAddress, {
        contract: receiver,
        function: 'submit_proof',
        gasLimit: BigInt(CONFIG.GAS_LIMITS.SUBMIT_PROOF),
        arguments: [Buffer.from(jobId), Buffer.from(resultHash, 'hex')],
      });

      tx.nonce = BigInt(account.nonce);

      if (this.relayerUrl && this.relayerAddress) {
        withRelayer(tx, new Address(this.relayerAddress));
      }

      tx.signature = await signer.sign(
        this.txComputer.computeBytesForSigning(tx),
      );

      return tx;
    };

    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        const tx = await buildAndSign();
        let txHash = '';

        if (this.relayerUrl && this.relayerAddress) {
          this.logger.info(`Sending to Relayer Service: ${this.relayerUrl}`);
          const relayRes = await axios.post(
            `${this.relayerUrl}/relay`,
            {transaction: tx.toPlainObject()},
            {timeout: CONFIG.REQUEST_TIMEOUT},
          );
          txHash = relayRes.data.txHash;
        } else {
          txHash = await this.withTimeout(
            provider.sendTransaction(tx),
            'Broadcasting Transaction',
          );
        }

        this.logger.info(`Transaction sent: ${txHash}`);
        return txHash;
      } catch (e: unknown) {
        const err = e as {
          response?: {
            data?: {error?: string; code?: string};
            status?: number;
          };
          message?: string;
        };
        const msg = err.response?.data?.error || err.message;
        const status = err.response?.status;
        const errorCode = err.response?.data?.code;

        // Relayer auto-registration contract:
        //   Preferred: relayer returns { status: 403, code: 'AGENT_NOT_REGISTERED' }.
        //   Fallback : when no `code` is set, match the message against a
        //              tight regex (kept only for older relayers; any other
        //              403 surfaces as a real authz failure).
        const isUnregistered =
          errorCode === 'AGENT_NOT_REGISTERED' ||
          (errorCode === undefined &&
            status === 403 &&
            /agent.+not.+register|not.+register.+agent/i.test(msg ?? ''));

        if (isUnregistered) {
          this.logger.warn(
            'Agent not registered. Initiating Auto-Registration...',
          );
          try {
            await this.registerAgent();
            this.logger.info(
              'Registration successful. Retrying proof submission...',
            );
            // Registration is a side-quest, not a failed proof submission.
            attempts--;
            continue;
          } catch (regError) {
            this.logger.error(
              'Auto-Registration failed:',
              (regError as Error).message,
            );
            throw regError;
          }
        }

        attempts++;
        this.logger.warn(`Tx Broadcast Attempt ${attempts} failed: ${msg}`);
        if (attempts >= maxAttempts) throw e;
        await new Promise(r => setTimeout(r, 1000 * attempts));
      }
    }
    throw new Error('Failed to broadcast transaction after retries');
  }

  async registerAgent() {
    if (!this.relayerUrl || !this.relayerAddress) {
      throw new Error('Relayer not configured. Cannot register.');
    }

    this.logger.info('Fetching PoW Challenge...');
    // No signer needed: relayer authorizes registration via PoW challenge,
    // not via inner-tx signature.
    const {senderAddress} = await loadSignerWithAddress();

    const challengeRes = await axios.post(`${this.relayerUrl}/challenge`, {
      address: senderAddress.toBech32(),
    });
    const challenge = challengeRes.data;

    const nonce = new PoWSolver().solve(challenge);

    const provider = createProvider('moltbot');
    const account = await provider.getAccount({
      bech32: () => senderAddress.toBech32(),
    });

    const entrypoint = createEntrypoint();
    const identityAbi = createPatchedAbi(identityAbiJson);
    const factory =
      entrypoint.createSmartContractTransactionsFactory(identityAbi);

    const tx = await factory.createTransactionForExecute(senderAddress, {
      contract: new Address(CONFIG.ADDRESSES.IDENTITY_REGISTRY),
      function: 'register_agent',
      gasLimit: CONFIG.GAS_LIMITS.REGISTER_AGENT,
      arguments: [
        Buffer.from(CONFIG.AGENT.NAME),
        Buffer.from(CONFIG.AGENT.URI),
        Buffer.from(senderAddress.getPublicKey()),
        VariadicValue.fromItemsCounted(), // metadata (empty)
        VariadicValue.fromItemsCounted(), // services (empty)
      ],
    });

    tx.nonce = BigInt(account.nonce);
    withRelayer(tx, new Address(this.relayerAddress));

    this.logger.info('Relaying Registration Transaction...');
    const relayRes = await axios.post(`${this.relayerUrl}/relay`, {
      transaction: tx.toPlainObject(),
      challengeNonce: nonce,
    });

    this.logger.info(`Registration Tx Sent: ${relayRes.data.txHash}`);

    // submit_proof requires the agent to be on-chain (relayer does not accept
    // a register+proof bundle), so block here until the registration tx lands.
    this.logger.info('Waiting for registration to be confirmed...');
    await this.waitForTx(relayRes.data.txHash);
  }

  async waitForTx(hash: string) {
    let retries = 0;
    while (retries < 20) {
      const status = await this.getTxStatus(hash);
      if (status === 'success' || status === 'successful') return;
      if (status === 'fail' || status === 'failed')
        throw new Error('Registration failed on-chain');
      await new Promise(r => setTimeout(r, 3000));
      retries++;
    }
    throw new Error('Registration timed out');
  }

  async getTxStatus(txHash: string): Promise<string> {
    const provider = createProvider('moltbot');
    try {
      const tx = await this.withTimeout(
        provider.getTransaction(txHash),
        'Fetching Transaction Status',
      );
      return tx.status.toString().toLowerCase();
    } catch (e: unknown) {
      const err = e as {response?: {status?: number}; message?: string};
      if (err.response?.status === 404 || err.message?.includes('404')) {
        return 'not_found';
      }
      this.logger.warn(
        `Failed to fetch status for ${txHash}: ${(e as Error).message}`,
      );
      return 'unknown';
    }
  }

  private async withTimeout<T>(promise: Promise<T>, label: string): Promise<T> {
    let timer: NodeJS.Timeout;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(`${label} timed out after ${CONFIG.REQUEST_TIMEOUT}ms`),
          ),
        CONFIG.REQUEST_TIMEOUT,
      );
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timer!);
      return result;
    } catch (error) {
      clearTimeout(timer!);
      throw error;
    }
  }
}
