import { UserSigner } from '@multiversx/sdk-wallet';
export interface X402PaymentRequest {
    receiver: string;
    amount: string;
    token?: string;
}
export declare function parseX402Header(header: string): X402PaymentRequest | null;
export declare function createX402SignatureHeader(signer: UserSigner, txHash: string): Promise<string>;
