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
exports.submitFeedback = submitFeedback;
exports.getReputation = getReputation;
/**
 * Reputation Skills — feedback and reputation queries
 *
 * Uses SDK v15 patterns matching hiring.ts::submitReputation.
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
const reputationAbiJson = __importStar(require("../abis/reputation-registry.abi.json"));
const logger = new logger_1.Logger('ReputationSkills');
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
// ─── submit_feedback ───────────────────────────────────────────────────────────
// Mirrors hiring.ts::submitReputation exactly
async function submitFeedback(params) {
    logger.info(`Submitting feedback for job ${params.jobId}: rating=${params.rating}`);
    const { signer, senderAddress, provider } = await loadSignerAndProvider();
    const entrypoint = (0, entrypoint_1.createEntrypoint)();
    const abi = (0, abi_1.createPatchedAbi)(reputationAbiJson);
    const factory = entrypoint.createSmartContractTransactionsFactory(abi);
    const registry = sdk_core_1.Address.newFromBech32(config_1.CONFIG.ADDRESSES.REPUTATION_REGISTRY);
    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    const tx = await factory.createTransactionForExecute(senderAddress, {
        contract: registry,
        function: 'giveFeedbackSimple',
        arguments: [
            Buffer.from(params.jobId),
            BigInt(params.agentNonce),
            BigInt(params.rating),
        ],
        gasLimit: 10000000n,
    });
    tx.nonce = BigInt(account.nonce);
    const computer = new sdk_core_1.TransactionComputer();
    tx.signature = await signer.sign(computer.computeBytesForSigning(tx));
    const txHash = await provider.sendTransaction(tx);
    logger.info(`Feedback tx: ${txHash}`);
    return txHash;
}
// ─── get_reputation ────────────────────────────────────────────────────────────
async function getReputation(agentNonce) {
    const entrypoint = (0, entrypoint_1.createEntrypoint)();
    const abi = (0, abi_1.createPatchedAbi)(reputationAbiJson);
    const controller = entrypoint.createSmartContractController(abi);
    const registry = sdk_core_1.Address.newFromBech32(config_1.CONFIG.ADDRESSES.REPUTATION_REGISTRY);
    try {
        const scoreResults = await controller.query({
            contract: registry,
            function: 'get_reputation_score',
            arguments: [BigInt(agentNonce)],
        });
        const feedbackResults = await controller.query({
            contract: registry,
            function: 'get_total_feedbacks',
            arguments: [BigInt(agentNonce)],
        });
        return {
            score: BigInt(scoreResults[0]?.toString() ?? '0'),
            totalFeedbacks: BigInt(feedbackResults[0]?.toString() ?? '0'),
        };
    }
    catch (error) {
        logger.warn(`Failed to get reputation for agent ${agentNonce}: ${error.message}`);
        return { score: 0n, totalFeedbacks: 0n };
    }
}
//# sourceMappingURL=reputation_skills.js.map