import { ProxyNetworkProvider } from "@multiversx/sdk-network-providers";

// Usage: ts-node get_chain_id.ts <proxyUrl>

const url = process.argv[2];
if (!url) {
    console.error("Usage: ts-node get_chain_id.ts <proxyUrl>");
    process.exit(1);
}

(async () => {
    try {
        const provider = new ProxyNetworkProvider(url);
        const config = await provider.getNetworkConfig();
        console.log(config.ChainID);
    } catch (error) {
        console.error("Failed to get chainID:", error);
        process.exit(1);
    }
})();
