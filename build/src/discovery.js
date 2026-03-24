"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentDiscovery = void 0;
const axios_1 = __importDefault(require("axios"));
const logger_1 = require("./utils/logger");
class AgentDiscovery {
    logger = new logger_1.Logger('AgentDiscovery');
    async getPaymentInfo(agentUrl, endpointPath) {
        try {
            this.logger.info(`Fetching discovery document from ${agentUrl}/openapi.json...`);
            const res = await axios_1.default.get(`${agentUrl}/openapi.json`);
            const openapi = res.data;
            this.logger.info(`Discovered Service: ${openapi.info?.title}`);
            let paymentInfo = null;
            if (endpointPath && openapi.paths && openapi.paths[endpointPath]) {
                const methods = Object.keys(openapi.paths[endpointPath]);
                if (methods.length > 0) {
                    const method = methods[0];
                    paymentInfo = openapi.paths[endpointPath][method]['x-payment-info'];
                }
            }
            if (!paymentInfo &&
                openapi['x-service-info'] &&
                openapi['x-service-info'].defaultPayment) {
                paymentInfo = openapi['x-service-info'].defaultPayment;
            }
            if (paymentInfo) {
                this.logger.info(`Payment required: ${paymentInfo.amount} ${paymentInfo.currency} (${paymentInfo.intent})`);
            }
            else {
                this.logger.info(`No payment info found for ${endpointPath || 'service'}`);
            }
            return paymentInfo;
        }
        catch (e) {
            this.logger.warn(`Failed to discover agent payment info: ${e.message}`);
            return null;
        }
    }
    async negotiateSession(agentUrl, paymentInfo) {
        this.logger.info(`Negotiating ${paymentInfo.intent} with ${agentUrl} for ${paymentInfo.amount} ${paymentInfo.currency}...`);
        // In a real scenario, this would use UserSigner to broadcast an EGLD/ESDT transfer
        // and return the transaction hash as the proof of payment.
        // For this starter kit, we simulate the negotiation and return a mock proof.
        const mockTxHash = 'mock_tx_' + Date.now().toString(16);
        this.logger.info(`Session negotiated. Proof: ${mockTxHash}`);
        return mockTxHash;
    }
}
exports.AgentDiscovery = AgentDiscovery;
//# sourceMappingURL=discovery.js.map