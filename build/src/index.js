'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
const dotenv = require('dotenv');
const axios_1 = require('axios');
const sdk_wallet_1 = require('@multiversx/sdk-wallet');
const fs_1 = require('fs');
const path = require('path');
const facilitator_1 = require('./facilitator');
const mcp_bridge_1 = require('./mcp_bridge');
const validator_1 = require('./validator');
const processor_1 = require('./processor');
const job_handler_1 = require('./job_handler');
const config_1 = require('./config');
dotenv.config();
async function main() {
  console.log('Starting Moltbot...');
  // Load Config
  try {
    const configPath = path.resolve('config.json');
    const config = JSON.parse(await fs_1.promises.readFile(configPath, 'utf8'));
    console.log(`Loaded Agent: ${config.agentName} (ID: ${config.nonce})`);
  } catch {
    console.warn('Config not found or invalid.');
  }
  // Initialize Bridges
  new mcp_bridge_1.McpBridge(config_1.CONFIG.PROVIDERS.MCP_URL);
  const validator = new validator_1.Validator();
  const facilitator = new facilitator_1.Facilitator();
  const processor = new processor_1.JobProcessor();
  const handler = new job_handler_1.JobHandler(validator, processor);
  // 0. Fetch Relayer Address (Dynamic Shard Awareness)
  try {
    const walletPath =
      process.env.MULTIVERSX_PRIVATE_KEY || path.resolve('wallet.pem');
    const walletContent = await fs_1.promises.readFile(walletPath, 'utf8');
    const signer = sdk_wallet_1.UserSigner.fromPem(walletContent);
    const myAddress = signer.getAddress().bech32();
    console.log(
      `Fetching Relayer Address for ${myAddress} from ${config_1.CONFIG.PROVIDERS.RELAYER_URL}...`,
    );
    const relayerResp = await axios_1.default.get(
      `${config_1.CONFIG.PROVIDERS.RELAYER_URL}/relayer/address/${myAddress}`,
      {timeout: config_1.CONFIG.REQUEST_TIMEOUT},
    );
    const relayerAddress = relayerResp.data?.relayerAddress;
    if (relayerAddress) {
      console.log(`Using Relayer: ${relayerAddress}`);
      validator.setRelayerConfig(
        config_1.CONFIG.PROVIDERS.RELAYER_URL,
        relayerAddress,
      );
    } else {
      console.warn(
        'No relayer address returned, falling back to direct transactions.',
      );
    }
  } catch (e) {
    console.warn(
      `Failed to init relayer: ${e.message}. Using direct transactions.`,
    );
  }
  // Start Listener
  facilitator.onPayment(async payment => {
    console.log(
      `[Job] Payment Received! Amount: ${payment.amount} ${payment.token}`,
    );
    const jobId = payment.meta?.jobId || `job-${Date.now()}`;
    // Fire-and-Forget Handler
    void handler.handle(jobId, payment);
  });
  await facilitator.start();
  console.log('Listening for x402 payments...');
}
main().catch(console.error);
//# sourceMappingURL=index.js.map
