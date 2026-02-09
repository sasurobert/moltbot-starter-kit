import {UserSigner} from '@multiversx/sdk-wallet';
import {
  Address,
  TransactionComputer,
  Abi,
  DevnetEntrypoint,
  VariadicValue,
} from '@multiversx/sdk-core';
import {ApiNetworkProvider} from '@multiversx/sdk-network-providers';
import axios from 'axios';
import {promises as fs} from 'fs';
import * as path from 'path';
import {CONFIG} from './config';
import * as identityAbiJson from './abis/identity-registry.abi.json';
import * as validationAbiJson from './abis/validation-registry.abi.json';
import {Logger} from './utils/logger';
import {PoWSolver} from './pow';

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

    // 1. Setup Provider & Signer
    const provider = new ApiNetworkProvider(CONFIG.API_URL, {
      clientName: 'moltbot',
      timeout: CONFIG.REQUEST_TIMEOUT,
    });

    const pemPath =
      process.env.MULTIVERSX_PRIVATE_KEY || path.resolve('wallet.pem');
    const pemContent = await fs.readFile(pemPath, 'utf8');
    const signer = UserSigner.fromPem(pemContent);
    const senderAddress = new Address(signer.getAddress().bech32());

    // 2. Fetch Account State (Nonce) with Timeout
    const account = await this.withTimeout(
      provider.getAccount({bech32: () => senderAddress.toBech32()}),
      'Fetching Account',
    );

    // 3. Construct Transaction using ABI Factory
    const entrypoint = new DevnetEntrypoint({url: CONFIG.API_URL});
    const rawValAbi = JSON.stringify(validationAbiJson)
      .replace(/"TokenId"/g, '"TokenIdentifier"')
      .replace(/"NonZeroBigUint"/g, '"BigUint"');
    const validationAbi = Abi.create(JSON.parse(rawValAbi));
    const factory =
      entrypoint.createSmartContractTransactionsFactory(validationAbi);

    const receiver = new Address(CONFIG.ADDRESSES.VALIDATION_REGISTRY);

    const tx = await factory.createTransactionForExecute(senderAddress, {
      contract: receiver,
      function: 'submit_proof',
      gasLimit: BigInt(CONFIG.GAS_LIMITS.SUBMIT_PROOF),
      arguments: [Buffer.from(jobId), Buffer.from(resultHash, 'hex')],
    });

    tx.nonce = BigInt(account.nonce); // Override with fetched nonce

    // 4. Relayer or Direct?
    if (this.relayerUrl && this.relayerAddress) {
      this.logger.info('Using Gasless Relayer V3...');
      tx.relayer = new Address(this.relayerAddress);
      tx.version = 2;
      tx.gasLimit =
        BigInt(tx.gasLimit.toString()) + CONFIG.RELAYER_GAS_OVERHEAD;
    }

    // 5. Sign
    const serialized = this.txComputer.computeBytesForSigning(tx);
    const signature = await signer.sign(serialized);
    tx.signature = signature;

    // 6. Broadcast (with Retry & Auto-Registration)
    let attempts = 0;
    const maxAttempts = 3;
    while (attempts < maxAttempts) {
      try {
        let txHash = '';

        if (this.relayerUrl && this.relayerAddress) {
          // Send to Relayer
          this.logger.info(`Sending to Relayer Service: ${this.relayerUrl}`);
          const relayRes = await axios.post(
            `${this.relayerUrl}/relay`,
            {transaction: tx.toPlainObject()},
            {timeout: CONFIG.REQUEST_TIMEOUT},
          );
          txHash = relayRes.data.txHash;
        } else {
          // Direct
          txHash = await this.withTimeout(
            provider.sendTransaction(tx),
            'Broadcasting Transaction',
          );
        }

        this.logger.info(`Transaction sent: ${txHash}`);
        return txHash;
      } catch (e: unknown) {
        const err = e as {
          response?: {data?: {error?: string}; status?: number};
          message?: string;
        };
        const msg = err.response?.data?.error || err.message;
        const status = err.response?.status;

        // Auto-Registration on 403
        if (status === 403 && msg?.includes('register')) {
          this.logger.warn(
            'Agent not registered. Initiating Auto-Registration...',
          );
          try {
            await this.registerAgent();
            this.logger.info(
              'Registration successful. Retrying proof submission...',
            );
            attempts--; // Don't count registration as a failed attempt
            continue;
          } catch (regError) {
            this.logger.error(
              'Auto-Registration failed:',
              (regError as Error).message,
            );
            throw regError; // Fail fast if registration fails
          }
        }

        attempts++;
        this.logger.warn(`Tx Broadcast Attempt ${attempts} failed: ${msg}`);
        if (attempts >= maxAttempts) throw e;
        await new Promise(r => setTimeout(r, 1000 * attempts)); // Backoff
      }
    }
    throw new Error('Failed to broadcast transaction after retries');
  }

  async registerAgent() {
    if (!this.relayerUrl || !this.relayerAddress) {
      throw new Error('Relayer not configured. Cannot register.');
    }

    this.logger.info('Fetching PoW Challenge...');
    const pemPath =
      process.env.MULTIVERSX_PRIVATE_KEY || path.resolve('wallet.pem');
    const pemContent = await fs.readFile(pemPath, 'utf8');
    const signer = UserSigner.fromPem(pemContent);
    const senderAddress = new Address(signer.getAddress().bech32());

    // 1. Get Challenge
    const challengeRes = await axios.post(`${this.relayerUrl}/challenge`, {
      address: senderAddress.toBech32(),
    });
    const challenge = challengeRes.data;

    // 2. Solve
    const solver = new PoWSolver();
    const nonce = solver.solve(challenge);

    // 3. Create Registration Tx
    const provider = new ApiNetworkProvider(CONFIG.API_URL, {
      clientName: 'moltbot',
    });
    const account = await provider.getAccount({
      bech32: () => senderAddress.toBech32(),
    });

    // 3. Create Registration Tx using ABI Factory
    const entrypoint = new DevnetEntrypoint({url: CONFIG.API_URL});
    const rawIdAbi = JSON.stringify(identityAbiJson)
      .replace(/"TokenId"/g, '"TokenIdentifier"')
      .replace(/"NonZeroBigUint"/g, '"BigUint"');
    const identityAbi = Abi.create(JSON.parse(rawIdAbi));
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
    tx.version = 2;
    tx.relayer = new Address(this.relayerAddress);

    // 4. Relay with Nonce
    this.logger.info('Relaying Registration Transaction...');
    const relayRes = await axios.post(`${this.relayerUrl}/relay`, {
      transaction: tx.toPlainObject(),
      challengeNonce: nonce,
    });

    this.logger.info(`Registration Tx Sent: ${relayRes.data.txHash}`);

    // Wait for it? Optional. Relayer auth check is on-chain or challenge.
    // If we want "isAuthorized" to pass via on-chain check, we must wait.
    // If "isAuthorized" passes via challenge-cache (if implemented), we could proceed.
    // But our Relayer logic is: isRegisteredOnChain OR (RegisterTx + Challenge).
    // Proof submission is NOT a register tx. So for proof submission to pass,
    // the agent MUST BE ON-CHAIN.
    // So we MUST wait for registration to process.

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
    const provider = new ApiNetworkProvider(CONFIG.API_URL, {
      clientName: 'moltbot',
      timeout: CONFIG.REQUEST_TIMEOUT,
    });
    try {
      const tx = await this.withTimeout(
        provider.getTransaction(txHash),
        'Fetching Transaction Status',
      );
      return tx.status.toString().toLowerCase();
    } catch (e: unknown) {
      const err = e as {response?: {status?: number}; message?: string};
      // Handle 404 as 'not_found'
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
