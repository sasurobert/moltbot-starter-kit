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
exports.AgentDiscovery = exports.Logger = exports.CONFIG = exports.JobHandler = exports.JobProcessor = exports.Validator = exports.McpBridge = exports.Facilitator = void 0;
const dotenv = __importStar(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
const sdk_wallet_1 = require("@multiversx/sdk-wallet");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const facilitator_1 = require("./facilitator");
Object.defineProperty(exports, "Facilitator", { enumerable: true, get: function () { return facilitator_1.Facilitator; } });
const mcp_bridge_1 = require("./mcp_bridge");
Object.defineProperty(exports, "McpBridge", { enumerable: true, get: function () { return mcp_bridge_1.McpBridge; } });
const validator_1 = require("./validator");
Object.defineProperty(exports, "Validator", { enumerable: true, get: function () { return validator_1.Validator; } });
const processor_1 = require("./processor");
Object.defineProperty(exports, "JobProcessor", { enumerable: true, get: function () { return processor_1.JobProcessor; } });
const job_handler_1 = require("./job_handler");
Object.defineProperty(exports, "JobHandler", { enumerable: true, get: function () { return job_handler_1.JobHandler; } });
const config_1 = require("./config");
Object.defineProperty(exports, "CONFIG", { enumerable: true, get: function () { return config_1.CONFIG; } });
const logger_1 = require("./utils/logger");
Object.defineProperty(exports, "Logger", { enumerable: true, get: function () { return logger_1.Logger; } });
const discovery_1 = require("./discovery");
Object.defineProperty(exports, "AgentDiscovery", { enumerable: true, get: function () { return discovery_1.AgentDiscovery; } });
const logger = new logger_1.Logger('Main');
dotenv.config();
async function main() {
    logger.info('Starting Moltbot...');
    // Load Config
    try {
        const configPath = path.resolve('agent.config.json');
        const config = JSON.parse(await fs_1.promises.readFile(configPath, 'utf8'));
        logger.info(`Loaded Agent: ${config.agentName} (ID: ${config.nonce})`);
    }
    catch {
        logger.warn('agent.config.json not found. See agent.config.example.json.');
    }
    // Initialize Bridges
    new mcp_bridge_1.McpBridge(config_1.CONFIG.PROVIDERS.MCP_URL);
    const validator = new validator_1.Validator();
    const facilitator = new facilitator_1.Facilitator();
    const processor = new processor_1.JobProcessor();
    const handler = new job_handler_1.JobHandler(validator, processor);
    // 0. Fetch Relayer Address (Dynamic Shard Awareness)
    try {
        const walletPath = process.env.MULTIVERSX_PRIVATE_KEY || path.resolve('wallet.pem');
        const walletContent = await fs_1.promises.readFile(walletPath, 'utf8');
        const signer = sdk_wallet_1.UserSigner.fromPem(walletContent);
        const myAddress = signer.getAddress().bech32();
        logger.info(`Fetching Relayer Address for ${myAddress} from ${config_1.CONFIG.PROVIDERS.RELAYER_URL}...`);
        const relayerResp = await axios_1.default.get(`${config_1.CONFIG.PROVIDERS.RELAYER_URL}/relayer/address/${myAddress}`, { timeout: config_1.CONFIG.REQUEST_TIMEOUT });
        const relayerAddress = relayerResp.data?.relayerAddress;
        if (relayerAddress) {
            logger.info(`Using Relayer: ${relayerAddress}`);
            validator.setRelayerConfig(config_1.CONFIG.PROVIDERS.RELAYER_URL, relayerAddress);
        }
        else {
            logger.warn('No relayer address returned, falling back to direct transactions.');
        }
    }
    catch (e) {
        logger.warn(`Failed to init relayer: ${e.message}. Using direct transactions.`);
    }
    // Start Listener
    facilitator.onPayment(async (payment) => {
        logger.info(`[Job] Payment Received! Amount: ${payment.amount} ${payment.token}`);
        const jobId = payment.meta?.jobId || `job-${Date.now()}`;
        // Fire-and-Forget Handler
        void handler.handle(jobId, payment);
    });
    await facilitator.start();
    logger.info('Listening for x402 payments...');
}
main().catch(err => logger.error('Fatal error in main loop', err));
//# sourceMappingURL=index.js.map