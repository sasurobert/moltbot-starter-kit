import { UserSigner } from "@multiversx/sdk-wallet";
import { Transaction, TransactionPayload, Address, TransactionComputer } from "@multiversx/sdk-core";
import { ApiNetworkProvider } from "@multiversx/sdk-network-providers";
import axios from "axios";
import { promises as fs } from "fs";
import * as path from "path";
import { CONFIG } from "./config";

export class Validator {
    private relayerUrl: string | null = null;
    private relayerAddress: string | null = null;
    private txComputer = new TransactionComputer();

    setRelayerConfig(url: string, address: string) {
        this.relayerUrl = url;
        this.relayerAddress = address;
    }
    async submitProof(jobId: string, resultHash: string): Promise<string> {
        console.log(`Submitting proof for ${jobId}:hash=${resultHash}`);

        // 1. Setup Provider & Signer
        const provider = new ApiNetworkProvider(CONFIG.API_URL);

        const pemPath = process.env.MULTIVERSX_PRIVATE_KEY || path.resolve("wallet.pem");
        const pemContent = await fs.readFile(pemPath, "utf8");
        const signer = UserSigner.fromPem(pemContent);
        const senderAddress = signer.getAddress();

        // 2. Fetch Account State (Nonce)
        const account = await provider.getAccount(senderAddress);

        // 3. Construct Transaction
        const jobIdHex = Buffer.from(jobId).toString("hex");
        const data = new TransactionPayload(`submit_proof@${jobIdHex}@${resultHash}`);

        const receiver = new Address(CONFIG.ADDRESSES.VALIDATION_REGISTRY);

        const tx = new Transaction({
            nonce: BigInt(account.nonce),
            value: "0",
            receiver: receiver,
            gasLimit: CONFIG.GAS_LIMITS.SUBMIT_PROOF,
            chainID: CONFIG.CHAIN_ID,
            data: data,
            sender: senderAddress
        });

        // 4. Relayer or Direct?
        if (this.relayerUrl && this.relayerAddress) {
            console.log("Using Gasless Relayer V3...");
            tx.relayer = new Address(this.relayerAddress);
            tx.version = 2;
            tx.gasLimit = BigInt(CONFIG.GAS_LIMITS.SUBMIT_PROOF) + 50000n; // Add gas for relaying
        }

        // 5. Sign
        const serialized = this.txComputer.computeBytesForSigning(tx);
        const signature = await signer.sign(serialized);
        tx.applySignature(signature);

        // 6. Broadcast (with Retry)
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
            try {
                let txHash = "";

                if (this.relayerUrl && this.relayerAddress) {
                    // Send to Relayer
                    console.log(`Sending to Relayer Service: ${this.relayerUrl}`);
                    const response = await axios.post(`${this.relayerUrl}/state/relay`, {
                        transaction: tx.toPlainObject()
                    });
                    // Note: Endpoint might be /transaction/send or /relay depending on Service impl.
                    // The OpenClaw Relayer defines: app.post("/relay", ...) in server.ts
                    // Let's match that: /relay

                    // Wait, server.ts has: app.post("/relay", ...) in Step 86.
                    // But Step 60 (pay.ts) used /transaction/send or similar.
                    // Let's stick to what I saw in server.ts: /relay

                    // Correction: server.ts from Step 86 has `app.post("/relay", ...)`
                    // BUT it expects `transaction` and `challengeNonce`.
                    // Moltbot might need to solve challenge if it's new.
                    // But for existing agents, challengeNonce is opt if not "register_agent"?
                    // RelayerService:81: if (isRegistration) { check challenge }
                    // So for submit_proof, challenge is not needed IF agent is registered.

                    // Wait, server.ts accepts `transaction` in body.
                    const relayRes = await axios.post(`${this.relayerUrl}/relay`, {
                        transaction: tx.toPlainObject()
                    });
                    txHash = relayRes.data.txHash;
                } else {
                    // Direct
                    txHash = await provider.sendTransaction(tx);
                }

                console.log(`Transaction sent: ${txHash}`);
                return txHash;
            } catch (e: any) {
                attempts++;
                const msg = e.response?.data?.error || e.message;
                console.warn(`Tx Broadcast Attempt ${attempts} failed: ${msg}`);
                if (attempts >= maxAttempts) throw e;
                await new Promise(r => setTimeout(r, 1000 * attempts)); // Backoff
            }
        }
        throw new Error("Failed to broadcast transaction after retries");
    }
}
