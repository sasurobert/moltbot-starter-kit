/**
 * Reputation Skills — feedback and reputation queries
 *
 * Uses SDK v15 patterns matching hiring.ts::submitReputation.
 */
import {
    Address,
    TransactionComputer,
} from '@multiversx/sdk-core';
import { ApiNetworkProvider } from '@multiversx/sdk-network-providers';
import { UserSigner } from '@multiversx/sdk-wallet';
import { promises as fs } from 'fs';
import * as path from 'path';

import { CONFIG } from '../config';
import { Logger } from '../utils/logger';
import { createEntrypoint } from '../utils/entrypoint';
import { createPatchedAbi } from '../utils/abi';
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

// ─── Helpers ───────────────────────────────────────────────────────────────────

async function loadSignerAndProvider() {
    const pemPath =
        process.env.MULTIVERSX_PRIVATE_KEY || path.resolve('wallet.pem');
    const pemContent = await fs.readFile(pemPath, 'utf8');
    const signer = UserSigner.fromPem(pemContent);
    const senderAddress = new Address(signer.getAddress().bech32());
    const provider = new ApiNetworkProvider(CONFIG.API_URL, {
        clientName: 'moltbot-skills',
        timeout: CONFIG.REQUEST_TIMEOUT,
    });
    return { signer, senderAddress, provider };
}

// ─── submit_feedback ───────────────────────────────────────────────────────────
// Mirrors hiring.ts::submitReputation exactly

export async function submitFeedback(
    params: SubmitFeedbackParams,
): Promise<string> {
    logger.info(
        `Submitting feedback for job ${params.jobId}: rating=${params.rating}`,
    );

    const { signer, senderAddress, provider } = await loadSignerAndProvider();

    const entrypoint = createEntrypoint();
    const abi = createPatchedAbi(reputationAbiJson);
    const factory = entrypoint.createSmartContractTransactionsFactory(abi);
    const registry = Address.newFromBech32(
        CONFIG.ADDRESSES.REPUTATION_REGISTRY,
    );

    const account = await provider.getAccount({
        bech32: () => senderAddress.toBech32(),
    });

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

    tx.nonce = BigInt(account.nonce);
    const computer = new TransactionComputer();
    tx.signature = await signer.sign(computer.computeBytesForSigning(tx));

    const txHash = await provider.sendTransaction(tx);
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
    const registry = Address.newFromBech32(
        CONFIG.ADDRESSES.REPUTATION_REGISTRY,
    );

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
        return { score: 0n, totalFeedbacks: 0n };
    }
}
