/**
 * Escrow Skills — deposit, release, refund, query escrow state
 *
 * Uses SDK v15 patterns with the Escrow ABI.
 */
import { Address } from '@multiversx/sdk-core';
export interface DepositParams {
    jobId: string;
    receiverAddress: string;
    poaHash: string;
    deadlineTimestamp: number;
    amount: bigint;
    token?: string;
}
export interface EscrowData {
    employer: Address;
    receiver: Address;
    token_id: string;
    token_nonce: bigint;
    amount: bigint;
    poa_hash: Uint8Array;
    deadline: bigint;
    status: string;
}
export declare function deposit(params: DepositParams): Promise<string>;
export declare function release(jobId: string): Promise<string>;
export declare function refund(jobId: string): Promise<string>;
export declare function getEscrow(jobId: string): Promise<EscrowData | null>;
