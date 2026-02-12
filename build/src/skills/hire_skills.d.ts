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
export declare function hireAgent(params: HireAgentParams): Promise<HireResult>;
