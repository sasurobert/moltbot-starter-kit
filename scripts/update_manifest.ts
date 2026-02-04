import { UserSigner } from "@multiversx/sdk-wallet";
import { Transaction, TransactionPayload, Address } from "@multiversx/sdk-core";
import { ApiNetworkProvider } from "@multiversx/sdk-network-providers";
import { promises as fs } from "fs";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config();

async function main() {
    console.log("🚀 Starting Manifest Update...");

    // 1. Setup Provider & Signer
    const providerUrl = process.env.MULTIVERSX_API_URL || "https://devnet-api.multiversx.com";
    const provider = new ApiNetworkProvider(providerUrl);

    const pemPath = process.env.MULTIVERSX_PRIVATE_KEY || path.resolve("wallet.pem");
    let pemContent = "";
    try {
        pemContent = await fs.readFile(pemPath, "utf8");
    } catch (e) {
        console.error("❌ Wallet not found at wallet.pem. Run setup.sh first.");
        process.exit(1);
    }

    const signer = UserSigner.fromPem(pemContent);
    const senderAddress = signer.getAddress();

    // 2. Load Config to get new details
    const configPath = path.resolve("config.json");
    const config: any = JSON.parse(await fs.readFile(configPath, "utf8"));

    console.log(`Updating Agent: ${config.agentName}`);
    console.log("New Capabilities:", config.capabilities);

    // 3. Construct Transaction with ALL 3 required arguments
    // Contract signature: update_agent(nonce, new_uri, new_public_key)

    const registryAddress = process.env.IDENTITY_REGISTRY_ADDRESS;
    if (!registryAddress) {
        console.error("❌ IDENTITY_REGISTRY_ADDRESS not set in .env");
        process.exit(1);
    }

    const account = await provider.getAccount(senderAddress);

    // Argument 1: Agent Nonce (NFT token nonce)
    if (!config.nonce || config.nonce === 0) {
        console.error("❌ Agent nonce not found in config.json. Register first.");
        process.exit(1);
    }
    const nonceHex = BigInt(config.nonce).toString(16).padStart(2, "0");

    // Argument 2: New URI - points to updated manifest/ARF JSON
    const newUri = config.manifestUri || `https://agent.molt.bot/${config.agentName}`;
    const uriHex = Buffer.from(newUri).toString("hex");

    // Argument 3: New Public Key - can keep same or update
    // Default to current signer's public key
    const publicKeyHex = senderAddress.hex();

    // Argument 4: Metadata (optional)
    let metadataHex = "";
    if (config.metadata && config.metadata.length > 0) {
        for (const entry of config.metadata) {
            const keyHex = Buffer.from(entry.key).toString("hex");
            const valueHex = Buffer.from(entry.value).toString("hex");
            metadataHex += `@${keyHex}@${valueHex}`;
        }
    }

    console.log(`Updating Agent Nonce: ${config.nonce}`);
    console.log(`New URI: ${newUri}`);
    if (config.metadata?.length > 0) console.log(`New Metadata: ${config.metadata.length} entries`);

    // Format: update_agent@<nonceHex>@<uriHex>@<publicKeyHex>[@<key1Hex>@<value1Hex>...]
    const data = new TransactionPayload(`update_agent@${nonceHex}@${uriHex}@${publicKeyHex}${metadataHex}`);

    const tx = new Transaction({
        nonce: BigInt(account.nonce),
        value: "0",
        receiver: new Address(registryAddress),
        gasLimit: 10000000n,
        chainID: process.env.MULTIVERSX_CHAIN_ID || "D",
        data: data,
        sender: senderAddress
    });

    // 4. Sign
    const serialized = tx.serializeForSigning();
    const signature = await signer.sign(serialized);
    tx.applySignature(signature);

    console.log("Transaction Signed. Broadcasting...");

    // 5. Broadcast
    try {
        const txHash = await provider.sendTransaction(tx);
        console.log(`✅ Update Transaction Sent: ${txHash}`);
        console.log(`Check Explorer: https://devnet-explorer.multiversx.com/transactions/${txHash}`);
    } catch (e: any) {
        console.error("Failed to broadcast update:", e.message);
    }
}

main().catch(console.error);
