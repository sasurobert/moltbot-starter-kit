export interface TransferParams {
    receiver: string;
    amount: bigint;
    token?: string;
    tokenNonce?: number;
}
export interface MultiTransferItem {
    token: string;
    nonce: number;
    amount: bigint;
}
export interface MultiTransferParams {
    receiver: string;
    transfers: MultiTransferItem[];
}
export declare function transfer(params: TransferParams): Promise<string>;
export declare function multiTransfer(params: MultiTransferParams): Promise<string>;
