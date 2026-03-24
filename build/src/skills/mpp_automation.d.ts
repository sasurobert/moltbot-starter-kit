export declare function fundSessionFromDiscovery(identitySkill: any, mppSkill: any, agentAddress: string, tokenIdentifier?: string, durationSeconds?: number): Promise<string>;
export declare function slashSessionOnFeedback(identitySkill: any, mppSkill: any, agentAddress: string, rating: number, jobId: string, channelId: string): Promise<{
    feedbackTx: string;
    closeTx?: string;
}>;
