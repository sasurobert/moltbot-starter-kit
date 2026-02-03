import * as dotenv from "dotenv";
import { Facilitator } from "./facilitator";
import { McpBridge } from "./mcp_bridge";
import { Validator } from "./validator";
import { JobProcessor } from "./processor";
import { promises as fs } from "fs";
import * as path from "path";
import { CONFIG } from "./config";

dotenv.config();

async function main() {
    console.log("Starting Moltbot...");

    // Load Config
    try {
        const configPath = path.resolve("config.json");
        const config = JSON.parse(await fs.readFile(configPath, "utf8"));
        console.log(`Loaded Agent: ${config.agentName} (ID: ${config.nonce})`);
    } catch (e) {
        console.warn("Config not found or invalid.");
    }

    // Initialize Bridges
    const mcp = new McpBridge(CONFIG.PROVIDERS.MCP_URL);
    const validator = new Validator();
    const facilitator = new Facilitator();
    const processor = new JobProcessor();

    // Start Listener
    facilitator.onPayment(async (payment) => {
        console.log(`[Job] Payment Received! Amount: ${payment.amount} ${payment.token}`);

        // 1. Process Job
        const jobId = payment.meta?.jobId || `job-${Date.now()}`;
        const payload = payment.meta?.payload || "";
        console.log(`Processing Job ID: ${jobId}`);

        try {
            const resultHash = await processor.process({ payload: payload });
            console.log(`Job Result Hash: ${resultHash}`);

            // 2. Submit Proof
            const txHash = await validator.submitProof(jobId, resultHash);
            console.log(`[Job] Proof submitted. Tx: ${txHash}`);
        } catch (err) {
            console.error(`[Job] Failed to process ${jobId}:`, err);
        }
    });

    await facilitator.start();
    console.log("Listening for x402 payments...");
}

main().catch(console.error);
