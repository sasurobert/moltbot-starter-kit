"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hireAgent = hireAgent;
/**
 * Hire Skill — orchestrates init_job + escrow deposit
 *
 * Composite skill that combines validation and escrow into one workflow.
 */
const logger_1 = require("../utils/logger");
const validation_skills_1 = require("./validation_skills");
const escrow_skills_1 = require("./escrow_skills");
const logger = new logger_1.Logger('HireSkills');
// ─── hireAgent ─────────────────────────────────────────────────────────────────
async function hireAgent(params) {
    logger.info(`Hiring agent #${params.agentNonce} for job ${params.jobId}`);
    // 1. Initialize job on the Validation Registry
    const initJobTxHash = await (0, validation_skills_1.initJob)({
        jobId: params.jobId,
        agentNonce: params.agentNonce,
        serviceId: params.serviceId,
        paymentAmount: params.paymentAmount,
        paymentToken: params.paymentToken,
    });
    logger.info(`Job initialized: ${initJobTxHash}`);
    // 2. Deposit funds in escrow
    const deadlineTimestamp = Math.floor(Date.now() / 1000) + params.deadlineSeconds;
    const depositTxHash = await (0, escrow_skills_1.deposit)({
        jobId: params.jobId,
        receiverAddress: params.agentAddress,
        poaHash: params.poaHash,
        deadlineTimestamp,
        amount: params.paymentAmount,
        token: params.paymentToken,
    });
    logger.info(`Escrow deposited: ${depositTxHash}`);
    return { initJobTxHash, depositTxHash };
}
//# sourceMappingURL=hire_skills.js.map