/**
 * Reputation Skills — feedback and reputation queries
 *
 * Uses the centralized chain/ layer.
 */
import {Address} from '@multiversx/sdk-core';

import {CONFIG} from '../config';
import {Logger} from '../utils/logger';
import {
  loadSignerWithAddress,
  createProvider,
  createEntrypoint,
  createPatchedAbi,
  signAndSend,
} from '../chain';
import * as reputationAbiJson from '../abis/reputation-registry.abi.json';

const logger = new Logger('ReputationSkills');

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface SubmitFeedbackParams {
  jobId: string;
  agentNonce: number;
  rating: number; // 1-5
}

export interface ReputationScore {
  score: bigint;
  totalFeedbacks: bigint;
}

// ─── submit_feedback ───────────────────────────────────────────────────────────

export async function submitFeedback(
  params: SubmitFeedbackParams,
): Promise<string> {
  logger.info(
    `Submitting feedback for job ${params.jobId}: rating=${params.rating}`,
  );

  const {signer, senderAddress} = await loadSignerWithAddress();
  const provider = createProvider('moltbot-skills');

  const entrypoint = createEntrypoint();
  const abi = createPatchedAbi(reputationAbiJson);
  const factory = entrypoint.createSmartContractTransactionsFactory(abi);
  const registry = Address.newFromBech32(CONFIG.ADDRESSES.REPUTATION_REGISTRY);

  const tx = await factory.createTransactionForExecute(senderAddress, {
    contract: registry,
    function: 'giveFeedbackSimple',
    arguments: [
      Buffer.from(params.jobId),
      BigInt(params.agentNonce),
      BigInt(params.rating),
    ],
    gasLimit: 10_000_000n,
  });

  const txHash = await signAndSend(tx, signer, senderAddress, provider);
  logger.info(`Feedback tx: ${txHash}`);
  return txHash;
}

// ─── get_reputation ────────────────────────────────────────────────────────────

export async function getReputation(
  agentNonce: number,
): Promise<ReputationScore> {
  const entrypoint = createEntrypoint();
  const abi = createPatchedAbi(reputationAbiJson);
  const controller = entrypoint.createSmartContractController(abi);
  const registry = Address.newFromBech32(CONFIG.ADDRESSES.REPUTATION_REGISTRY);

  try {
    const scoreResults = await controller.query({
      contract: registry,
      function: 'get_reputation_score',
      arguments: [BigInt(agentNonce)],
    });

    const feedbackResults = await controller.query({
      contract: registry,
      function: 'get_total_feedbacks',
      arguments: [BigInt(agentNonce)],
    });

    return {
      score: BigInt(scoreResults[0]?.toString() ?? '0'),
      totalFeedbacks: BigInt(feedbackResults[0]?.toString() ?? '0'),
    };
  } catch (error) {
    logger.warn(
      `Failed to get reputation for agent ${agentNonce}: ${(error as Error).message}`,
    );
    return {score: 0n, totalFeedbacks: 0n};
  }
}
