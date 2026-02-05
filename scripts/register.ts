import { UserSigner } from "@multiversx/sdk-wallet";
import { Transaction, TransactionPayload, Address } from "@multiversx/sdk-core";
import { ApiNetworkProvider } from "@multiversx/sdk-network-providers";
import { promises as fs } from "fs";
import * as dotenv from "dotenv";
import * as path from "path";
import axios from "axios";
import { createHash } from "crypto";
import { CONFIG } from "../src/config";
import { RelayerAddressCache } from "../src/utils/RelayerAddressCache";

dotenv.config();

/**
 * Solve a Lib-based PoW Challenge for the Relayer
 */
function solveChallenge(challenge: any): string {
    console.log(`🧩 Solving PoW Challenge (Difficulty: ${challenge.difficulty} bits)...`);
    const startTime = Date.now();
    let nonce = 0;
    const difficulty = challenge.difficulty;
    const fullBytes = Math.floor(difficulty / 8);
    const remainingBits = difficulty % 8;
    const threshold = 1 << (8 - remainingBits);

    while (true) {
        const data = `${challenge.address}${challenge.salt}${nonce}`;
        const hash = createHash("sha256").update(data).digest();

        let isValid = true;
        // Check full bytes
        for (let i = 0; i < fullBytes; i++) {
            if (hash[i] !== 0) {
                isValid = false;
                break;
            }
        }

        if (isValid && remainingBits > 0) {
            if (hash[fullBytes] >= threshold) {
                isValid = false;
            }
        }

        if (isValid) {
            const timeTaken = (Date.now() - startTime) / 1000;
            console.log(`✅ Challenge Solved in ${timeTaken.toFixed(2)}s! Nonce: ${nonce}`);
            return nonce.toString();
        }
        nonce++;
    }
}

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
    let config: any = { agentName: "Moltbot", nonce: 0, pricing: "1USDC", capabilities: [], manifestUri: "", metadata: [] };
    try {
        config = JSON.parse(await fs.readFile(configPath, "utf8"));
    } catch (e) {
        console.warn("Config file missing, utilizing defaults.");
    }
    console.log(`Registering Agent: ${config.agentName}...`);

    // 3. Construct Transaction with ALL 3 required arguments
    const registryAddress = CONFIG.ADDRESSES.IDENTITY_REGISTRY;
    const account = await provider.getAccount(senderAddress);

    // Argument 1: Agent Name (required)
    const nameHex = Buffer.from(config.agentName).toString("hex");

    // Argument 2: Agent URI - points to manifest/ARF JSON (can be updated later)
    // Default to empty or config value, agent can set real URI via update_agent later
    const agentUri = config.manifestUri || `https://agent.molt.bot/${config.agentName}`;
    const uriHex = Buffer.from(agentUri).toString("hex");

    // Argument 3: Public Key - for signature verification and secure communication
    // Derive from the signer's public key (hex encoded)
    const publicKeyHex = senderAddress.hex();

    // Argument 4: Metadata (optional) - EIP-8004 compatible key-value pairs
    // Format: register_agent@<nameHex>@<uriHex>@<publicKeyHex>[@<metadataLength>@<key1Hex>@<value1Hex>...]
    let metadataHex = "";
    if (config.metadata && config.metadata.length > 0) {
        // MultiValueEncoded ManagedVec<MetadataEntry> in VM:
        // is encoded as a sequence of (key, value) pairs
        for (const entry of config.metadata) {
            const keyHex = Buffer.from(entry.key).toString("hex");
            const valueHex = Buffer.from(entry.value).toString("hex");
            metadataHex += `@${keyHex}@${valueHex}`;
        }
    }

    console.log(`Name: ${config.agentName}`);
    console.log(`URI: ${agentUri}`);
    console.log(`Public Key: ${publicKeyHex.substring(0, 16)}...`);
    if (config.metadata?.length > 0) console.log(`Metadata: ${config.metadata.length} entries`);

    // Format: register_agent@<nameHex>@<uriHex>@<publicKeyHex>[@<key1Hex>@<value1Hex>...]
    const data = new TransactionPayload(`register_agent@${nameHex}@${uriHex}@${publicKeyHex}${metadataHex}`);

    const tx = new Transaction({
        nonce: BigInt(account.nonce),
        value: "0",
        receiver: new Address(registryAddress),
        gasLimit: CONFIG.GAS_LIMITS.REGISTER,
        chainID: CONFIG.CHAIN_ID,
        data: data,
        sender: senderAddress
    });

    // Sign the transaction (always required, even for relaying)
    const serialized = tx.serializeForSigning();
    const signature = await signer.sign(serialized);
    tx.applySignature(signature);

    // 4. Determine Strategy (Local vs Relayer)
    const balance = BigInt(account.balance.toString());
    const useRelayer = balance === 0n || !!process.env.FORCE_RELAYER;

    if (useRelayer) {
        console.log("Empty wallet detected. Using Relayer fallback...");
        try {
            // A. Get Challenge
            const { data: challenge } = await axios.post(`${CONFIG.PROVIDERS.RELAYER_URL}/challenge`, {
                address: senderAddress.bech32()
            });

            // A.1 Verify/Get Relayer Address for this Shard
            // The Relayer Service requires the inner transaction's `relayer` field to match the 
            // relayer address for the user's shard.
            let relayerAddressBech32 = RelayerAddressCache.get(CONFIG.PROVIDERS.RELAYER_URL, senderAddress.bech32());

            if (!relayerAddressBech32) {
                console.log("Fetching Relayer Address for Shard...");
                try {
                    const { data } = await axios.get(`${CONFIG.PROVIDERS.RELAYER_URL}/relayer/address/${senderAddress.bech32()}`);
                    relayerAddressBech32 = data.relayerAddress;
                    RelayerAddressCache.set(CONFIG.PROVIDERS.RELAYER_URL, senderAddress.bech32(), relayerAddressBech32!);
                    console.log(`Relayer Address cached: ${relayerAddressBech32}`);
                } catch (e: any) {
                    console.warn(`Failed to fetch specific relayer address: ${e.message}. Proceeding without explicit relayer field (may fail if V3 strict).`);
                }
            } else {
                console.log(`Using cached Relayer Address: ${relayerAddressBech32}`);
            }

            // Update Transaction with Relayer if available (Required for Relayed V3)
            if (relayerAddressBech32) {
                tx.relayer = new Address(relayerAddressBech32);
                // Re-sign because the content changed (relayer field is part of the signature)
                const serializedRelayed = tx.serializeForSigning();
                const signatureRelayed = await signer.sign(serializedRelayed);
                tx.applySignature(signatureRelayed);
            }

            // B. Solve Challenge
            const challengeNonce = solveChallenge(challenge);

            // C. Relay
            console.log("Broadcasting via Relayer...");
            const { data: relayResult } = await axios.post(`${CONFIG.PROVIDERS.RELAYER_URL}/relay`, {
                transaction: tx.toPlainObject(),
                challengeNonce
            });

            console.log(`✅ Relayed Transaction Sent: ${relayResult.txHash}`);
            console.log(`Check Explorer: ${CONFIG.EXPLORER_URL}/transactions/${relayResult.txHash}`);
        } catch (e: any) {
            console.error("Relaying failed:", e.response?.data?.error || e.message);
            process.exit(1);
        }
    } else {
        console.log("Wallet funded. Broadcasting locally...");
        try {
            const txHash = await provider.sendTransaction(tx);
            console.log(`✅ Transaction Sent: ${txHash}`);
            console.log(`Check Explorer: ${CONFIG.EXPLORER_URL}/transactions/${txHash}`);
        } catch (e: any) {
            console.error("Failed to broadcast transaction:", e.message);
        }
    }
}

main().catch(console.error);
