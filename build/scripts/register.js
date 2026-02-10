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
const sdk_wallet_1 = require("@multiversx/sdk-wallet");
const sdk_network_providers_1 = require("@multiversx/sdk-network-providers");
const sdk_core_1 = require("@multiversx/sdk-core");
const fs_1 = require("fs");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
const crypto_1 = require("crypto");
const config_1 = require("../src/config");
const RelayerAddressCache_1 = require("../src/utils/RelayerAddressCache");
dotenv.config();
// Setup TransactionComputer for serialization
const txComputer = new sdk_core_1.TransactionComputer();
const RELAYED_V3_EXTRA_GAS = 50000n;
/**
 * Solve a Lib-based PoW Challenge for the Relayer
 */
function solveChallenge(challenge) {
    console.log(`🧩 Solving PoW Challenge (Difficulty: ${challenge.difficulty} bits)...`);
    const startTime = Date.now();
    let nonce = 0;
    const difficulty = challenge.difficulty;
    const fullBytes = Math.floor(difficulty / 8);
    const remainingBits = difficulty % 8;
    const threshold = 1 << (8 - remainingBits);
    while (true) {
        const data = `${challenge.address}${challenge.salt}${nonce}`;
        const hash = (0, crypto_1.createHash)('sha256').update(data).digest();
        let isValid = true;
        // Check full bytes
        for (let i = 0; i < fullBytes; i++) {
            if (hash[i] !== 0) {
                isValid = false;
                break;
            }
        }
        if (isValid && remainingBits > 0) {
            if (hash[fullBytes] >= threshold) {
                isValid = false;
            }
        }
        if (isValid) {
            const timeTaken = (Date.now() - startTime) / 1000;
            console.log(`✅ Challenge Solved in ${timeTaken.toFixed(2)}s! Nonce: ${nonce}`);
            return nonce.toString();
        }
        nonce++;
    }
}
async function main() {
    console.log('🚀 Starting Agent Registration...');
    // 1. Setup Provider & Signer
    // Use ProxyProvider if Localhost (Chain Sim)
    const isLocal = config_1.CONFIG.API_URL.includes('localhost') ||
        config_1.CONFIG.API_URL.includes('127.0.0.1');
    const provider = isLocal
        ? new sdk_network_providers_1.ProxyNetworkProvider(config_1.CONFIG.API_URL)
        : new sdk_network_providers_1.ApiNetworkProvider(config_1.CONFIG.API_URL);
    console.log(`Using Provider: ${isLocal ? 'ProxyNetworkProvider' : 'ApiNetworkProvider'} (${config_1.CONFIG.API_URL})`);
    const pemPath = process.env.MULTIVERSX_PRIVATE_KEY || path.resolve('wallet.pem');
    const pemContent = await fs_1.promises.readFile(pemPath, 'utf8');
    const signer = sdk_wallet_1.UserSigner.fromPem(pemContent);
    const senderAddress = new sdk_core_1.Address(signer.getAddress().bech32());
    // 2. Load Config
    const configPath = path.resolve('config.json');
    let config = {
        agentName: 'Moltbot',
        nonce: 0,
        pricing: '1USDC',
        capabilities: [],
        manifestUri: '',
        metadata: [],
        services: [],
    };
    try {
        config = JSON.parse(await fs_1.promises.readFile(configPath, 'utf8'));
    }
    catch {
        console.warn('Config file missing, utilizing defaults.');
    }
    console.log(`Registering Agent: ${config.agentName}...`);
    // 3. Load ABI and construct transaction using SmartContractTransactionsFactory
    const registryAddress = config_1.CONFIG.ADDRESSES.IDENTITY_REGISTRY;
    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    // Load the identity-registry ABI for proper argument encoding
    const abiPath = path.resolve(__dirname, '..', 'identity-registry.abi.json');
    const rawAbiStr = (await fs_1.promises.readFile(abiPath, 'utf8'))
        .replace(/"TokenId"/g, '"TokenIdentifier"')
        .replace(/"NonZeroBigUint"/g, '"BigUint"');
    const abiJson = JSON.parse(rawAbiStr);
    const abi = sdk_core_1.Abi.create(abiJson);
    const factoryConfig = new sdk_core_1.TransactionsFactoryConfig({
        chainID: config_1.CONFIG.CHAIN_ID,
    });
    const factory = new sdk_core_1.SmartContractTransactionsFactory({
        config: factoryConfig,
        abi,
    });
    // Build metadata entries matching the ABI's MetadataEntry struct
    const agentUri = config.manifestUri || `https://agent.molt.bot/${config.agentName}`;
    const publicKeyHex = senderAddress.toHex();
    // Prepare metadata args: each entry is {key: Buffer, value: Buffer}
    const metadataArgs = [];
    if (config.metadata && config.metadata.length > 0) {
        for (const entry of config.metadata) {
            const keyBuf = Buffer.from(entry.key);
            let valueBuf;
            if (entry.value.startsWith('0x')) {
                valueBuf = Buffer.from(entry.value.substring(2), 'hex');
            }
            else {
                valueBuf = Buffer.from(entry.value);
            }
            metadataArgs.push({ key: keyBuf, value: valueBuf });
        }
    }
    console.log(`Name: ${config.agentName}`);
    console.log(`URI: ${agentUri}`);
    console.log(`Public Key: ${publicKeyHex.substring(0, 16)}...`);
    if (config.metadata?.length > 0)
        console.log(`Metadata: ${config.metadata.length} entries`);
    // Construct the MetadataEntry StructType manually (avoids relying on abi.registry).
    // MetadataEntry { key: bytes, value: bytes }
    const metadataType = new sdk_core_1.StructType('MetadataEntry', [
        new sdk_core_1.FieldDefinition('key', '', new sdk_core_1.BytesType()),
        new sdk_core_1.FieldDefinition('value', '', new sdk_core_1.BytesType()),
    ]);
    const metadataTyped = metadataArgs.map(m => new sdk_core_1.Struct(metadataType, [
        new sdk_core_1.Field(new sdk_core_1.BytesValue(m.key), 'key'),
        new sdk_core_1.Field(new sdk_core_1.BytesValue(m.value), 'value'),
    ]));
    // Construct the ServiceConfigInput StructType manually.
    const serviceConfigType = new sdk_core_1.StructType('ServiceConfigInput', [
        new sdk_core_1.FieldDefinition('service_id', '', new sdk_core_1.U32Type()),
        new sdk_core_1.FieldDefinition('price', '', new sdk_core_1.BigUIntType()),
        new sdk_core_1.FieldDefinition('token', '', new sdk_core_1.TokenIdentifierType()),
        new sdk_core_1.FieldDefinition('nonce', '', new sdk_core_1.U64Type()),
    ]);
    const servicesTyped = (config.services || []).map(s => new sdk_core_1.Struct(serviceConfigType, [
        new sdk_core_1.Field(new sdk_core_1.U32Value(s.service_id), 'service_id'),
        new sdk_core_1.Field(new sdk_core_1.BigUIntValue(s.price), 'price'),
        new sdk_core_1.Field(new sdk_core_1.TokenIdentifierValue(s.token), 'token'),
        new sdk_core_1.Field(new sdk_core_1.U64Value(s.nonce), 'nonce'),
    ]));
    const scArgs = [
        Buffer.from(config.agentName),
        Buffer.from(agentUri),
        Buffer.from(publicKeyHex, 'hex'),
        sdk_core_1.VariadicValue.fromItemsCounted(...metadataTyped),
        sdk_core_1.VariadicValue.fromItemsCounted(...servicesTyped),
    ];
    const tx = await factory.createTransactionForExecute(senderAddress, {
        contract: new sdk_core_1.Address(registryAddress),
        function: 'register_agent',
        arguments: scArgs,
        gasLimit: BigInt(config_1.CONFIG.GAS_LIMITS.REGISTER),
    });
    tx.nonce = BigInt(account.nonce);
    // Sign the transaction (always required, even for relaying)
    const serialized = txComputer.computeBytesForSigning(tx);
    const signature = await signer.sign(serialized);
    tx.signature = signature;
    // 4. Determine Strategy (Local vs Relayer)
    const balance = BigInt(account.balance.toString());
    const useRelayer = balance === 0n || !!process.env.FORCE_RELAYER;
    if (useRelayer) {
        console.log('Empty wallet detected. Using Relayer fallback...');
        try {
            // A. Get Challenge
            const { data: challenge } = await axios_1.default.post(`${config_1.CONFIG.PROVIDERS.RELAYER_URL}/challenge`, {
                address: senderAddress.toBech32(),
            });
            // A.1 Verify/Get Relayer Address for this Shard
            // The Relayer Service requires the inner transaction's `relayer` field to match the
            // relayer address for the user's shard.
            let relayerAddressBech32 = RelayerAddressCache_1.RelayerAddressCache.get(config_1.CONFIG.PROVIDERS.RELAYER_URL, senderAddress.toBech32());
            if (!relayerAddressBech32) {
                console.log('Fetching Relayer Address for Shard...');
                try {
                    const { data } = await axios_1.default.get(`${config_1.CONFIG.PROVIDERS.RELAYER_URL}/relayer/address/${senderAddress.toBech32()}`);
                    relayerAddressBech32 = data.relayerAddress;
                    RelayerAddressCache_1.RelayerAddressCache.set(config_1.CONFIG.PROVIDERS.RELAYER_URL, senderAddress.toBech32(), relayerAddressBech32);
                    console.log(`Relayer Address cached: ${relayerAddressBech32}`);
                }
                catch (e) {
                    console.warn(`Failed to fetch specific relayer address: ${e.message}. Proceeding without explicit relayer field (may fail if V3 strict).`);
                }
            }
            else {
                console.log(`Using cached Relayer Address: ${relayerAddressBech32}`);
            }
            // Update Transaction with Relayer if available (Required for Relayed V3)
            if (relayerAddressBech32) {
                tx.relayer = new sdk_core_1.Address(relayerAddressBech32);
                tx.gasLimit += RELAYED_V3_EXTRA_GAS;
                // Re-sign because the content changed (relayer field and gasLimit are part of the signature)
                const serializedRelayed = txComputer.computeBytesForSigning(tx);
                const signatureRelayed = await signer.sign(serializedRelayed);
                tx.signature = signatureRelayed;
            }
            // B. Solve Challenge
            const challengeNonce = solveChallenge(challenge);
            // C. Relay
            console.log('Broadcasting via Relayer...');
            const { data: relayResult } = await axios_1.default.post(`${config_1.CONFIG.PROVIDERS.RELAYER_URL}/relay`, {
                transaction: tx.toPlainObject(),
                challengeNonce,
            });
            console.log(`✅ Relayed Transaction Sent: ${relayResult.txHash}`);
            console.log(`Check Explorer: ${config_1.CONFIG.EXPLORER_URL}/transactions/${relayResult.txHash}`);
        }
        catch (e) {
            const err = e;
            console.error('Relaying failed:', err.response?.data?.error || err.message);
            process.exit(1);
        }
    }
    else {
        console.log('Wallet funded. Broadcasting locally...');
        try {
            const txHash = await provider.sendTransaction(tx);
            console.log(`✅ Transaction Sent: ${txHash}`);
            console.log(`Check Explorer: ${config_1.CONFIG.EXPLORER_URL}/transactions/${txHash}`);
        }
        catch (e) {
            console.error('Failed to broadcast transaction:', e.message);
        }
    }
}
main().catch(console.error);
//# sourceMappingURL=register.js.map