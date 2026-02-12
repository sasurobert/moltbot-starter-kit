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
exports.discoverAgents = discoverAgents;
exports.getBalance = getBalance;
/**
 * Discovery Skills — agent search and balance queries
 *
 * Uses SDK v15 controller.query for identity lookups + API for balances.
 */
const sdk_core_1 = require("@multiversx/sdk-core");
const sdk_network_providers_1 = require("@multiversx/sdk-network-providers");
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const entrypoint_1 = require("../utils/entrypoint");
const abi_1 = require("../utils/abi");
const identityAbiJson = __importStar(require("../abis/identity-registry.abi.json"));
const logger = new logger_1.Logger('DiscoverySkills');
// ─── discoverAgents ────────────────────────────────────────────────────────────
// Uses BlockchainService pattern (controller.query)
async function discoverAgents(params = {}) {
    const maxResults = params.maxResults ?? 10;
    logger.info(`Discovering up to ${maxResults} agents...`);
    const entrypoint = (0, entrypoint_1.createEntrypoint)();
    const abi = (0, abi_1.createPatchedAbi)(identityAbiJson);
    const controller = entrypoint.createSmartContractController(abi);
    const registry = sdk_core_1.Address.newFromBech32(config_1.CONFIG.ADDRESSES.IDENTITY_REGISTRY);
    const agents = [];
    for (let nonce = 1; nonce <= maxResults; nonce++) {
        try {
            const results = await controller.query({
                contract: registry,
                function: 'get_agent',
                arguments: [nonce],
            });
            if (!results[0])
                break;
            const agent = results[0];
            agents.push({
                nonce,
                name: agent.name,
                uri: agent.uri,
            });
        }
        catch {
            break; // No more agents
        }
    }
    logger.info(`Found ${agents.length} agents`);
    return agents;
}
// ─── getBalance ────────────────────────────────────────────────────────────────
// Uses the public API (not SC queries)
async function getBalance(address) {
    // Default to own wallet address
    let targetAddress = address;
    if (!targetAddress) {
        const { UserSigner } = await Promise.resolve().then(() => __importStar(require('@multiversx/sdk-wallet')));
        const { promises: fs } = await Promise.resolve().then(() => __importStar(require('fs')));
        const pemPath = process.env.MULTIVERSX_PRIVATE_KEY || './wallet.pem';
        const pemContent = await fs.readFile(pemPath, 'utf8');
        const signer = UserSigner.fromPem(pemContent);
        targetAddress = new sdk_core_1.Address(signer.getAddress().bech32()).toBech32();
    }
    const apiUrl = config_1.CONFIG.API_URL;
    // EGLD
    const provider = new sdk_network_providers_1.ApiNetworkProvider(apiUrl, {
        clientName: 'moltbot-skills',
        timeout: config_1.CONFIG.REQUEST_TIMEOUT,
    });
    const account = await provider.getAccount({
        bech32: () => targetAddress,
    });
    // ESDTs
    let tokens = [];
    try {
        const resp = await axios_1.default.get(`${apiUrl}/accounts/${targetAddress}/tokens`, {
            timeout: config_1.CONFIG.REQUEST_TIMEOUT,
        });
        tokens = resp.data || [];
    }
    catch {
        logger.warn('Could not fetch ESDT balances');
    }
    return {
        address: targetAddress,
        egld: account.balance.toString(),
        tokens,
    };
}
//# sourceMappingURL=discovery_skills.js.map