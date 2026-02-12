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
exports.transfer = transfer;
exports.multiTransfer = multiTransfer;
/**
 * Transfer Skills — EGLD, ESDT, NFT, MultiESDTNFTTransfer
 *
 * Uses SDK v15 TransfersTransactionsFactory — no custom ABI needed.
 */
const sdk_core_1 = require("@multiversx/sdk-core");
const sdk_network_providers_1 = require("@multiversx/sdk-network-providers");
const sdk_wallet_1 = require("@multiversx/sdk-wallet");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const entrypoint_1 = require("../utils/entrypoint");
const logger = new logger_1.Logger('TransferSkills');
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
// ─── transfer (single token) ───────────────────────────────────────────────────
async function transfer(params) {
    logger.info(`Transferring ${params.amount} ${params.token || 'EGLD'} → ${params.receiver}`);
    const { signer, senderAddress, provider } = await loadSignerAndProvider();
    const entrypoint = (0, entrypoint_1.createEntrypoint)();
    const factory = entrypoint.createTransfersTransactionsFactory();
    const receiver = sdk_core_1.Address.newFromBech32(params.receiver);
    let tx;
    if (!params.token) {
        // EGLD transfer
        tx = await factory.createTransactionForNativeTokenTransfer(senderAddress, {
            receiver,
            nativeAmount: params.amount,
        });
    }
    else {
        // ESDT / NFT / SFT transfer
        const tokenTransfer = new sdk_core_1.TokenTransfer({
            token: new sdk_core_1.Token({
                identifier: params.token,
                nonce: BigInt(params.tokenNonce ?? 0),
            }),
            amount: params.amount,
        });
        tx = await factory.createTransactionForESDTTokenTransfer(senderAddress, {
            receiver,
            tokenTransfers: [tokenTransfer],
        });
    }
    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    tx.nonce = BigInt(account.nonce);
    const computer = new sdk_core_1.TransactionComputer();
    tx.signature = await signer.sign(computer.computeBytesForSigning(tx));
    const txHash = await provider.sendTransaction(tx);
    logger.info(`Transfer tx: ${txHash}`);
    return txHash;
}
// ─── multiTransfer ─────────────────────────────────────────────────────────────
async function multiTransfer(params) {
    logger.info(`Multi-transfer: ${params.transfers.length} tokens → ${params.receiver}`);
    const { signer, senderAddress, provider } = await loadSignerAndProvider();
    const entrypoint = (0, entrypoint_1.createEntrypoint)();
    const factory = entrypoint.createTransfersTransactionsFactory();
    const receiver = sdk_core_1.Address.newFromBech32(params.receiver);
    const tokenTransfers = params.transfers.map(item => new sdk_core_1.TokenTransfer({
        token: new sdk_core_1.Token({
            identifier: item.token,
            nonce: BigInt(item.nonce),
        }),
        amount: item.amount,
    }));
    const tx = await factory.createTransactionForESDTTokenTransfer(senderAddress, {
        receiver,
        tokenTransfers,
    });
    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });
    tx.nonce = BigInt(account.nonce);
    const computer = new sdk_core_1.TransactionComputer();
    tx.signature = await signer.sign(computer.computeBytesForSigning(tx));
    const txHash = await provider.sendTransaction(tx);
    logger.info(`Multi-transfer tx: ${txHash}`);
    return txHash;
}
//# sourceMappingURL=transfer_skills.js.map