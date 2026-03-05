import { UserSigner } from '@multiversx/sdk-wallet';
import { Address } from '@multiversx/sdk-core';
/**
 * Resolves a PEM path and returns a UserSigner.
 * Priority: customPath, then env variables, then default wallet.pem.
 */
export declare function getSigner(customPath?: string): UserSigner;
/**
 * Fetches the specific relayer address for a sender's shard, with caching.
 */
export declare function getRelayerAddress(sender: Address): Promise<string>;
/**
 * Standard relay function.
 */
export declare function relayTransaction(txPlain: any): Promise<string>;
