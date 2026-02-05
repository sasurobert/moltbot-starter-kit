export declare class RelayerAddressCache {
    private static load;
    private static save;
    static get(url: string, userAddress: string): string | null;
    static set(url: string, userAddress: string, relayerAddress: string): void;
}
