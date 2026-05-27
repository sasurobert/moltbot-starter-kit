import * as dotenv from 'dotenv';
import {promises as fs} from 'fs';
import * as path from 'path';
import {Facilitator} from './facilitator';
import {McpBridge} from './mcp_bridge';
import {Validator} from './validator';
import {JobProcessor} from './processor';
import {JobHandler} from './job_handler';
import {CONFIG} from './config';
import {Logger} from './utils/logger';
import {AgentDiscovery} from './discovery';
import {loadSignerWithAddress, discoverRelayerAddress} from './chain';

export {
  Facilitator,
  McpBridge,
  Validator,
  JobProcessor,
  JobHandler,
  CONFIG,
  Logger,
  AgentDiscovery,
};

const logger = new Logger('Main');

dotenv.config();

async function main() {
  logger.info('Starting Moltbot...');

  try {
    const configPath = path.resolve('agent.config.json');
    const config = JSON.parse(await fs.readFile(configPath, 'utf8'));
    logger.info(`Loaded Agent: ${config.agentName} (ID: ${config.nonce})`);
  } catch {
    logger.warn('agent.config.json not found. See agent.config.example.json.');
  }

  const mcpBridge = new McpBridge();
  if (CONFIG.PROVIDERS.MCP_ENABLED) {
    void mcpBridge.verifyRequiredTools().then(mcpReady => {
      if (!mcpReady) {
        logger.warn(
          'MCP bridge is degraded (missing tools or unreachable). Runtime fallbacks will be used.',
        );
      }
    });
  } else {
    logger.info('MCP bridge disabled (MCP_ENABLED=false).');
  }
  const validator = new Validator();
  const facilitator = new Facilitator();
  const processor = new JobProcessor();
  const handler = new JobHandler(validator, processor);

  // Discover the relayer for the wallet's shard before serving any jobs;
  // proof submissions need it set, but absence is non-fatal (direct fallback).
  try {
    const {senderAddress} = await loadSignerWithAddress();
    logger.info(
      `Discovering relayer for ${senderAddress.toBech32()} from ${CONFIG.PROVIDERS.RELAYER_URL}...`,
    );
    const relayerAddress = await discoverRelayerAddress(senderAddress);

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

  facilitator.onPayment(async payment => {
    logger.info(
      `[Job] Payment Received! Amount: ${payment.amount} ${payment.token}`,
    );

    const jobId = payment.meta?.jobId || `job-${Date.now()}`;
    void handler.handle(jobId, payment);
  });

  await facilitator.start();
  logger.info('Listening for x402 payments...');

  const shutdown = async () => {
    logger.info('Shutting down Moltbot...');
    await facilitator.stop();
    await mcpBridge.close();
    process.exit(0);
  };

  process.once('SIGINT', () => {
    void shutdown();
  });
  process.once('SIGTERM', () => {
    void shutdown();
  });
}

main().catch(err => logger.error('Fatal error in main loop', err));
