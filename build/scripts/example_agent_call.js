"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discovery_1 = require("../src/discovery");
const logger_1 = require("../src/utils/logger");
// Example script demonstrating how an agent (like Moltbot)
// would discover another agent's payment requirements, negotiate a session,
// and make a tool call.
async function main() {
    const logger = new logger_1.Logger('ExampleCall');
    const agentUrl = process.env.TARGET_AGENT_URL || 'http://localhost:3000';
    logger.info(`Starting interaction with target agent at ${agentUrl}`);
    const discovery = new discovery_1.AgentDiscovery();
    // 1. Discover payment requirements for the 'searchProducts' tool
    // We provide the endpoint path where tool definitions or specific endpoints might reside
    const paymentInfo = await discovery.getPaymentInfo(agentUrl, '/mcp/tools');
    if (!paymentInfo) {
        logger.info('No payment required. Proceeding with free tool call...');
        // Make standard tool call...
        return;
    }
    // 2. Negotiate Session or Charge
    let txHash;
    if (paymentInfo.intent === 'session') {
        logger.info('Session intent detected. Negotiating session...');
        txHash = await discovery.negotiateSession(agentUrl, paymentInfo);
    }
    else {
        logger.info('Charge intent detected. Initiating single payment...');
        // For a real charge, you might use attemptPayment from mpp_skills
        txHash = await discovery.negotiateSession(agentUrl, paymentInfo); // using negotiateSession as a mock here
    }
    // 3. Make the tool call with the proof attached
    logger.info(`Making tool call to ${agentUrl} with proof: ${txHash}`);
    // Simulating an MCP tool call
    const mcpRequest = {
        method: 'tools/call',
        params: {
            name: 'searchProducts',
            arguments: { query: 'laptop' },
            _meta: {
                mpp_payment_proof: txHash,
            },
        },
    };
    logger.info(`Mocking request payload: ${JSON.stringify(mcpRequest, null, 2)}`);
    logger.info('Tool call completed successfully!');
}
main().catch(console.error);
//# sourceMappingURL=example_agent_call.js.map