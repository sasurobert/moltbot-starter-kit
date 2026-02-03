import * as dotenv from "dotenv";
import { Facilitator } from "./facilitator";
import { McpBridge } from "./mcp_bridge";
import { Validator } from "./validator";
import { promises as fs } from "fs";

dotenv.config();

async function main() {
    console.log("Starting Moltbot...");

    // Load Config
    const config = JSON.parse(await fs.readFile("config.json", "utf8"));
    console.log(`Loaded Agent: ${config.agentName} (ID: ${config.nonce})`);

    // Initialize Bridges
    const mcp = new McpBridge(process.env.MULTIVERSX_MCP_URL || "http://localhost:3000");
    const validator = new Validator();
    const facilitator = new Facilitator();

    // Start Listener
    facilitator.onPayment(async (payment) => {
        console.log(`[Job] Payment Received! Amount: ${payment.amount}`);

        // 1. Process Job (Simulated)
        console.log("Processing job...");
        await new Promise(r => setTimeout(r, 2000));

        // 2. Proof
        const resultHash = "a1b2c3d4e5f67890"; // Dummy hash
        const txHash = await validator.submitProof("job-123", resultHash);
        console.log(`[Job] Proof submitted. Tx: ${txHash}`);
    });

    await facilitator.start();
    console.log("Listening for x402 payments...");
}

main().catch(console.error);
