import * as dotenv from "dotenv";
import * as path from "path";

// Load .env from root
dotenv.config({ path: path.resolve(__dirname, "../.env") });

export const CONFIG = {
    // Network
    CHAIN_ID: process.env.MULTIVERSX_CHAIN_ID || "D",
    API_URL: process.env.MULTIVERSX_API_URL || "https://devnet-api.multiversx.com",
    EXPLORER_URL: process.env.MULTIVERSX_EXPLORER_URL || "https://devnet-explorer.multiversx.com",

    // Addresses
    ADDRESSES: {
        IDENTITY_REGISTRY: process.env.IDENTITY_REGISTRY_ADDRESS || "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu",
        VALIDATION_REGISTRY: process.env.VALIDATION_REGISTRY_ADDRESS || "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu"
    },

    // External Services
    PROVIDERS: {
        MCP_URL: process.env.MULTIVERSX_MCP_URL || "http://localhost:3000",
        FACILITATOR_URL: process.env.X402_FACILITATOR_URL || "http://localhost:4000",
        RELAYER_URL: process.env.MULTIVERSX_RELAYER_URL || "http://localhost:3001"
    },

    // Transaction Settings
    GAS_LIMITS: {
        REGISTER: 10_000_000n,
        UPDATE: 10_000_000n,
        SUBMIT_PROOF: 10_000_000n
    },

    // Security Logic
    SECURITY: {
        // Default allowed domains for fetching job payloads
        ALLOWED_DOMAINS: (process.env.ALLOWED_DOMAINS || "example.com,jsonplaceholder.typicode.com").split(",").map(d => d.trim())
    },

    // Timeouts
    REQUEST_TIMEOUT: parseInt(process.env.REQUEST_TIMEOUT || "10000", 10),

    // Retry Strategy
    RETRY: {
        MAX_ATTEMPTS: parseInt(process.env.RETRY_MAX_ATTEMPTS || "5", 10),
        SUBMISSION_DELAY: parseInt(process.env.RETRY_SUBMISSION_DELAY || "10000", 10), // Wait 10s before retrying check
        CHECK_INTERVAL: parseInt(process.env.RETRY_CHECK_INTERVAL || "2000", 10)
    }
};
