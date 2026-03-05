"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSigner = getSigner;
exports.getRelayerAddress = getRelayerAddress;
exports.relayTransaction = relayTransaction;
const sdk_wallet_1 = require("@multiversx/sdk-wallet");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("../config");
const RelayerAddressCache_1 = require("./RelayerAddressCache");
/**
 * Resolves a PEM path and returns a UserSigner.
 * Priority: customPath, then env variables, then default wallet.pem.
 */
function getSigner(customPath) {
    const p = customPath ||
        process.env.AGENT_PEM_PATH ||
        process.env.BOT_PEM_PATH ||
        process.env.MULTIVERSX_PRIVATE_KEY ||
        'wallet.pem';
    const resolvedPath = path_1.default.isAbsolute(p) ? p : path_1.default.resolve(process.cwd(), p);
    if (!fs_1.default.existsSync(resolvedPath)) {
        throw new Error(`Signer PEM not found at: ${resolvedPath}`);
    }
    return sdk_wallet_1.UserSigner.fromPem(fs_1.default.readFileSync(resolvedPath, 'utf8'));
}
/**
 * Fetches the specific relayer address for a sender's shard, with caching.
 */
async function getRelayerAddress(sender) {
    const relayerBase = config_1.CONFIG.PROVIDERS.RELAYER_URL;
    const cached = RelayerAddressCache_1.RelayerAddressCache.get(relayerBase, sender.toBech32());
    if (cached)
        return cached;
    const url = `${relayerBase.replace(/\/$/, '')}/relayer/address/${sender.toBech32()}`;
    const response = await fetch(url);
    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Relayer address fetch failed: ${response.status} ${text}`);
    }
    const { relayerAddress } = (await response.json());
    RelayerAddressCache_1.RelayerAddressCache.set(relayerBase, sender.toBech32(), relayerAddress);
    return relayerAddress;
}
/**
 * Standard relay function.
 */
async function relayTransaction(txPlain) {
    const relayerBase = config_1.CONFIG.PROVIDERS.RELAYER_URL;
    const url = `${relayerBase.replace(/\/$/, '')}/relay`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transaction: txPlain }),
    });
    const result = (await response.json());
    if (result.txHash) {
        return result.txHash;
    }
    throw new Error(result.error || JSON.stringify(result));
}
//# sourceMappingURL=txUtils.js.map