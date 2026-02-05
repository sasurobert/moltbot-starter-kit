"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JobHandler = void 0;
const config_1 = require("./config");
class JobHandler {
    validator;
    processor;
    constructor(validator, processor) {
        this.validator = validator;
        this.processor = processor;
    }
    async handle(jobId, payment) {
        console.log(`[JobHandler] Starting handler for ${jobId}`);
        try {
            // 1. Process with Retry
            const resultHash = await this.processWithRetry(payment, 1);
            console.log(`[JobHandler] Result calculated for ${jobId}: ${resultHash}`);
            // 2. Submit Proof with Retry & Monitoring
            await this.submitWithRetry(jobId, resultHash, 1);
        }
        catch (err) {
            console.error(`[JobHandler] FATAL: Job ${jobId} failed after retries.`, err);
        }
    }
    async processWithRetry(payment, attempt) {
        try {
            const payload = payment.meta?.payload || '';
            return await this.processor.process({
                payload: payload,
                isUrl: payload.startsWith('http'),
            });
        }
        catch (e) {
            if (attempt >= config_1.CONFIG.RETRY.MAX_ATTEMPTS) {
                throw new Error(`Processing failed after ${attempt} attempts: ${e.message}`);
            }
            console.warn(`[JobHandler] Processing attempt ${attempt} failed. Retrying...`);
            await this.delay(2000); // Short delay for processing retry
            return this.processWithRetry(payment, attempt + 1);
        }
    }
    async submitWithRetry(jobId, resultHash, attempt) {
        if (attempt > config_1.CONFIG.RETRY.MAX_ATTEMPTS) {
            throw new Error(`Submission failed after ${attempt - 1} attempts.`);
        }
        let txHash;
        try {
            txHash = await this.validator.submitProof(jobId, resultHash);
            console.log(`[JobHandler] Proof submitted (Attempt ${attempt}). Tx: ${txHash}`);
        }
        catch (e) {
            console.warn(`[JobHandler] Submission attempt ${attempt} failed immediately: ${e.message}`);
            // If immediate broadcast failure, wait and retry
            await this.delay(config_1.CONFIG.RETRY.SUBMISSION_DELAY);
            return this.submitWithRetry(jobId, resultHash, attempt + 1);
        }
        // Monitoring Loop
        console.log(`[JobHandler] Waiting ${config_1.CONFIG.RETRY.SUBMISSION_DELAY}ms to verify execution...`);
        await this.delay(config_1.CONFIG.RETRY.SUBMISSION_DELAY);
        const status = await this.validator.getTxStatus(txHash);
        console.log(`[JobHandler] Tx ${txHash} status: ${status}`);
        if (status === 'success' || status === 'successful') {
            console.log(`[JobHandler] Job ${jobId} COMPLETED successfully.`);
            return;
        }
        console.warn(`[JobHandler] Tx ${txHash} is ${status} after delay. Retrying submission...`);
        return this.submitWithRetry(jobId, resultHash, attempt + 1);
    }
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
exports.JobHandler = JobHandler;
//# sourceMappingURL=job_handler.js.map