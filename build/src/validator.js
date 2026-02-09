"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Validator = void 0;
const sdk_wallet_1 = require("@multiversx/sdk-wallet");
const sdk_core_1 = require("@multiversx/sdk-core");
const sdk_network_providers_1 = require("@multiversx/sdk-network-providers");
const axios_1 = __importDefault(require("axios"));
const fs_1 = require("fs");
const path = __importStar(require("path"));
const config_1 = require("./config");
const identityAbiJson = __importStar(require("./abis/identity-registry.abi.json"));
const validationAbiJson = __importStar(require("./abis/validation-registry.abi.json"));
const logger_1 = require("./utils/logger");
const pow_1 = require("./pow");
class Validator {
    logger = new logger_1.Logger('Validator');
    relayerUrl = null;
    relayerAddress = null;
    txComputer = new sdk_core_1.TransactionComputer();
    setRelayerConfig(url, address) {
        this.relayerUrl = url;
        this.relayerAddress = address;
    }
    async submitProof(jobId, resultHash) {
        this.logger.info(`Submitting proof for ${jobId}:hash=${resultHash}`);
        // 1. Setup Provider & Signer
        const provider = new sdk_network_providers_1.ApiNetworkProvider(config_1.CONFIG.API_URL, {
            clientName: 'moltbot',
            timeout: config_1.CONFIG.REQUEST_TIMEOUT,
        });
        const pemPath = process.env.MULTIVERSX_PRIVATE_KEY || path.resolve('wallet.pem');
        const pemContent = await fs_1.promises.readFile(pemPath, 'utf8');
        const signer = sdk_wallet_1.UserSigner.fromPem(pemContent);
        const senderAddress = new sdk_core_1.Address(signer.getAddress().bech32());
        // 2. Fetch Account State (Nonce) with Timeout
        const account = await this.withTimeout(provider.getAccount({ bech32: () => senderAddress.toBech32() }), 'Fetching Account');
        // 3. Construct Transaction using ABI Factory
        const entrypoint = new sdk_core_1.DevnetEntrypoint({ url: config_1.CONFIG.API_URL });
        const validationAbi = sdk_core_1.Abi.create(validationAbiJson);
        const factory = entrypoint.createSmartContractTransactionsFactory(validationAbi);
        const receiver = new sdk_core_1.Address(config_1.CONFIG.ADDRESSES.VALIDATION_REGISTRY);
        const tx = await factory.createTransactionForExecute(senderAddress, {
            contract: receiver,
            function: 'submit_proof',
            gasLimit: BigInt(config_1.CONFIG.GAS_LIMITS.SUBMIT_PROOF),
            arguments: [Buffer.from(jobId), Buffer.from(resultHash, 'hex')],
        });
        tx.nonce = BigInt(account.nonce); // Override with fetched nonce
        // 4. Relayer or Direct?
        if (this.relayerUrl && this.relayerAddress) {
            this.logger.info('Using Gasless Relayer V3...');
            tx.relayer = new sdk_core_1.Address(this.relayerAddress);
            tx.version = 2;
            tx.gasLimit =
                BigInt(tx.gasLimit.toString()) + config_1.CONFIG.RELAYER_GAS_OVERHEAD;
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
                    const relayRes = await axios_1.default.post(`${this.relayerUrl}/relay`, { transaction: tx.toPlainObject() }, { timeout: config_1.CONFIG.REQUEST_TIMEOUT });
                    txHash = relayRes.data.txHash;
                }
                else {
                    // Direct
                    txHash = await this.withTimeout(provider.sendTransaction(tx), 'Broadcasting Transaction');
                }
                this.logger.info(`Transaction sent: ${txHash}`);
                return txHash;
            }
            catch (e) {
                const err = e;
                const msg = err.response?.data?.error || err.message;
                const status = err.response?.status;
                // Auto-Registration on 403
                if (status === 403 && msg?.includes('register')) {
                    this.logger.warn('Agent not registered. Initiating Auto-Registration...');
                    try {
                        await this.registerAgent();
                        this.logger.info('Registration successful. Retrying proof submission...');
                        attempts--; // Don't count registration as a failed attempt
                        continue;
                    }
                    catch (regError) {
                        this.logger.error('Auto-Registration failed:', regError.message);
                        throw regError; // Fail fast if registration fails
                    }
                }
                attempts++;
                this.logger.warn(`Tx Broadcast Attempt ${attempts} failed: ${msg}`);
                if (attempts >= maxAttempts)
                    throw e;
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
        const pemPath = process.env.MULTIVERSX_PRIVATE_KEY || path.resolve('wallet.pem');
        const pemContent = await fs_1.promises.readFile(pemPath, 'utf8');
        const signer = sdk_wallet_1.UserSigner.fromPem(pemContent);
        const senderAddress = new sdk_core_1.Address(signer.getAddress().bech32());
        // 1. Get Challenge
        const challengeRes = await axios_1.default.post(`${this.relayerUrl}/challenge`, {
            address: senderAddress.toBech32(),
        });
        const challenge = challengeRes.data;
        // 2. Solve
        const solver = new pow_1.PoWSolver();
        const nonce = solver.solve(challenge);
        // 3. Create Registration Tx
        const provider = new sdk_network_providers_1.ApiNetworkProvider(config_1.CONFIG.API_URL, {
            clientName: 'moltbot',
        });
        const account = await provider.getAccount({
            bech32: () => senderAddress.toBech32(),
        });
        // 3. Create Registration Tx using ABI Factory
        const entrypoint = new sdk_core_1.DevnetEntrypoint({ url: config_1.CONFIG.API_URL });
        const identityAbi = sdk_core_1.Abi.create(identityAbiJson);
        const factory = entrypoint.createSmartContractTransactionsFactory(identityAbi);
        const tx = await factory.createTransactionForExecute(senderAddress, {
            contract: new sdk_core_1.Address(config_1.CONFIG.ADDRESSES.IDENTITY_REGISTRY),
            function: 'register_agent',
            gasLimit: config_1.CONFIG.GAS_LIMITS.REGISTER_AGENT,
            arguments: [
                Buffer.from(config_1.CONFIG.AGENT.NAME),
                Buffer.from(config_1.CONFIG.AGENT.URI),
                Buffer.from(senderAddress.getPublicKey()),
                sdk_core_1.VariadicValue.fromItemsCounted(), // metadata (empty)
                sdk_core_1.VariadicValue.fromItemsCounted(), // services (empty)
            ],
        });
        tx.nonce = BigInt(account.nonce);
        tx.version = 2;
        tx.relayer = new sdk_core_1.Address(this.relayerAddress);
        // 4. Relay with Nonce
        this.logger.info('Relaying Registration Transaction...');
        const relayRes = await axios_1.default.post(`${this.relayerUrl}/relay`, {
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
    async waitForTx(hash) {
        let retries = 0;
        while (retries < 20) {
            const status = await this.getTxStatus(hash);
            if (status === 'success' || status === 'successful')
                return;
            if (status === 'fail' || status === 'failed')
                throw new Error('Registration failed on-chain');
            await new Promise(r => setTimeout(r, 3000));
            retries++;
        }
        throw new Error('Registration timed out');
    }
    async getTxStatus(txHash) {
        const provider = new sdk_network_providers_1.ApiNetworkProvider(config_1.CONFIG.API_URL, {
            clientName: 'moltbot',
            timeout: config_1.CONFIG.REQUEST_TIMEOUT,
        });
        try {
            const tx = await this.withTimeout(provider.getTransaction(txHash), 'Fetching Transaction Status');
            return tx.status.toString().toLowerCase();
        }
        catch (e) {
            const err = e;
            // Handle 404 as 'not_found'
            if (err.response?.status === 404 || err.message?.includes('404')) {
                return 'not_found';
            }
            this.logger.warn(`Failed to fetch status for ${txHash}: ${e.message}`);
            return 'unknown';
        }
    }
    async withTimeout(promise, label) {
        let timer;
        const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`${label} timed out after ${config_1.CONFIG.REQUEST_TIMEOUT}ms`)), config_1.CONFIG.REQUEST_TIMEOUT);
        });
        try {
            const result = await Promise.race([promise, timeoutPromise]);
            clearTimeout(timer);
            return result;
        }
        catch (error) {
            clearTimeout(timer);
            throw error;
        }
    }
}
exports.Validator = Validator;
//# sourceMappingURL=validator.js.map