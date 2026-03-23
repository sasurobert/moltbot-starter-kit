import { UserSigner } from "@multiversx/sdk-wallet";
import { Transaction, Address, TransactionComputer } from "@multiversx/sdk-core";
import { ApiNetworkProvider } from "@multiversx/sdk-network-providers";

export interface AgentSpendingPolicy {
    dailyLimitFiat?: number;
    maxPerTransactionNative: bigint; 
    whitelistedCurrencies: string[]; 
}

export class MoltbotMppSkill {
    private provider: ApiNetworkProvider;

    constructor(
        private signer: UserSigner,
        private policy: AgentSpendingPolicy,
        networkProviderUrl: string
    ) {
        this.provider = new ApiNetworkProvider(networkProviderUrl);
    }

    async attemptPayment(mppChallengeUrl: string): Promise<string> {
        const url = new URL(mppChallengeUrl.replace("mpp://", "http://"));
        const receiverStr = url.searchParams.get("recipient");
        const amountStr = url.searchParams.get("amount");
        const currency = url.searchParams.get("currency") || "EGLD";
        const method = url.searchParams.get("method") || "transfer";

        if (!receiverStr || !amountStr) {
            throw new Error("Invalid MPP Challenge URL");
        }

        const receiver = Address.newFromBech32(receiverStr);
        const amount = BigInt(amountStr);

        if (!this.policy.whitelistedCurrencies.includes(currency)) {
            throw new Error(`Policy violation: Currency ${currency} is not whitelisted.`);
        }
        if (amount > this.policy.maxPerTransactionNative) {
            throw new Error(`Policy violation: Amount exceeds limit`);
        }

        const txPayloadStr = method === "transfer" && currency !== "EGLD" 
            ? `ESDTTransfer@${Buffer.from(currency).toString("hex")}@${amount.toString(16).padStart(16, "0")}`
            : "";
            
        const networkConfig = await this.provider.getNetworkConfig();
        const address = this.signer.getAddress();
        const senderAddress = Address.newFromBech32(address.bech32());
        const account = await this.provider.getAccount(address as any);

        let tx = new Transaction({
            nonce: BigInt(account.nonce),
            sender: senderAddress,
            receiver: receiver,
            value: currency === "EGLD" ? amount : 0n,
            gasLimit: currency === "EGLD" ? 50000n : 500000n,
            data: txPayloadStr ? Buffer.from(txPayloadStr) : undefined,
            chainID: networkConfig.ChainID
        });

        const computer = new TransactionComputer();
        const serialized = computer.computeBytesForSigning(tx);
        tx.signature = await this.signer.sign(serialized);

        const txHash = await this.provider.sendTransaction(tx);
        
        let status = "pending";
        while (status === "pending") {
            await new Promise(r => setTimeout(r, 2000));
            try {
                const txInfo = await this.provider.getTransaction(txHash);
                if (txInfo.status.isSuccessful()) {
                    status = "success";
                } else if (txInfo.status.isFailed() || txInfo.status.isInvalid()) {
                    throw new Error("Payment transaction failed on chain");
                }
            } catch(e) { /* ignore fetching delays */ }
        }

        return txHash;
    }
}
