/**
 * Hire Skill — orchestrates init_job + escrow deposit
 *
 * Composite skill that combines validation and escrow into one workflow.
 */
import { Logger } from '../utils/logger';
import { initJob } from './validation_skills';
import { deposit } from './escrow_skills';

const logger = new Logger('HireSkills');

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface HireAgentParams {
    jobId: string;
    agentNonce: number;
    agentAddress: string;
    paymentAmount: bigint;
    poaHash: string;
    deadlineSeconds: number;
    paymentToken?: string;
    serviceId?: number;
}

export interface HireResult {
    initJobTxHash: string;
    depositTxHash: string;
}

// ─── hireAgent ─────────────────────────────────────────────────────────────────

export async function hireAgent(
    params: HireAgentParams,
): Promise<HireResult> {
    logger.info(
        `Hiring agent #${params.agentNonce} for job ${params.jobId}`,
    );

    // 1. Initialize job on the Validation Registry
    const initJobTxHash = await initJob({
        jobId: params.jobId,
        agentNonce: params.agentNonce,
        serviceId: params.serviceId,
        paymentAmount: params.paymentAmount,
        paymentToken: params.paymentToken,
    });
    logger.info(`Job initialized: ${initJobTxHash}`);

    // 2. Deposit funds in escrow
    const deadlineTimestamp =
        Math.floor(Date.now() / 1000) + params.deadlineSeconds;

    const depositTxHash = await deposit({
        jobId: params.jobId,
        receiverAddress: params.agentAddress,
        poaHash: params.poaHash,
        deadlineTimestamp,
        amount: params.paymentAmount,
        token: params.paymentToken,
    });
    logger.info(`Escrow deposited: ${depositTxHash}`);

    return { initJobTxHash, depositTxHash };
}
