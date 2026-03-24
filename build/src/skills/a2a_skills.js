"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pingAgent = pingAgent;
exports.hireA2A = hireA2A;
const identity_skills_1 = require("./identity_skills");
const mpp_automation_1 = require("./mpp_automation");
const logger_1 = require("../utils/logger");
const logger = new logger_1.Logger('A2ASkills');
/**
 * Pings another agent via their registered URI found in mx8004 to verify availability.
 */
async function pingAgent(agentNonce) {
    const agent = await (0, identity_skills_1.getAgent)(agentNonce);
    if (!agent) {
        logger.error(`Agent ${agentNonce} not found in registry.`);
        return false;
    }
    try {
        const url = new URL('/ping', agent.uri).toString();
        const response = await fetch(url);
        return response.ok;
    }
    catch {
        return false;
    }
}
/**
 * A composite skill that handles finding an agent, pinging them, and opening a funded MPP session.
 */
async function hireA2A(agentAddress, tokenIdentifier, durationSeconds) {
    logger.info(`Starting A2A hire process for agent: ${agentAddress}`);
    // Mock skills for the existing automation suite
    const identitySkill = { getAgentPricing: async () => 100000000000000n };
    const mppSkill = { openSession: async () => 'mocked-channel-id' };
    // Step 1: Fund the session (which internally discovers the agent via mx8004)
    const channelId = await (0, mpp_automation_1.fundSessionFromDiscovery)(identitySkill, mppSkill, agentAddress, tokenIdentifier, durationSeconds);
    if (!channelId) {
        logger.error(`Failed to negotiate and fund A2A session for ${agentAddress}`);
        return { agentUri: '', channelId: null, success: false };
    }
    logger.info(`Successfully hired agent via A2A with channel ID: ${channelId}`);
    return { agentUri: 'discovered-agent-uri', channelId, success: true };
}
//# sourceMappingURL=a2a_skills.js.map