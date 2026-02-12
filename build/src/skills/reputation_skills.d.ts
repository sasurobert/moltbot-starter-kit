export interface SubmitFeedbackParams {
    jobId: string;
    agentNonce: number;
    rating: number;
}
export interface ReputationScore {
    score: bigint;
    totalFeedbacks: bigint;
}
export declare function submitFeedback(params: SubmitFeedbackParams): Promise<string>;
export declare function getReputation(agentNonce: number): Promise<ReputationScore>;
