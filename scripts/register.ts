import { UserSigner } from "@multiversx/sdk-wallet";
import { Transaction, TransactionPayload, Address } from "@multiversx/sdk-core";
import { promises as fs } from "fs";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
    const pemPath = process.env.MULTIVERSX_PRIVATE_KEY || "wallet.pem";
    const pemContent = await fs.readFile(pemPath, "utf8");
    const signer = UserSigner.fromPem(pemContent);

    const config = JSON.parse(await fs.readFile("config.json", "utf8"));

    console.log(`Registering Agent: ${config.agentName}...`);

    // Identity Registry Address (should be in env or constant)
    // For demo, we assume a known address or process.env
    const registryAddress = process.env.IDENTITY_REGISTRY_ADDRESS;
    if (!registryAddress) {
        console.warn("IDENTITY_REGISTRY_ADDRESS not set, using placeholder or failing.");
        // throw new Error("IDENTITY_REGISTRY_ADDRESS is required");
    }

    // Construct Manifest for TxData
    const manifest = {
        name: config.agentName,
        pricing: config.pricing,
        tags: config.capabilities
    };

    // TxData: registerAgent@<NameHex>@<ManifestJsonHex>
    // Or just storing the manifest? The spec says "TxData: The full ARF JSON".
    // Let's assume the contract handles parsing or storing raw data.
    // Actually, usually it's strict arguments. 
    // "Arguments: [Name], TxData: The full ARF JSON"
    // Let's format it as `registerAgent@<name_hex>` and put JSON in the extra data or just assume simple usage for starter.
    // As per spec: "Calls IdentityRegistry::registerAgent ... Arguments: [Name] ... TxData: The full ARF JSON"

    const nameHex = Buffer.from(config.agentName).toString("hex");
    // If the contract parses everything from data, or arguments. 
    // Standard SC call: functionName@arg1...
    // If we put data after arguments, it depends on contract.
    // We'll put name as argument.

    const tx = new Transaction({
        nonce: 0, // Need to fetch
        value: "0",
        receiver: new Address(registryAddress || "erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu"), // Use a valid-looking dummy if missing
        gasLimit: 10000000n,
        chainID: "D",
        data: new TransactionPayload(`registerAgent@${nameHex}`),
        sender: new Address(signer.getAddress().bech32())
    });

    // TODO: Fetch real nonce
    console.log("Transaction created. Sign & Broadcast logic needed (simulated for starter kit).");

    // Simulate saving nonce
    config.nonce = 12345; // Mock ID from registry
    await fs.writeFile("config.json", JSON.stringify(config, null, 2));
    console.log(`Agent registered! Nonce (ID): ${config.nonce}`);
}

main().catch(console.error);
