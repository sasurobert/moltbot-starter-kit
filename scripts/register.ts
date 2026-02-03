import { UserSigner } from "@multiversx/sdk-wallet";
import { Transaction, TransactionPayload, Address } from "@multiversx/sdk-core";
import { ApiNetworkProvider } from "@multiversx/sdk-network-providers";
import { promises as fs } from "fs";
import * as dotenv from "dotenv";
import * as path from "path";
import { CONFIG } from "../src/config";

dotenv.config();

async function main() {
    console.log("🚀 Starting Agent Registration...");

    // 1. Setup Provider & Signer
    const provider = new ApiNetworkProvider(CONFIG.API_URL);

    const pemPath = process.env.MULTIVERSX_PRIVATE_KEY || path.resolve("wallet.pem");
    const pemContent = await fs.readFile(pemPath, "utf8");
    const signer = UserSigner.fromPem(pemContent);
    const senderAddress = signer.getAddress();

    // 2. Load Config
    const configPath = path.resolve("config.json");
    let config = { agentName: "Moltbot", nonce: 0, pricing: "1USDC", capabilities: [] };
    try {
        config = JSON.parse(await fs.readFile(configPath, "utf8"));
    } catch (e) {
        console.warn("Config file missing, utilizing defaults.");
    }
    console.log(`Registering Agent: ${config.agentName}...`);

    // 3. Construct Transaction
    const registryAddress = CONFIG.ADDRESSES.IDENTITY_REGISTRY;

    const account = await provider.getAccount(senderAddress);

    const nameHex = Buffer.from(config.agentName).toString("hex");
    // registerAgent@<NameHex>
    const data = new TransactionPayload(`registerAgent@${nameHex}`);

    const tx = new Transaction({
        nonce: BigInt(account.nonce),
        value: "0",
        receiver: new Address(registryAddress),
        gasLimit: CONFIG.GAS_LIMITS.REGISTER,
        chainID: CONFIG.CHAIN_ID,
        data: data,
        sender: senderAddress
    });

    // 4. Sign
    const serialized = tx.serializeForSigning();
    const signature = await signer.sign(serialized);
    tx.applySignature(signature);

    console.log("Transaction Signed. Broadcasting...");

    // 5. Broadcast (Real)
    try {
        const txHash = await provider.sendTransaction(tx);
        console.log(`✅ Registration Transaction Sent: ${txHash}`);
        console.log(`Check Explorer: https://devnet-explorer.multiversx.com/transactions/${txHash}`);

        // 6. Update Config (Simulate nonce for now or fetch later)
        // Ideally we wait for transaction and parse logs, but for starter script just claiming "Done" is ok.
        console.log("Update config.json with your new Agent ID once confirmed.");
    } catch (e: any) {
        console.error("Failed to broadcast transaction:", e.message);
        if (e.message.includes("insufficient funds")) {
            console.error("🔴 ERROR: Insufficient funds. Please faucet your wallet!");
            console.error(`Address: ${senderAddress.bech32()}`);
        }
    }
}

main().catch(console.error);
