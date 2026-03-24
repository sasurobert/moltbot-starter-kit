"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNetworkConfig = getNetworkConfig;
exports.getTransactionStatus = getTransactionStatus;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("../config");
const logger_1 = require("../utils/logger");
const logger = new logger_1.Logger('NetworkSkills');
async function getNetworkConfig() {
    try {
        const response = await axios_1.default.get(`${config_1.CONFIG.API_URL}/network/config`);
        return response.data?.data?.config;
    }
    catch {
        logger.error('Failed to fetch network config');
        return null;
    }
}
async function getTransactionStatus(txHash) {
    try {
        const response = await axios_1.default.get(`${config_1.CONFIG.API_URL}/transactions/${txHash}?fields=status`);
        return {
            hash: txHash,
            status: response.data?.status || 'unknown',
        };
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=network_skills.js.map