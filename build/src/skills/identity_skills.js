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
exports.registerAgent = registerAgent;
exports.getAgent = getAgent;
exports.setMetadata = setMetadata;
/**
 * Identity Skills — register, update, query agent identity on the Identity Registry
 *
 * Uses SDK v15 patterns: createEntrypoint() → factory/controller → ABI-typed arguments.
 * Follows validators.ts and hiring.ts established patterns.
 */
const sdk_core_1 = require("@multiversx/sdk-core");
const sdk_network_providers_1 = require("@multiversx/sdk-network-providers");
const sdk_wallet_1 = require("@multiversx/sdk-wallet");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const entrypoint_1 = require("../utils/entrypoint");
const abi_1 = require("../utils/abi");
const identityAbiJson = __importStar(require("../abis/identity-registry.abi.json"));
const logger = new logger_1.Logger('IdentitySkills');
// ─── Internals ─────────────────────────────────────────────────────────────────
async function loadSignerAndProvider() {
    const pemPath = process.env.MULTIVERSX_PRIVATE_KEY || path.resolve('wallet.pem');
    const pemContent = await fs_1.promises.readFile(pemPath, 'utf8');
    const signer = sdk_wallet_1.UserSigner.fromPem(pemContent);
    const senderAddress = new sdk_core_1.Address(signer.getAddress().bech32());
    const provider = new sdk_network_providers_1.ApiNetworkProvider(config_1.CONFIG.API_URL, {
        clientName: 'moltbot-skills',
        timeout: config_1.CONFIG.REQUEST_TIMEOUT,
    });
    return { signer, senderAddress, provider };
}
// ─── register_agent ────────────────────────────────────────────────────────────
async function registerAgent(params) {
    logger.info(`Registering agent: ${params.name}`);
    const { signer, senderAddress, provider } = await loadSignerAndProvider();
    const entrypoint = (0, entrypoint_1.createEntrypoint)();
    const abi = (0, abi_1.createPatchedAbi)(identityAbiJson);
    const factory = entrypoint.createSmartContractTransactionsFactory(abi);
    const registry = sdk_core_1.Address.newFromBech32(config_1.CONFIG.ADDRESSES.IDENTITY_REGISTRY);
    const tx = await factory.createTransactionForExecute(senderAddress, {
        contract: registry,
        function: 'register_agent',
        gasLimit: config_1.CONFIG.GAS_LIMITS.REGISTER,
        arguments: [
            Buffer.from(params.name),
            Buffer.from(params.uri),
            Buffer.from(senderAddress.getPublicKey()),
            sdk_core_1.VariadicValue.fromItemsCounted(), // metadata (empty for now)
            sdk_core_1.VariadicValue.fromItemsCounted(), // services (empty for now)
        ],
    });
    // Nonce
    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    tx.nonce = BigInt(account.nonce);
    // Relayer V3
    if (params.useRelayer) {
        const relayerAddr = await discoverRelayerAddress(senderAddress);
        if (relayerAddr) {
            tx.relayer = relayerAddr;
            tx.version = 2;
            tx.gasLimit = BigInt(tx.gasLimit.toString()) + config_1.CONFIG.RELAYER_GAS_OVERHEAD;
        }
    }
    // Sign & Send
    const computer = new sdk_core_1.TransactionComputer();
    tx.signature = await signer.sign(computer.computeBytesForSigning(tx));
    const txHash = await provider.sendTransaction(tx);
    logger.info(`Registration tx: ${txHash}`);
    return txHash;
}
// ─── get_agent ─────────────────────────────────────────────────────────────────
async function getAgent(agentNonce) {
    const entrypoint = (0, entrypoint_1.createEntrypoint)();
    const abi = (0, abi_1.createPatchedAbi)(identityAbiJson);
    const controller = entrypoint.createSmartContractController(abi);
    const registry = sdk_core_1.Address.newFromBech32(config_1.CONFIG.ADDRESSES.IDENTITY_REGISTRY);
    try {
        const results = await controller.query({
            contract: registry,
            function: 'get_agent',
            arguments: [agentNonce],
        });
        if (!results[0])
            return null;
        return results[0];
    }
    catch (error) {
        logger.warn(`Failed to get agent ${agentNonce}: ${error.message}`);
        return null;
    }
}
// ─── set_metadata ──────────────────────────────────────────────────────────────
async function setMetadata(params) {
    logger.info(`Setting ${params.entries.length} metadata entries for agent #${params.agentNonce}`);
    const { signer, senderAddress, provider } = await loadSignerAndProvider();
    const entrypoint = (0, entrypoint_1.createEntrypoint)();
    const abi = (0, abi_1.createPatchedAbi)(identityAbiJson);
    const factory = entrypoint.createSmartContractTransactionsFactory(abi);
    const registry = sdk_core_1.Address.newFromBech32(config_1.CONFIG.ADDRESSES.IDENTITY_REGISTRY);
    const tx = await factory.createTransactionForExecute(senderAddress, {
        contract: registry,
        function: 'set_metadata',
        gasLimit: config_1.CONFIG.GAS_LIMITS.UPDATE,
        arguments: [
            BigInt(params.agentNonce),
            sdk_core_1.VariadicValue.fromItemsCounted(), // metadata — TODO: populate from entries
            sdk_core_1.VariadicValue.fromItemsCounted(), // services
        ],
    });
    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    tx.nonce = BigInt(account.nonce);
    const computer = new sdk_core_1.TransactionComputer();
    tx.signature = await signer.sign(computer.computeBytesForSigning(tx));
    const txHash = await provider.sendTransaction(tx);
    logger.info(`Metadata tx: ${txHash}`);
    return txHash;
}
// ─── Relayer Discovery ─────────────────────────────────────────────────────────
async function discoverRelayerAddress(senderAddress) {
    const relayerUrl = config_1.CONFIG.PROVIDERS.RELAYER_URL;
    if (!relayerUrl)
        return null;
    try {
        const resp = await axios_1.default.get(`${relayerUrl}/relayer/address/${senderAddress.toBech32()}`);
        if (resp.data?.relayerAddress) {
            return sdk_core_1.Address.newFromBech32(resp.data.relayerAddress);
        }
        return null;
    }
    catch {
        logger.warn('Could not discover relayer address');
        return null;
    }
}
//# sourceMappingURL=identity_skills.js.map