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
exports.initJob = initJob;
exports.submitProof = submitProof;
exports.isJobVerified = isJobVerified;
exports.getJobData = getJobData;
/**
 * Validation Skills — job lifecycle on the Validation Registry
 *
 * Uses SDK v15 patterns matching validator.ts:
 * createEntrypoint() → factory/controller → ABI-typed arguments.
 */
const sdk_core_1 = require("@multiversx/sdk-core");
const sdk_network_providers_1 = require("@multiversx/sdk-network-providers");
const sdk_wallet_1 = require("@multiversx/sdk-wallet");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const entrypoint_1 = require("../utils/entrypoint");
const abi_1 = require("../utils/abi");
const validationAbiJson = __importStar(require("../abis/validation-registry.abi.json"));
const logger = new logger_1.Logger('ValidationSkills');
// ─── Helpers ───────────────────────────────────────────────────────────────────
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
// ─── init_job ──────────────────────────────────────────────────────────────────
async function initJob(params) {
    logger.info(`Initializing job: ${params.jobId} for agent #${params.agentNonce}`);
    const { signer, senderAddress, provider } = await loadSignerAndProvider();
    const entrypoint = (0, entrypoint_1.createEntrypoint)();
    const abi = (0, abi_1.createPatchedAbi)(validationAbiJson);
    const factory = entrypoint.createSmartContractTransactionsFactory(abi);
    const registry = sdk_core_1.Address.newFromBech32(config_1.CONFIG.ADDRESSES.VALIDATION_REGISTRY);
    const args = [
        Buffer.from(params.jobId),
        BigInt(params.agentNonce),
    ];
    if (params.serviceId !== undefined) {
        args.push(params.serviceId);
    }
    const tx = await factory.createTransactionForExecute(senderAddress, {
        contract: registry,
        function: 'init_job',
        gasLimit: config_1.CONFIG.GAS_LIMITS.SUBMIT_PROOF,
        arguments: args,
        nativeTransferAmount: params.paymentAmount ?? 0n,
    });
    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    tx.nonce = BigInt(account.nonce);
    const computer = new sdk_core_1.TransactionComputer();
    tx.signature = await signer.sign(computer.computeBytesForSigning(tx));
    const txHash = await provider.sendTransaction(tx);
    logger.info(`init_job tx: ${txHash}`);
    return txHash;
}
// ─── submit_proof ──────────────────────────────────────────────────────────────
// NOTE: This follows the exact pattern from Validator.submitProof() in validator.ts
async function submitProof(params) {
    logger.info(`Submitting proof for ${params.jobId}: hash=${params.proofHash}`);
    const { signer, senderAddress, provider } = await loadSignerAndProvider();
    const entrypoint = (0, entrypoint_1.createEntrypoint)();
    const abi = (0, abi_1.createPatchedAbi)(validationAbiJson);
    const factory = entrypoint.createSmartContractTransactionsFactory(abi);
    const registry = sdk_core_1.Address.newFromBech32(config_1.CONFIG.ADDRESSES.VALIDATION_REGISTRY);
    const tx = await factory.createTransactionForExecute(senderAddress, {
        contract: registry,
        function: 'submit_proof',
        gasLimit: config_1.CONFIG.GAS_LIMITS.SUBMIT_PROOF,
        arguments: [Buffer.from(params.jobId), Buffer.from(params.proofHash, 'hex')],
    });
    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    tx.nonce = BigInt(account.nonce);
    // Relayer V3
    if (params.useRelayer) {
        const relayerAddr = process.env.MULTIVERSX_RELAYER_ADDRESS;
        if (relayerAddr) {
            tx.relayer = sdk_core_1.Address.newFromBech32(relayerAddr);
            tx.version = 2;
            tx.gasLimit = BigInt(tx.gasLimit.toString()) + config_1.CONFIG.RELAYER_GAS_OVERHEAD;
        }
    }
    const computer = new sdk_core_1.TransactionComputer();
    tx.signature = await signer.sign(computer.computeBytesForSigning(tx));
    const txHash = await provider.sendTransaction(tx);
    logger.info(`submit_proof tx: ${txHash}`);
    return txHash;
}
// ─── is_job_verified ───────────────────────────────────────────────────────────
// Follows same pattern as hiring.ts::waitForJobVerification
async function isJobVerified(jobId) {
    const entrypoint = (0, entrypoint_1.createEntrypoint)();
    const abi = (0, abi_1.createPatchedAbi)(validationAbiJson);
    const controller = entrypoint.createSmartContractController(abi);
    const registry = sdk_core_1.Address.newFromBech32(config_1.CONFIG.ADDRESSES.VALIDATION_REGISTRY);
    try {
        const results = await controller.query({
            contract: registry,
            function: 'is_job_verified',
            arguments: [Buffer.from(jobId)],
        });
        return results[0] === true;
    }
    catch {
        return false;
    }
}
// ─── get_job_data ──────────────────────────────────────────────────────────────
async function getJobData(jobId) {
    const entrypoint = (0, entrypoint_1.createEntrypoint)();
    const abi = (0, abi_1.createPatchedAbi)(validationAbiJson);
    const controller = entrypoint.createSmartContractController(abi);
    const registry = sdk_core_1.Address.newFromBech32(config_1.CONFIG.ADDRESSES.VALIDATION_REGISTRY);
    try {
        const results = await controller.query({
            contract: registry,
            function: 'get_job_data',
            arguments: [Buffer.from(jobId)],
        });
        if (!results[0])
            return null;
        return results[0];
    }
    catch {
        logger.warn(`Failed to get job data for ${jobId}`);
        return null;
    }
}
//# sourceMappingURL=validation_skills.js.map