import { UserSigner } from '@multiversx/sdk-wallet';
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
    /**
     * Generates a deterministic channel ID for a session.
     */
    computeChannelId(receiver: string, token: string, nonce?: number | bigint): string;
    /**
     * Signs an off-chain voucher for a session.
     */
    signVoucher(contractAddress: string, channelId: string, amount: bigint, nonce: number): Promise<string>;
}
