/**
 * Identity Skills — register, update, query agent identity on the Identity Registry
 *
 * Uses SDK v15 patterns via the centralized `chain/` layer:
 *   - signer & provider come from chain/* helpers
 *   - "fetch nonce → sign → send/relay" is chain.signAndSend / signAndRelay
 *   - ABI patching is chain.createPatchedAbi
 */
import {Address, VariadicValue} from '@multiversx/sdk-core';

import {CONFIG} from '../config';
import {Logger} from '../utils/logger';
import {
  loadSignerWithAddress,
  createProvider,
  createEntrypoint,
  createPatchedAbi,
  discoverRelayerAddress,
  signAndSend,
  withRelayer,
} from '../chain';
import * as identityAbiJson from '../abis/identity-registry.abi.json';

const logger = new Logger('IdentitySkills');

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AgentDetails {
  name: string;
  uri: string;
  public_key: string;
  owner: Address;
  metadata: Array<{key: string; value: string}>;
}

export interface RegisterAgentParams {
  name: string;
  uri: string;
  metadata?: Array<{key: string; value: string}>;
  useRelayer?: boolean;
}

export interface SetMetadataParams {
  agentNonce: number;
  entries: Array<{key: string; value: string}>;
}

// ─── register_agent ────────────────────────────────────────────────────────────

export async function registerAgent(
  params: RegisterAgentParams,
): Promise<string> {
  logger.info(`Registering agent: ${params.name}`);

  const {signer, senderAddress} = await loadSignerWithAddress();
  const provider = createProvider('moltbot-skills');

  const entrypoint = createEntrypoint();
  const abi = createPatchedAbi(identityAbiJson);
  const factory = entrypoint.createSmartContractTransactionsFactory(abi);

  const registry = Address.newFromBech32(CONFIG.ADDRESSES.IDENTITY_REGISTRY);

  const tx = await factory.createTransactionForExecute(senderAddress, {
    contract: registry,
    function: 'register_agent',
    gasLimit: CONFIG.GAS_LIMITS.REGISTER,
    arguments: [
      Buffer.from(params.name),
      Buffer.from(params.uri),
      Buffer.from(senderAddress.getPublicKey()),
      VariadicValue.fromItemsCounted(), // metadata (empty for now)
      VariadicValue.fromItemsCounted(), // services (empty for now)
    ],
  });

  if (params.useRelayer) {
    const relayerBech = await discoverRelayerAddress(senderAddress);
    if (relayerBech) {
      withRelayer(tx, Address.newFromBech32(relayerBech));
    }
  }

  const txHash = await signAndSend(tx, signer, senderAddress, provider);
  logger.info(`Registration tx: ${txHash}`);
  return txHash;
}

// ─── get_agent ─────────────────────────────────────────────────────────────────

export async function getAgent(
  agentNonce: number,
): Promise<AgentDetails | null> {
  const entrypoint = createEntrypoint();
  const abi = createPatchedAbi(identityAbiJson);
  const controller = entrypoint.createSmartContractController(abi);
  const registry = Address.newFromBech32(CONFIG.ADDRESSES.IDENTITY_REGISTRY);

  try {
    const results = await controller.query({
      contract: registry,
      function: 'get_agent',
      arguments: [agentNonce],
    });

    if (!results[0]) return null;
    return results[0] as AgentDetails;
  } catch (error) {
    logger.warn(
      `Failed to get agent ${agentNonce}: ${(error as Error).message}`,
    );
    return null;
  }
}

// ─── set_metadata ──────────────────────────────────────────────────────────────

export async function setMetadata(params: SetMetadataParams): Promise<string> {
  logger.info(
    `Setting ${params.entries.length} metadata entries for agent #${params.agentNonce}`,
  );

  const {signer, senderAddress} = await loadSignerWithAddress();
  const provider = createProvider('moltbot-skills');

  const entrypoint = createEntrypoint();
  const abi = createPatchedAbi(identityAbiJson);
  const factory = entrypoint.createSmartContractTransactionsFactory(abi);
  const registry = Address.newFromBech32(CONFIG.ADDRESSES.IDENTITY_REGISTRY);

  const tx = await factory.createTransactionForExecute(senderAddress, {
    contract: registry,
    function: 'set_metadata',
    gasLimit: CONFIG.GAS_LIMITS.UPDATE,
    arguments: [
      BigInt(params.agentNonce),
      VariadicValue.fromItemsCounted(), // metadata
      VariadicValue.fromItemsCounted(), // services
    ],
  });

  const txHash = await signAndSend(tx, signer, senderAddress, provider);
  logger.info(`Metadata tx: ${txHash}`);
  return txHash;
}
