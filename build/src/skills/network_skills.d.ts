export interface NetworkConfig {
    erd_chain_id: string;
    erd_round_duration: number;
}
export interface TransactionStatus {
    hash: string;
    status: string;
}
export declare function getNetworkConfig(): Promise<NetworkConfig | null>;
export declare function getTransactionStatus(txHash: string): Promise<TransactionStatus | null>;
