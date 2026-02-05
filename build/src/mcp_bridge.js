"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.McpBridge = void 0;
const axios_1 = require("axios");
class McpBridge {
    baseUrl;
    constructor(url) {
        this.baseUrl = url;
    }
    async getAgentReputation(nonce) {
        try {
            const res = await axios_1.default.get(`${this.baseUrl}/agents/${nonce}/reputation`);
            return res.data.score;
        }
        catch (e) {
            console.warn('Failed to fetch reputation, returning default 50');
            return 50;
        }
    }
    async getGasPrice() {
        try {
            const res = await axios_1.default.get(`${this.baseUrl}/network/economics`);
            return res.data.gasPrice;
        }
        catch (e) {
            return '1000000000'; // Default
        }
    }
}
exports.McpBridge = McpBridge;
//# sourceMappingURL=mcp_bridge.js.map