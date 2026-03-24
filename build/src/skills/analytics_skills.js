"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAgentRevenue = getAgentRevenue;
exports.getAgentSpend = getAgentSpend;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("../utils/logger");
const logger = new logger_1.Logger('AnalyticsSkills');
const ELASTIC_URL = 'https://api.multiversx.com/elastic';
async function getAgentRevenue(address, daysBack = 30) {
    logger.info(`Fetching revenue for ${address} over ${daysBack} days`);
    const timestampGte = Math.floor(Date.now() / 1000) - daysBack * 86400;
    const query = {
        query: {
            bool: {
                must: [
                    { match: { receiver: address } },
                    { match: { function: 'settle' } }, // Assuming the logic
                    { range: { timestamp: { gte: timestampGte } } },
                ],
            },
        },
        size: 1000,
    };
    try {
        const response = await axios_1.default.post(`${ELASTIC_URL}/transactions/_search`, query);
        const hits = response.data?.hits?.hits || [];
        let total = 0n;
        for (const hit of hits) {
            total += BigInt(hit._source.value || '0');
        }
        // Convert from EGLD (10^18) to float
        return Number(total) / 1e18;
    }
    catch (err) {
        logger.error('Failed to parse analytics revenue');
        return 0;
    }
}
async function getAgentSpend(address, daysBack = 30) {
    logger.info(`Fetching spend for ${address} over ${daysBack} days`);
    const timestampGte = Math.floor(Date.now() / 1000) - daysBack * 86400;
    const query = {
        query: {
            bool: {
                must: [
                    { match: { sender: address } },
                    { match: { function: 'open_session' } },
                    { range: { timestamp: { gte: timestampGte } } },
                ],
            },
        },
        size: 1000,
    };
    try {
        const response = await axios_1.default.post(`${ELASTIC_URL}/transactions/_search`, query);
        const hits = response.data?.hits?.hits || [];
        let total = 0n;
        for (const hit of hits) {
            // Spend includes native transfers mapped to the session opening
            total += BigInt(hit._source.value || '0');
        }
        return Number(total) / 1e18;
    }
    catch (err) {
        logger.error('Failed to parse analytics spend');
        return 0;
    }
}
//# sourceMappingURL=analytics_skills.js.map