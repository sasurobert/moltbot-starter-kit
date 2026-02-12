/**
 * Validation Skills — job lifecycle on the Validation Registry
 *
 * Uses SDK v15 patterns matching validator.ts:
 * createEntrypoint() → factory/controller → ABI-typed arguments.
 */
import { Address } from '@multiversx/sdk-core';
export interface InitJobParams {
    jobId: string;
    agentNonce: number;
    serviceId?: number;
    paymentAmount?: bigint;
    paymentToken?: string;
}
export interface SubmitProofParams {
    jobId: string;
    proofHash: string;
    useRelayer?: boolean;
}
export interface JobData {
    status: string;
    proof: Uint8Array;
    employer: Address;
    creation_timestamp: bigint;
    agent_nonce: bigint;
}
export declare function initJob(params: InitJobParams): Promise<string>;
export declare function submitProof(params: SubmitProofParams): Promise<string>;
export declare function isJobVerified(jobId: string): Promise<boolean>;
export declare function getJobData(jobId: string): Promise<JobData | null>;
