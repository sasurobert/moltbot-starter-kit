export declare function fundSessionFromDiscovery(identitySkill: {
    getAgentPricing: (address: string) => Promise<bigint>;
}, mppSkill: {
    openSession: (address: string, price: bigint, token: string, seconds: number) => Promise<string>;
}, agentAddress: string, tokenIdentifier?: string, durationSeconds?: number): Promise<string>;
export declare function slashSessionOnFeedback(identitySkill: {
    submitFeedback: (address: string, rating: number, jobId: string) => Promise<string>;
}, mppSkill: {
    requestCloseSession: (channelId: string) => Promise<string>;
}, agentAddress: string, rating: number, jobId: string, channelId: string): Promise<{
    feedbackTx: string;
    closeTx?: string;
}>;
