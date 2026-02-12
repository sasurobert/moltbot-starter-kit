/**
 * Discovery Skills — agent search and balance queries
 *
 * Uses SDK v15 controller.query for identity lookups + API for balances.
 */
import {Address} from '@multiversx/sdk-core';
import {ApiNetworkProvider} from '@multiversx/sdk-network-providers';
import axios from 'axios';

import {CONFIG} from '../config';
import {Logger} from '../utils/logger';
import {createEntrypoint} from '../utils/entrypoint';
import {createPatchedAbi} from '../utils/abi';
import * as identityAbiJson from '../abis/identity-registry.abi.json';

const logger = new Logger('DiscoverySkills');

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DiscoveredAgent {
  nonce: number;
  name: string;
  uri: string;
}

export interface DiscoverParams {
  maxResults?: number;
}

export interface TokenBalance {
  identifier: string;
  balance: string;
  decimals: number;
  name: string;
}

export interface BalanceResult {
  address: string;
  egld: string;
  tokens: TokenBalance[];
}

// ─── discoverAgents ────────────────────────────────────────────────────────────
// Uses BlockchainService pattern (controller.query)

export async function discoverAgents(
  params: DiscoverParams = {},
): Promise<DiscoveredAgent[]> {
  const maxResults = params.maxResults ?? 10;
  logger.info(`Discovering up to ${maxResults} agents...`);

  const entrypoint = createEntrypoint();
  const abi = createPatchedAbi(identityAbiJson);
  const controller = entrypoint.createSmartContractController(abi);
  const registry = Address.newFromBech32(CONFIG.ADDRESSES.IDENTITY_REGISTRY);

  const agents: DiscoveredAgent[] = [];

  for (let nonce = 1; nonce <= maxResults; nonce++) {
    try {
      const results = await controller.query({
        contract: registry,
        function: 'get_agent',
        arguments: [nonce],
      });

      if (!results[0]) break;

      const agent = results[0] as {
        name: string;
        uri: string;
      };

      agents.push({
        nonce,
        name: agent.name,
        uri: agent.uri,
      });
    } catch {
      break; // No more agents
    }
  }

  logger.info(`Found ${agents.length} agents`);
  return agents;
}

// ─── getBalance ────────────────────────────────────────────────────────────────
// Uses the public API (not SC queries)

export async function getBalance(address?: string): Promise<BalanceResult> {
  // Default to own wallet address
  let targetAddress = address;
  if (!targetAddress) {
    const {UserSigner} = await import('@multiversx/sdk-wallet');
    const {promises: fs} = await import('fs');
    const pemPath = process.env.MULTIVERSX_PRIVATE_KEY || './wallet.pem';
    const pemContent = await fs.readFile(pemPath, 'utf8');
    const signer = UserSigner.fromPem(pemContent);
    targetAddress = new Address(signer.getAddress().bech32()).toBech32();
  }

  const apiUrl = CONFIG.API_URL;

  // EGLD
  const provider = new ApiNetworkProvider(apiUrl, {
    clientName: 'moltbot-skills',
    timeout: CONFIG.REQUEST_TIMEOUT,
  });
  const account = await provider.getAccount({
    bech32: () => targetAddress!,
  });

  // ESDTs
  let tokens: TokenBalance[] = [];
  try {
    const resp = await axios.get(`${apiUrl}/accounts/${targetAddress}/tokens`, {
      timeout: CONFIG.REQUEST_TIMEOUT,
    });
    tokens = (resp.data as TokenBalance[]) || [];
  } catch {
    logger.warn('Could not fetch ESDT balances');
  }

  return {
    address: targetAddress,
    egld: account.balance.toString(),
    tokens,
  };
}
