import * as dotenv from 'dotenv';
import axios from 'axios';
import {UserSigner} from '@multiversx/sdk-wallet';
import {promises as fs} from 'fs';
import * as path from 'path';
import {Facilitator} from './facilitator';
import {McpBridge} from './mcp_bridge';
import {Validator} from './validator';
import {JobProcessor} from './processor';
import {JobHandler} from './job_handler';
import {CONFIG} from './config';

dotenv.config();

async function main() {
  console.log('Starting Moltbot...');

  // Load Config
  try {
    const configPath = path.resolve('config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    console.log(`Loaded Agent: ${config.agentName} (ID: ${config.nonce})`);
  } catch (e) {
    console.warn('Config not found or invalid.');
  }

  // Initialize Bridges
  const mcp = new McpBridge(CONFIG.PROVIDERS.MCP_URL);
  const validator = new Validator();
  const facilitator = new Facilitator();
  const processor = new JobProcessor();
  const handler = new JobHandler(validator, processor);

  // 0. Fetch Relayer Address (Dynamic Shard Awareness)
  try {
    const walletPath =
      process.env.MULTIVERSX_PRIVATE_KEY || path.resolve('wallet.pem');
    const walletContent = await fs.readFile(walletPath, 'utf8');
    const signer = UserSigner.fromPem(walletContent);
    const myAddress = signer.getAddress().bech32();

    console.log(
      `Fetching Relayer Address for ${myAddress} from ${CONFIG.PROVIDERS.RELAYER_URL}...`,
    );
    const relayerResp = await axios.get(
      `${CONFIG.PROVIDERS.RELAYER_URL}/relayer/address/${myAddress}`,
      {timeout: CONFIG.REQUEST_TIMEOUT},
    );
    const relayerAddress = relayerResp.data?.relayerAddress;

    if (relayerAddress) {
      console.log(`Using Relayer: ${relayerAddress}`);
      validator.setRelayerConfig(CONFIG.PROVIDERS.RELAYER_URL, relayerAddress);
    } else {
      console.warn(
        'No relayer address returned, falling back to direct transactions.',
      );
    }
  } catch (e: any) {
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
    handler.handle(jobId, payment);
  });

  await facilitator.start();
  console.log('Listening for x402 payments...');
}

main().catch(console.error);
