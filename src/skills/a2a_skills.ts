import {getAgent} from './identity_skills';
import {fundSessionFromDiscovery} from './mpp_automation';
import {Logger} from '../utils/logger';

const logger = new Logger('A2ASkills');

export interface A2ANegotiationResult {
  agentUri: string;
  channelId: string | null;
  success: boolean;
}

/**
 * Pings another agent via their registered URI found in mx8004 to verify availability.
 */
export async function pingAgent(agentNonce: number): Promise<boolean> {
  const agent = await getAgent(agentNonce);
  if (!agent) {
    logger.error(`Agent ${agentNonce} not found in registry.`);
    return false;
  }

  try {
    const url = new URL('/ping', agent.uri).toString();
    const response = await fetch(url);
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * A composite skill that handles finding an agent, pinging them, and opening a funded MPP session.
 */
export async function hireA2A(
  agentAddress: string,
  tokenIdentifier: string,
  durationSeconds: number,
): Promise<A2ANegotiationResult> {
  logger.info(`Starting A2A hire process for agent: ${agentAddress}`);

  // Mock skills for the existing automation suite
  const identitySkill = {getAgentPricing: async () => 100000000000000n};
  const mppSkill = {openSession: async () => 'mocked-channel-id'};

  // Step 1: Fund the session (which internally discovers the agent via mx8004)
  const channelId = await fundSessionFromDiscovery(
    identitySkill,
    mppSkill,
    agentAddress,
    tokenIdentifier,
    durationSeconds,
  );

  if (!channelId) {
    logger.error(
      `Failed to negotiate and fund A2A session for ${agentAddress}`,
    );
    return {agentUri: '', channelId: null, success: false};
  }

  logger.info(`Successfully hired agent via A2A with channel ID: ${channelId}`);
  return {agentUri: 'discovered-agent-uri', channelId, success: true};
}
