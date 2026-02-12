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
exports.deposit = deposit;
exports.release = release;
exports.refund = refund;
exports.getEscrow = getEscrow;
/**
 * Escrow Skills — deposit, release, refund, query escrow state
 *
 * Uses SDK v15 patterns with the Escrow ABI.
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
const escrowAbiJson = __importStar(require("../abis/escrow.abi.json"));
const logger = new logger_1.Logger('EscrowSkills');
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
// ─── deposit ───────────────────────────────────────────────────────────────────
async function deposit(params) {
    logger.info(`Depositing ${params.amount} for job ${params.jobId}`);
    const { signer, senderAddress, provider } = await loadSignerAndProvider();
    const entrypoint = (0, entrypoint_1.createEntrypoint)();
    const abi = (0, abi_1.createPatchedAbi)(escrowAbiJson);
    const factory = entrypoint.createSmartContractTransactionsFactory(abi);
    const escrowContract = sdk_core_1.Address.newFromBech32(config_1.CONFIG.ADDRESSES.ESCROW_CONTRACT);
    const receiver = sdk_core_1.Address.newFromBech32(params.receiverAddress);
    const tx = await factory.createTransactionForExecute(senderAddress, {
        contract: escrowContract,
        function: 'deposit',
        gasLimit: 15000000n,
        arguments: [
            Buffer.from(params.jobId),
            receiver,
            Buffer.from(params.poaHash, 'hex'),
            BigInt(params.deadlineTimestamp),
        ],
        nativeTransferAmount: params.token ? 0n : params.amount,
    });
    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    tx.nonce = BigInt(account.nonce);
    const computer = new sdk_core_1.TransactionComputer();
    tx.signature = await signer.sign(computer.computeBytesForSigning(tx));
    const txHash = await provider.sendTransaction(tx);
    logger.info(`Deposit tx: ${txHash}`);
    return txHash;
}
// ─── release ───────────────────────────────────────────────────────────────────
async function release(jobId) {
    logger.info(`Releasing escrow for job ${jobId}`);
    const { signer, senderAddress, provider } = await loadSignerAndProvider();
    const entrypoint = (0, entrypoint_1.createEntrypoint)();
    const abi = (0, abi_1.createPatchedAbi)(escrowAbiJson);
    const factory = entrypoint.createSmartContractTransactionsFactory(abi);
    const escrowContract = sdk_core_1.Address.newFromBech32(config_1.CONFIG.ADDRESSES.ESCROW_CONTRACT);
    const tx = await factory.createTransactionForExecute(senderAddress, {
        contract: escrowContract,
        function: 'release',
        gasLimit: 10000000n,
        arguments: [Buffer.from(jobId)],
    });
    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    tx.nonce = BigInt(account.nonce);
    const computer = new sdk_core_1.TransactionComputer();
    tx.signature = await signer.sign(computer.computeBytesForSigning(tx));
    const txHash = await provider.sendTransaction(tx);
    logger.info(`Release tx: ${txHash}`);
    return txHash;
}
// ─── refund ────────────────────────────────────────────────────────────────────
async function refund(jobId) {
    logger.info(`Refunding escrow for job ${jobId}`);
    const { signer, senderAddress, provider } = await loadSignerAndProvider();
    const entrypoint = (0, entrypoint_1.createEntrypoint)();
    const abi = (0, abi_1.createPatchedAbi)(escrowAbiJson);
    const factory = entrypoint.createSmartContractTransactionsFactory(abi);
    const escrowContract = sdk_core_1.Address.newFromBech32(config_1.CONFIG.ADDRESSES.ESCROW_CONTRACT);
    const tx = await factory.createTransactionForExecute(senderAddress, {
        contract: escrowContract,
        function: 'refund',
        gasLimit: 10000000n,
        arguments: [Buffer.from(jobId)],
    });
    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    tx.nonce = BigInt(account.nonce);
    const computer = new sdk_core_1.TransactionComputer();
    tx.signature = await signer.sign(computer.computeBytesForSigning(tx));
    const txHash = await provider.sendTransaction(tx);
    logger.info(`Refund tx: ${txHash}`);
    return txHash;
}
// ─── get_escrow ────────────────────────────────────────────────────────────────
async function getEscrow(jobId) {
    const entrypoint = (0, entrypoint_1.createEntrypoint)();
    const abi = (0, abi_1.createPatchedAbi)(escrowAbiJson);
    const controller = entrypoint.createSmartContractController(abi);
    const escrowContract = sdk_core_1.Address.newFromBech32(config_1.CONFIG.ADDRESSES.ESCROW_CONTRACT);
    try {
        const results = await controller.query({
            contract: escrowContract,
            function: 'get_escrow',
            arguments: [Buffer.from(jobId)],
        });
        if (!results[0])
            return null;
        return results[0];
    }
    catch {
        logger.warn(`Failed to get escrow for ${jobId}`);
        return null;
    }
}
//# sourceMappingURL=escrow_skills.js.map