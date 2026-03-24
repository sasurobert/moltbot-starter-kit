"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseX402Header = parseX402Header;
exports.createX402SignatureHeader = createX402SignatureHeader;
function parseX402Header(header) {
    // Format: x402 address="bech32", amount="1000", token="USDC-123"
    if (!header.toLowerCase().startsWith('x402'))
        return null;
    const addressMatch = header.match(/address="([^"]+)"/);
    const amountMatch = header.match(/amount="([^"]+)"/);
    const tokenMatch = header.match(/token="([^"]+)"/);
    if (!addressMatch || !amountMatch)
        return null;
    return {
        receiver: addressMatch[1],
        amount: amountMatch[1],
        token: tokenMatch ? tokenMatch[1] : undefined,
    };
}
async function createX402SignatureHeader(signer, txHash) {
    const signatureConfig = await signer.sign(Buffer.from(txHash));
    return `Signature tx="${txHash}", sig="${signatureConfig.toString('hex')}"`;
}
//# sourceMappingURL=x402_skills.js.map