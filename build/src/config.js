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
exports.CONFIG = void 0;
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
// Load .env from root
dotenv.config({ path: path.resolve(__dirname, '../.env') });
exports.CONFIG = {
    // Network
    CHAIN_ID: process.env.MULTIVERSX_CHAIN_ID || 'D',
    API_URL: process.env.MULTIVERSX_API_URL || 'https://devnet-api.multiversx.com',
    EXPLORER_URL: process.env.MULTIVERSX_EXPLORER_URL ||
        'https://devnet-explorer.multiversx.com',
    // Addresses
    ADDRESSES: {
        IDENTITY_REGISTRY: process.env.IDENTITY_REGISTRY_ADDRESS ||
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
        VALIDATION_REGISTRY: process.env.VALIDATION_REGISTRY_ADDRESS ||
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
        REPUTATION_REGISTRY: process.env.REPUTATION_REGISTRY_ADDRESS ||
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
        ESCROW_CONTRACT: process.env.ESCROW_CONTRACT_ADDRESS ||
            'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
    },
    // External Services
    PROVIDERS: {
        MCP_URL: process.env.MULTIVERSX_MCP_URL || 'http://localhost:3000',
        FACILITATOR_URL: process.env.X402_FACILITATOR_URL || 'http://localhost:4000',
        RELAYER_URL: process.env.MULTIVERSX_RELAYER_URL || 'http://localhost:3001',
    },
    // Transaction Settings
    GAS_LIMITS: {
        REGISTER: 10000000n,
        UPDATE: 10000000n,
        SUBMIT_PROOF: 10000000n,
        REGISTER_AGENT: BigInt(process.env.GAS_LIMIT_REGISTER_AGENT || '6000000'),
    },
    // Relayer Settings
    RELAYER_GAS_OVERHEAD: BigInt(process.env.RELAYER_GAS_OVERHEAD || '50000'),
    // Agent Identity (used during auto-registration)
    AGENT: {
        NAME: process.env.AGENT_NAME || 'moltbot',
        URI: process.env.AGENT_URI || 'https://moltbot.io',
    },
    // Security Logic
    SECURITY: {
        // Default allowed domains for fetching job payloads
        ALLOWED_DOMAINS: (process.env.ALLOWED_DOMAINS || 'example.com,jsonplaceholder.typicode.com')
            .split(',')
            .map(d => d.trim()),
    },
    // Timeouts
    REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT || '10000', 10),
    // Retry Strategy
    RETRY: {
        MAX_ATTEMPTS: parseInt(process.env.RETRY_MAX_ATTEMPTS || '5', 10),
        SUBMISSION_DELAY: parseInt(process.env.RETRY_SUBMISSION_DELAY || '10000', 10), // Wait 10s before retrying check
        CHECK_INTERVAL: parseInt(process.env.RETRY_CHECK_INTERVAL || '2000', 10),
    },
    // Employer Settings (acting as hirer)
    EMPLOYER: {
        PEM_PATH: process.env.EMPLOYER_PEM_PATH || '',
        ADDRESS: process.env.EMPLOYER_ADDRESS || '',
    },
};
//# sourceMappingURL=config.js.map