/**
 * Discovery Skills — agent search and balance queries
 *
 * Uses controller.query for identity lookups + API for balances.
 */
import {Address} from '@multiversx/sdk-core';
import axios from 'axios';

import {CONFIG} from '../config';
import {Logger} from '../utils/logger';
import {
  createEntrypoint,
  createPatchedAbi,
  createProvider,
  loadSignerWithAddress,
} from '../chain';
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
      break;
    }
  }

  logger.info(`Found ${agents.length} agents`);
  return agents;
}

// ─── getBalance ────────────────────────────────────────────────────────────────

export async function getBalance(address?: string): Promise<BalanceResult> {
  let targetAddress = address;
  if (!targetAddress) {
    const {senderAddress} = await loadSignerWithAddress();
    targetAddress = senderAddress.toBech32();
  }

  const provider = createProvider('moltbot-skills');
  const account = await provider.getAccount({
    bech32: () => targetAddress!,
  });

  let tokens: TokenBalance[] = [];
  try {
    const resp = await axios.get(
      `${CONFIG.API_URL}/accounts/${targetAddress}/tokens`,
      {timeout: CONFIG.REQUEST_TIMEOUT},
    );
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
