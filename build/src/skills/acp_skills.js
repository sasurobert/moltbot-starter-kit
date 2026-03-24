"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.browseAcpProducts = browseAcpProducts;
exports.checkoutAcpProduct = checkoutAcpProduct;
const axios_1 = __importDefault(require("axios"));
async function browseAcpProducts(agentUrl) {
    try {
        const url = new URL('/.well-known/acp/products.json', agentUrl).toString();
        const response = await axios_1.default.get(url);
        return response.data?.products || [];
    }
    catch (err) {
        return [];
    }
}
async function checkoutAcpProduct(agentUrl, productId, buyerAddress) {
    try {
        const url = new URL('/acp/checkout', agentUrl).toString();
        const response = await axios_1.default.post(url, { productId, buyerAddress });
        return response.data;
    }
    catch (err) {
        return null;
    }
}
//# sourceMappingURL=acp_skills.js.map