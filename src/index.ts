import * as dotenv from 'dotenv';
import axios from 'axios';
import { UserSigner } from '@multiversx/sdk-wallet';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Facilitator } from './facilitator';
import { McpBridge } from './mcp_bridge';
import { Validator } from './validator';
import { JobProcessor } from './processor';
import { JobHandler } from './job_handler';
import { CONFIG } from './config';
import { Logger } from './utils/logger';

const logger = new Logger('Main');

dotenv.config();

async function main() {
  logger.info('Starting Moltbot...');

  // Load Config
  try {
    const configPath = path.resolve('agent.config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    logger.info(`Loaded Agent: ${config.agentName} (ID: ${config.nonce})`);
  } catch {
    logger.warn('agent.config.json not found. See agent.config.example.json.');
  }

  // Initialize Bridges
  new McpBridge(CONFIG.PROVIDERS.MCP_URL);
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

    logger.info(
      `Fetching Relayer Address for ${myAddress} from ${CONFIG.PROVIDERS.RELAYER_URL}...`,
    );
    const relayerResp = await axios.get(
      `${CONFIG.PROVIDERS.RELAYER_URL}/relayer/address/${myAddress}`,
      { timeout: CONFIG.REQUEST_TIMEOUT },
    );
    const relayerAddress = relayerResp.data?.relayerAddress;

    if (relayerAddress) {
      logger.info(`Using Relayer: ${relayerAddress}`);
      validator.setRelayerConfig(CONFIG.PROVIDERS.RELAYER_URL, relayerAddress);
    } else {
      logger.warn(
        'No relayer address returned, falling back to direct transactions.',
      );
    }
  } catch (e) {
    logger.warn(
      `Failed to init relayer: ${(e as Error).message}. Using direct transactions.`,
    );
  }

  // Start Listener
  facilitator.onPayment(async payment => {
    logger.info(
      `[Job] Payment Received! Amount: ${payment.amount} ${payment.token}`,
    );

    const jobId = payment.meta?.jobId || `job-${Date.now()}`;

    // Fire-and-Forget Handler
    void handler.handle(jobId, payment);
  });

  await facilitator.start();
  logger.info('Listening for x402 payments...');
}

main().catch(err => logger.error('Fatal error in main loop', err));
