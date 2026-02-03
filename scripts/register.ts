import { UserSigner } from "@multiversx/sdk-wallet";
import { Transaction, TransactionPayload, Address } from "@multiversx/sdk-core";
import { ApiNetworkProvider } from "@multiversx/sdk-network-providers";
import { promises as fs } from "fs";
import * as dotenv from "dotenv";
import * as path from "path";
import axios from "axios";
import { createHash } from "crypto";
import { CONFIG } from "../src/config";

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
