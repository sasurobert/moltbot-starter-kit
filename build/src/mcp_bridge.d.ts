export declare class McpBridge {
    private baseUrl;
    constructor(url: string);
    getAgentReputation(nonce: number): Promise<number>;
    getGasPrice(): Promise<string>;
}
