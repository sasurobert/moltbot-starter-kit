import { UserSigner } from "@multiversx/sdk-wallet";
export interface AgentSpendingPolicy {
    dailyLimitFiat?: number;
    maxPerTransactionNative: bigint;
    whitelistedCurrencies: string[];
}
export declare class MoltbotMppSkill {
    private signer;
    private policy;
    private provider;
    constructor(signer: UserSigner, policy: AgentSpendingPolicy, networkProviderUrl: string);
    attemptPayment(mppChallengeUrl: string): Promise<string>;
}
