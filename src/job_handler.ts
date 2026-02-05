
import { Validator } from "./validator";
import { JobProcessor } from "./processor";
import { PaymentEvent } from "./facilitator";
import { CONFIG } from "./config";

export class JobHandler {
    constructor(
        private validator: Validator,
        private processor: JobProcessor
    ) { }

    async handle(jobId: string, payment: PaymentEvent) {
        console.log(`[JobHandler] Starting handler for ${jobId}`);

        try {
            // 1. Process with Retry
            const resultHash = await this.processWithRetry(payment, 1);
            console.log(`[JobHandler] Result calculated for ${jobId}: ${resultHash}`);

            // 2. Submit Proof with Retry & Monitoring
            await this.submitWithRetry(jobId, resultHash, 1);

        } catch (err) {
            console.error(`[JobHandler] FATAL: Job ${jobId} failed after retries.`, err);
        }
    }

    private async processWithRetry(payment: PaymentEvent, attempt: number): Promise<string> {
        try {
            const payload = payment.meta?.payload || "";
            return await this.processor.process({
                payload: payload,
                isUrl: payload.startsWith("http")
            });
        } catch (e) {
            if (attempt >= CONFIG.RETRY.MAX_ATTEMPTS) {
                throw new Error(`Processing failed after ${attempt} attempts: ${(e as Error).message}`);
            }
            console.warn(`[JobHandler] Processing attempt ${attempt} failed. Retrying...`);
            await this.delay(2000); // Short delay for processing retry
            return this.processWithRetry(payment, attempt + 1);
        }
    }

    private async submitWithRetry(jobId: string, resultHash: string, attempt: number): Promise<void> {
        if (attempt > CONFIG.RETRY.MAX_ATTEMPTS) {
            throw new Error(`Submission failed after ${attempt - 1} attempts.`);
        }

        let txHash: string;
        try {
            txHash = await this.validator.submitProof(jobId, resultHash);
            console.log(`[JobHandler] Proof submitted (Attempt ${attempt}). Tx: ${txHash}`);
        } catch (e) {
            console.warn(`[JobHandler] Submission attempt ${attempt} failed immediately: ${(e as Error).message}`);
            // If immediate broadcast failure, wait and retry
            await this.delay(CONFIG.RETRY.SUBMISSION_DELAY);
            return this.submitWithRetry(jobId, resultHash, attempt + 1);
        }

        // Monitoring Loop
        console.log(`[JobHandler] Waiting ${CONFIG.RETRY.SUBMISSION_DELAY}ms to verify execution...`);
        await this.delay(CONFIG.RETRY.SUBMISSION_DELAY);

        const status = await this.validator.getTxStatus(txHash);
        console.log(`[JobHandler] Tx ${txHash} status: ${status}`);

        if (status === "success" || status === "successful") {
            console.log(`[JobHandler] Job ${jobId} COMPLETED successfully.`);
            return;
        }

        console.warn(`[JobHandler] Tx ${txHash} is ${status} after delay. Retrying submission...`);
        return this.submitWithRetry(jobId, resultHash, attempt + 1);
    }

    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
