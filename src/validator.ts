import { UserSigner } from "@multiversx/sdk-wallet";
import { Transaction, TransactionPayload, Address } from "@multiversx/sdk-core";
import { ApiNetworkProvider } from "@multiversx/sdk-network-providers";
import { promises as fs } from "fs";
import * as path from "path";
import { CONFIG } from "./config";

export class Validator {
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
        const data = new TransactionPayload(`submitProof@${jobIdHex}@${resultHash}`);

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

        // 4. Sign
        const serialized = tx.serializeForSigning();
        const signature = await signer.sign(serialized);
        tx.applySignature(signature);

        // 5. Broadcast (with Retry)
        let attempts = 0;
        const maxAttempts = 3;
        while (attempts < maxAttempts) {
            try {
                const txHash = await provider.sendTransaction(tx);
                console.log(`Transaction sent: ${txHash}`);
                return txHash;
            } catch (e: any) {
                attempts++;
                console.warn(`Tx Broadcast Attempt ${attempts} failed: ${e.message}`);
                if (attempts >= maxAttempts) throw e;
                await new Promise(r => setTimeout(r, 1000 * attempts)); // Backoff
            }
        }
        throw new Error("Failed to broadcast transaction after retries");
    }
}
