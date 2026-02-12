export interface DiscoveredAgent {
    nonce: number;
    name: string;
    uri: string;
}
export interface DiscoverParams {
    maxResults?: number;
}
export interface TokenBalance {
    identifier: string;
    balance: string;
    decimals: number;
    name: string;
}
export interface BalanceResult {
    address: string;
    egld: string;
    tokens: TokenBalance[];
}
export declare function discoverAgents(params?: DiscoverParams): Promise<DiscoveredAgent[]>;
export declare function getBalance(address?: string): Promise<BalanceResult>;
