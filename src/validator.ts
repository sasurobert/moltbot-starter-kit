import {UserSigner} from '@multiversx/sdk-wallet';
import {Transaction, Address, TransactionComputer} from '@multiversx/sdk-core';
import {ApiNetworkProvider} from '@multiversx/sdk-network-providers';
import axios from 'axios';
import {promises as fs} from 'fs';
import * as path from 'path';
import {CONFIG} from './config';

export class Validator {
  private relayerUrl: string | null = null;
  private relayerAddress: string | null = null;
  private txComputer = new TransactionComputer();

  setRelayerConfig(url: string, address: string) {
    this.relayerUrl = url;
    this.relayerAddress = address;
  }
  async submitProof(jobId: string, resultHash: string): Promise<string> {
    console.log(`Submitting proof for ${jobId}:hash=${resultHash}`);

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

    // 3. Construct Transaction
    const probIdHex = Buffer.from(jobId).toString('hex');
    const data = Buffer.from(`submit_proof@${probIdHex}@${resultHash}`);

    const receiver = new Address(CONFIG.ADDRESSES.VALIDATION_REGISTRY);

    const tx = new Transaction({
      nonce: BigInt(account.nonce),
      value: 0n,
      receiver: receiver,
      gasLimit: BigInt(CONFIG.GAS_LIMITS.SUBMIT_PROOF),
      chainID: CONFIG.CHAIN_ID,
      data: data,
      sender: senderAddress,
    });

    // 4. Relayer or Direct?
    if (this.relayerUrl && this.relayerAddress) {
      console.log('Using Gasless Relayer V3...');
      tx.relayer = new Address(this.relayerAddress);
      tx.version = 2;
      tx.gasLimit = BigInt(CONFIG.GAS_LIMITS.SUBMIT_PROOF) + 50000n; // Add gas for relaying
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
          console.log(`Sending to Relayer Service: ${this.relayerUrl}`);
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

        console.log(`Transaction sent: ${txHash}`);
        return txHash;
      } catch (e: any) {
        const msg = e.response?.data?.error || e.message;
        const status = e.response?.status;

        // Auto-Registration on 403
        if (status === 403 && msg.includes('register')) {
          console.warn('Agent not registered. Initiating Auto-Registration...');
          try {
            await this.registerAgent();
            console.log(
              'Registration successful. Retrying proof submission...',
            );
            attempts--; // Don't count registration as a failed attempt
            continue;
          } catch (regError: any) {
            console.error('Auto-Registration failed:', regError.message);
            throw regError; // Fail fast if registration fails
          }
        }

        attempts++;
        console.warn(`Tx Broadcast Attempt ${attempts} failed: ${msg}`);
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

    console.log('Fetching PoW Challenge...');
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
    const {PoWSolver} = require('./pow');
    const solver = new PoWSolver();
    const nonce = solver.solve(challenge);

    // 3. Create Registration Tx
    const provider = new ApiNetworkProvider(CONFIG.API_URL, {
      clientName: 'moltbot',
    });
    const account = await provider.getAccount({
      bech32: () => senderAddress.toBech32(),
    });

    const data = Buffer.from(
      'register_agent@' + Buffer.from('moltbot').toString('hex'),
    );

    const tx = new Transaction({
      nonce: BigInt(account.nonce),
      value: 0n,
      receiver: new Address(CONFIG.ADDRESSES.IDENTITY_REGISTRY), // Send to Identity Registry!
      gasLimit: 6000000n, // Registration is heavier
      chainID: CONFIG.CHAIN_ID,
      data: data,
      sender: senderAddress,
      version: 2,
    });

    tx.relayer = new Address(this.relayerAddress);

    const comp = new TransactionComputer();
    const serialized = comp.computeBytesForSigning(tx);
    tx.signature = await signer.sign(serialized);

    // 4. Relay with Nonce
    console.log('Relaying Registration Transaction...');
    const relayRes = await axios.post(`${this.relayerUrl}/relay`, {
      transaction: tx.toPlainObject(),
      challengeNonce: nonce,
    });

    console.log('Registration Tx Sent:', relayRes.data.txHash);

    // Wait for it? Optional. Relayer auth check is on-chain or challenge.
    // If we want "isAuthorized" to pass via on-chain check, we must wait.
    // If "isAuthorized" passes via challenge-cache (if implemented), we could proceed.
    // But our Relayer logic is: isRegisteredOnChain OR (RegisterTx + Challenge).
    // Proof submission is NOT a register tx. So for proof submission to pass,
    // the agent MUST BE ON-CHAIN.
    // So we MUST wait for registration to process.

    console.log('Waiting for registration to be confirmed...');
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
      return tx.status.toString();
    } catch (e) {
      console.warn(
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
