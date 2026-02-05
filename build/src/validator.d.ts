export declare class Validator {
    private relayerUrl;
    private relayerAddress;
    private txComputer;
    setRelayerConfig(url: string, address: string): void;
    submitProof(jobId: string, resultHash: string): Promise<string>;
    registerAgent(): Promise<void>;
    waitForTx(hash: string): Promise<void>;
    getTxStatus(txHash: string): Promise<string>;
    private withTimeout;
}
