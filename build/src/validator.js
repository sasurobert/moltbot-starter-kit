'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
exports.Validator = void 0;
const sdk_wallet_1 = require('@multiversx/sdk-wallet');
const sdk_core_1 = require('@multiversx/sdk-core');
const sdk_network_providers_1 = require('@multiversx/sdk-network-providers');
const axios_1 = require('axios');
const fs_1 = require('fs');
const path = require('path');
const config_1 = require('./config');
class Validator {
  relayerUrl = null;
  relayerAddress = null;
  txComputer = new sdk_core_1.TransactionComputer();
  setRelayerConfig(url, address) {
    this.relayerUrl = url;
    this.relayerAddress = address;
  }
  async submitProof(jobId, resultHash) {
    console.log(`Submitting proof for ${jobId}:hash=${resultHash}`);
    // 1. Setup Provider & Signer
    const provider = new sdk_network_providers_1.ApiNetworkProvider(
      config_1.CONFIG.API_URL,
      {
        clientName: 'moltbot',
        timeout: config_1.CONFIG.REQUEST_TIMEOUT,
      },
    );
    const pemPath =
      process.env.MULTIVERSX_PRIVATE_KEY || path.resolve('wallet.pem');
    const pemContent = await fs_1.promises.readFile(pemPath, 'utf8');
    const signer = sdk_wallet_1.UserSigner.fromPem(pemContent);
    const senderAddress = new sdk_core_1.Address(signer.getAddress().bech32());
    // 2. Fetch Account State (Nonce) with Timeout
    const account = await this.withTimeout(
      provider.getAccount({bech32: () => senderAddress.toBech32()}),
      'Fetching Account',
    );
    // 3. Construct Transaction
    const probIdHex = Buffer.from(jobId).toString('hex');
    const data = Buffer.from(`submit_proof@${probIdHex}@${resultHash}`);
    const receiver = new sdk_core_1.Address(
      config_1.CONFIG.ADDRESSES.VALIDATION_REGISTRY,
    );
    const tx = new sdk_core_1.Transaction({
      nonce: BigInt(account.nonce),
      value: 0n,
      receiver: receiver,
      gasLimit: BigInt(config_1.CONFIG.GAS_LIMITS.SUBMIT_PROOF),
      chainID: config_1.CONFIG.CHAIN_ID,
      data: data,
      sender: senderAddress,
    });
    // 4. Relayer or Direct?
    if (this.relayerUrl && this.relayerAddress) {
      console.log('Using Gasless Relayer V3...');
      tx.relayer = new sdk_core_1.Address(this.relayerAddress);
      tx.version = 2;
      tx.gasLimit = BigInt(config_1.CONFIG.GAS_LIMITS.SUBMIT_PROOF) + 50000n; // Add gas for relaying
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
          const relayRes = await axios_1.default.post(
            `${this.relayerUrl}/relay`,
            {transaction: tx.toPlainObject()},
            {timeout: config_1.CONFIG.REQUEST_TIMEOUT},
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
      } catch (e) {
        const err = e;
        const msg = err.response?.data?.error || err.message;
        const status = err.response?.status;
        // Auto-Registration on 403
        if (status === 403 && msg?.includes('register')) {
          console.warn('Agent not registered. Initiating Auto-Registration...');
          try {
            await this.registerAgent();
            console.log(
              'Registration successful. Retrying proof submission...',
            );
            attempts--; // Don't count registration as a failed attempt
            continue;
          } catch (regError) {
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
    const pemContent = await fs_1.promises.readFile(pemPath, 'utf8');
    const signer = sdk_wallet_1.UserSigner.fromPem(pemContent);
    const senderAddress = new sdk_core_1.Address(signer.getAddress().bech32());
    // 1. Get Challenge
    const challengeRes = await axios_1.default.post(
      `${this.relayerUrl}/challenge`,
      {
        address: senderAddress.toBech32(),
      },
    );
    const challenge = challengeRes.data;
    // 2. Solve
    const {PoWSolver} = require('./pow');
    const solver = new PoWSolver();
    const nonce = solver.solve(challenge);
    // 3. Create Registration Tx
    const provider = new sdk_network_providers_1.ApiNetworkProvider(
      config_1.CONFIG.API_URL,
      {
        clientName: 'moltbot',
      },
    );
    const account = await provider.getAccount({
      bech32: () => senderAddress.toBech32(),
    });
    const data = Buffer.from(
      'register_agent@' + Buffer.from('moltbot').toString('hex'),
    );
    const tx = new sdk_core_1.Transaction({
      nonce: BigInt(account.nonce),
      value: 0n,
      receiver: new sdk_core_1.Address(
        config_1.CONFIG.ADDRESSES.IDENTITY_REGISTRY,
      ), // Send to Identity Registry!
      gasLimit: 6000000n, // Registration is heavier
      chainID: config_1.CONFIG.CHAIN_ID,
      data: data,
      sender: senderAddress,
      version: 2,
    });
    tx.relayer = new sdk_core_1.Address(this.relayerAddress);
    const comp = new sdk_core_1.TransactionComputer();
    const serialized = comp.computeBytesForSigning(tx);
    tx.signature = await signer.sign(serialized);
    // 4. Relay with Nonce
    console.log('Relaying Registration Transaction...');
    const relayRes = await axios_1.default.post(`${this.relayerUrl}/relay`, {
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
  async waitForTx(hash) {
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
  async getTxStatus(txHash) {
    const provider = new sdk_network_providers_1.ApiNetworkProvider(
      config_1.CONFIG.API_URL,
      {
        clientName: 'moltbot',
        timeout: config_1.CONFIG.REQUEST_TIMEOUT,
      },
    );
    try {
      const tx = await this.withTimeout(
        provider.getTransaction(txHash),
        'Fetching Transaction Status',
      );
      return tx.status.toString().toLowerCase();
    } catch (e) {
      const err = e;
      // Handle 404 as 'not_found'
      if (err.response?.status === 404 || err.message?.includes('404')) {
        return 'not_found';
      }
      console.warn(`Failed to fetch status for ${txHash}: ${e.message}`);
      return 'unknown';
    }
  }
  async withTimeout(promise, label) {
    let timer;
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(
        () =>
          reject(
            new Error(
              `${label} timed out after ${config_1.CONFIG.REQUEST_TIMEOUT}ms`,
            ),
          ),
        config_1.CONFIG.REQUEST_TIMEOUT,
      );
    });
    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timer);
      return result;
    } catch (error) {
      clearTimeout(timer);
      throw error;
    }
  }
}
exports.Validator = Validator;
//# sourceMappingURL=validator.js.map
