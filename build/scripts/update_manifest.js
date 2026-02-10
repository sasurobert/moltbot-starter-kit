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
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_wallet_1 = require("@multiversx/sdk-wallet");
const sdk_core_1 = require("@multiversx/sdk-core");
const sdk_network_providers_1 = require("@multiversx/sdk-network-providers");
const fs_1 = require("fs");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const config_1 = require("../src/config");
dotenv.config();
const txComputer = new sdk_core_1.TransactionComputer();
async function main() {
    console.log('🚀 Starting Manifest Update...');
    // 1. Setup Provider & Signer
    const providerUrl = process.env.MULTIVERSX_API_URL || config_1.CONFIG.API_URL;
    const isLocal = providerUrl.includes('localhost') || providerUrl.includes('127.0.0.1');
    const provider = isLocal
        ? new sdk_network_providers_1.ProxyNetworkProvider(providerUrl)
        : new sdk_network_providers_1.ApiNetworkProvider(providerUrl);
    console.log(`Using Provider: ${isLocal ? 'ProxyNetworkProvider' : 'ApiNetworkProvider'} (${providerUrl})`);
    const pemPath = process.env.MULTIVERSX_PRIVATE_KEY || path.resolve('wallet.pem');
    let pemContent = '';
    try {
        pemContent = await fs_1.promises.readFile(pemPath, 'utf8');
    }
    catch {
        console.error('❌ Wallet not found at wallet.pem. Run setup.sh first.');
        process.exit(1);
    }
    const signer = sdk_wallet_1.UserSigner.fromPem(pemContent);
    const senderAddress = new sdk_core_1.Address(signer.getAddress().bech32());
    // 2. Load Config
    const configPath = path.resolve('config.json');
    const config = JSON.parse(await fs_1.promises.readFile(configPath, 'utf8'));
    console.log(`Updating Agent: ${config.agentName}`);
    // 3. Validate agent nonce
    const registryAddress = process.env.IDENTITY_REGISTRY_ADDRESS || config_1.CONFIG.ADDRESSES.IDENTITY_REGISTRY;
    if (!registryAddress) {
        console.error('❌ IDENTITY_REGISTRY_ADDRESS not set');
        process.exit(1);
    }
    if (!config.nonce || config.nonce === 0) {
        console.error('❌ Agent nonce not found in config.json. Register first.');
        process.exit(1);
    }
    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    // 4. Load ABI and build transaction using SmartContractTransactionsFactory
    const abiPath = path.resolve(__dirname, '..', 'identity-registry.abi.json');
    const rawAbiStr = (await fs_1.promises.readFile(abiPath, 'utf8'))
        .replace(/"TokenId"/g, '"TokenIdentifier"')
        .replace(/"NonZeroBigUint"/g, '"BigUint"');
    const abiJson = JSON.parse(rawAbiStr);
    const abi = sdk_core_1.Abi.create(abiJson);
    const factoryConfig = new sdk_core_1.TransactionsFactoryConfig({
        chainID: process.env.MULTIVERSX_CHAIN_ID || config_1.CONFIG.CHAIN_ID,
    });
    const factory = new sdk_core_1.SmartContractTransactionsFactory({
        config: factoryConfig,
        abi,
    });
    // 5. Prepare arguments matching ABI: update_agent(new_name, new_uri, new_public_key, metadata?, services?)
    const newUri = config.manifestUri || `https://agent.molt.bot/${config.agentName}`;
    const publicKeyHex = senderAddress.toHex();
    // Build metadata entries
    const metadataType = new sdk_core_1.StructType('MetadataEntry', [
        new sdk_core_1.FieldDefinition('key', '', new sdk_core_1.BytesType()),
        new sdk_core_1.FieldDefinition('value', '', new sdk_core_1.BytesType()),
    ]);
    const metadataTyped = (config.metadata || []).map(m => new sdk_core_1.Struct(metadataType, [
        new sdk_core_1.Field(new sdk_core_1.BytesValue(Buffer.from(m.key)), 'key'),
        new sdk_core_1.Field(new sdk_core_1.BytesValue(m.value.startsWith('0x')
            ? Buffer.from(m.value.substring(2), 'hex')
            : Buffer.from(m.value)), 'value'),
    ]));
    console.log(`Agent Nonce: ${config.nonce}`);
    console.log(`New Name: ${config.agentName}`);
    console.log(`New URI: ${newUri}`);
    console.log(`Public Key: ${publicKeyHex.substring(0, 16)}...`);
    if (config.metadata?.length > 0)
        console.log(`Metadata: ${config.metadata.length} entries`);
    // 6. Get the agent token ID from the registry (vmQuery)
    let tokenId = '';
    try {
        const queryResponse = await provider.queryContract({
            address: { bech32: () => registryAddress },
            func: 'get_agent_token_id',
            getEncodedArguments: () => [],
        });
        // Token ID is returned as a hex-encoded string
        const hexTokenId = Buffer.from(queryResponse.getReturnDataParts()[0]).toString('utf8');
        tokenId = hexTokenId;
        console.log(`Agent Token ID: ${tokenId}`);
    }
    catch (e) {
        console.error('❌ Failed to query agent token ID:', e.message);
        process.exit(1);
    }
    const scArgs = [
        Buffer.from(config.agentName), // new_name
        Buffer.from(newUri), // new_uri
        Buffer.from(publicKeyHex, 'hex'), // new_public_key
        sdk_core_1.VariadicValue.fromItemsCounted(...metadataTyped), // metadata
        sdk_core_1.VariadicValue.fromItemsCounted(), // services (empty)
    ];
    const tx = await factory.createTransactionForExecute(senderAddress, {
        contract: new sdk_core_1.Address(registryAddress),
        function: 'update_agent',
        arguments: scArgs,
        gasLimit: BigInt(config_1.CONFIG.GAS_LIMITS.REGISTER),
        tokenTransfers: [
            new sdk_core_1.TokenTransfer({
                token: new sdk_core_1.Token({ identifier: tokenId, nonce: BigInt(config.nonce) }),
                amount: 1n,
            }),
        ],
    });
    tx.nonce = BigInt(account.nonce);
    // 7. Sign
    const serialized = txComputer.computeBytesForSigning(tx);
    const signature = await signer.sign(serialized);
    tx.signature = signature;
    console.log('Transaction Signed. Broadcasting...');
    // 8. Broadcast
    try {
        const txHash = await provider.sendTransaction(tx);
        console.log(`✅ Update Transaction Sent: ${txHash}`);
        console.log(`Check Explorer: ${config_1.CONFIG.EXPLORER_URL}/transactions/${txHash}`);
    }
    catch (e) {
        console.error('Failed to broadcast update:', e.message);
    }
}
main().catch(console.error);
//# sourceMappingURL=update_manifest.js.map