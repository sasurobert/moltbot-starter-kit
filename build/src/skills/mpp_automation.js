"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fundSessionFromDiscovery = fundSessionFromDiscovery;
exports.slashSessionOnFeedback = slashSessionOnFeedback;
async function fundSessionFromDiscovery(identitySkill, mppSkill, agentAddress, tokenIdentifier = 'EGLD', durationSeconds = 3600) {
    // 1. Fetch pricing directly from the identity/registry
    const priceInt = await identitySkill.getAgentPricing(agentAddress);
    // 2. Open an MPP session funded with that exact price
    const txHash = await mppSkill.openSession(agentAddress, priceInt, tokenIdentifier, durationSeconds);
    return txHash;
}
async function slashSessionOnFeedback(identitySkill, mppSkill, agentAddress, rating, jobId, channelId) {
    // 1. Submit the feedback on-chain via identity registry
    const feedbackTx = await identitySkill.submitFeedback(agentAddress, rating, jobId);
    // 2. If it's a negative rating (e.g., < 3 stars), immediately request session close
    let closeTx = undefined;
    if (rating < 3) {
        closeTx = await mppSkill.requestCloseSession(channelId);
    }
    return { feedbackTx, closeTx };
}
//# sourceMappingURL=mpp_automation.js.map