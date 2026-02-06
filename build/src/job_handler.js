'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
exports.JobHandler = void 0;
const config_1 = require('./config');
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
    } catch (err) {
      console.error(
        `[JobHandler] FATAL: Job ${jobId} failed after retries.`,
        err,
      );
    }
  }
  async processWithRetry(payment, attempt) {
    try {
      const payload = payment.meta?.payload || '';
      return await this.processor.process({
        payload: payload,
        isUrl: payload.startsWith('http'),
      });
    } catch (e) {
      if (attempt >= config_1.CONFIG.RETRY.MAX_ATTEMPTS) {
        throw new Error(
          `Processing failed after ${attempt} attempts: ${e.message}`,
        );
      }
      console.warn(
        `[JobHandler] Processing attempt ${attempt} failed. Retrying...`,
      );
      await this.delay(2000); // Short delay for processing retry
      return this.processWithRetry(payment, attempt + 1);
    }
  }
  async submitWithRetry(jobId, resultHash, attempt) {
    if (attempt > config_1.CONFIG.RETRY.MAX_ATTEMPTS) {
      throw new Error(`Submission failed after ${attempt - 1} attempts.`);
    }
    console.log(`[JobHandler] Submission attempt ${attempt} for job ${jobId}`);
    let txHash;
    try {
      // 1. Broadcast (Always recreate/re-sign in submitProof if we wanted to be super safe,
      // but here we just call it which fetches nonce and signs)
      txHash = await this.validator.submitProof(jobId, resultHash);
      console.log(`[JobHandler] Proof broadcasted. Tx: ${txHash}`);
    } catch (e) {
      console.warn(
        `[JobHandler] Broadcast failed (Attempt ${attempt}): ${e.message}`,
      );
      await this.delay(config_1.CONFIG.RETRY.SUBMISSION_DELAY);
      return this.submitWithRetry(jobId, resultHash, attempt + 1);
    }
    // 2. Monitoring Phase
    const success = await this.monitorTransaction(txHash);
    if (success) {
      console.log(`[JobHandler] Job ${jobId} COMPLETED successfully.`);
      return;
    }
    // 3. Retry Phase (only if monitorTransaction failed or timed out)
    console.warn(
      `[JobHandler] Tx ${txHash} failed or timed out. Re-submitting job ${jobId}...`,
    );
    return this.submitWithRetry(jobId, resultHash, attempt + 1);
  }
  async monitorTransaction(txHash) {
    const startTime = Date.now();
    const maxMonitorTime = 120000; // 2 minutes for cross-shard support
    let pollInterval = config_1.CONFIG.RETRY.CHECK_INTERVAL;
    let notFoundCount = 0;
    while (Date.now() - startTime < maxMonitorTime) {
      const status = await this.validator.getTxStatus(txHash);
      console.log(`[JobHandler] Monitoring ${txHash}: status is ${status}`);
      if (status === 'success' || status === 'successful') {
        return true;
      }
      if (status === 'fail' || status === 'failed' || status === 'invalid') {
        console.error(`[JobHandler] Tx ${txHash} confirmed failure: ${status}`);
        return false;
      }
      if (status === 'not_found') {
        notFoundCount++;
        // If not found for more than 30 seconds (assuming ~5-15 polls), could be a broadcast issue
        if (notFoundCount > 10 && Date.now() - startTime > 30000) {
          console.warn(
            `[JobHandler] Tx ${txHash} not found for >30s. Considering broadcast failure.`,
          );
          return false;
        }
      } else {
        notFoundCount = 0; // Reset if we see 'pending' or anything else
      }
      // If pending or unknown, wait and continue monitoring
      // We do NOT resend the transaction here.
      await this.delay(pollInterval);
      // Slightly increase poll interval (cap at 10s)
      pollInterval = Math.min(pollInterval + 1000, 10000);
    }
    console.warn(
      `[JobHandler] Monitoring ${txHash} timed out after 2 minutes.`,
    );
    return false;
  }
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
exports.JobHandler = JobHandler;
//# sourceMappingURL=job_handler.js.map
