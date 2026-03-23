#!/usr/bin/env node
"use strict";
/**
 * Validator/oracle responds to a validation request (ERC-8004 validation_response).
 *
 * Usage: npx ts-node scripts/validation-response.ts <requestHash> <score> [responseUri] [tag]
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_core_1 = require("@multiversx/sdk-core");
const crypto_1 = __importDefault(require("crypto"));
const config_1 = require("../src/config");
const entrypoint_1 = require("../src/utils/entrypoint");
const txUtils_1 = require("../src/utils/txUtils");
async function main() {
    const requestHash = process.argv[2];
    const score = parseInt(process.argv[3], 10);
    const responseUri = process.argv[4] || 'validated';
    const tag = process.argv[5] || 'v1';
    if (!requestHash || requestHash.length !== 64) {
        console.error('Usage: npx ts-node scripts/validation-response.ts <requestHash> <score> [responseUri] [tag]');
        console.error('  requestHash: 64-char hex (from validation_request output)');
        console.error('  score: 0-100');
        process.exit(1);
    }
    if (isNaN(score) || score < 0 || score > 100) {
        console.error('Score must be 0-100');
        process.exit(1);
    }
    // Uses custom validtor/oracle PEM if set, otherwise falls back to bot signer for mock
    const validatorSigner = (0, txUtils_1.getSigner)(process.env.VALIDATOR_PEM_PATH);
    const validatorAddress = sdk_core_1.Address.newFromBech32(validatorSigner.getAddress().toString());
    console.log(`Responding to validation request: ${requestHash} with score: ${score}`);
    const relayerAddress = await (0, txUtils_1.getRelayerAddress)(validatorAddress);
    const entrypoint = (0, entrypoint_1.createEntrypoint)();
    const provider = entrypoint.createNetworkProvider();
    const account = await provider.getAccount(validatorAddress);
    const requestHashHex = requestHash.replace(/^0x/, '');
    const scoreHex = score.toString(16).padStart(2, '0');
    const responseUriHex = Buffer.from(responseUri, 'utf8').toString('hex');
    const responseHash = crypto_1.default
        .createHash('sha256')
        .update(responseUri + score.toString())
        .digest('hex');
    const tagHex = Buffer.from(tag, 'utf8').toString('hex');
    const dataStr = `validation_response@${requestHashHex}@${scoreHex}@${responseUriHex}@${responseHash}@${tagHex}`;
    const tx = new sdk_core_1.Transaction({
        nonce: account.nonce,
        value: 0n,
        sender: validatorAddress,
        receiver: sdk_core_1.Address.newFromBech32(config_1.CONFIG.ADDRESSES.VALIDATION_REGISTRY),
        gasPrice: 1000000000n,
        gasLimit: config_1.CONFIG.GAS_LIMITS.SUBMIT_PROOF, // Reusing similar gas limit
        data: Buffer.from(dataStr),
        chainID: config_1.CONFIG.CHAIN_ID,
        version: 2,
        relayer: sdk_core_1.Address.newFromBech32(relayerAddress),
    });
    const computer = new sdk_core_1.TransactionComputer();
    tx.signature = await validatorSigner.sign(computer.computeBytesForSigning(tx));
    try {
        const txHash = await (0, txUtils_1.relayTransaction)(tx.toPlainObject());
        console.log(txHash);
        console.log(`✅ Validation response sent (score: ${score}): ${config_1.CONFIG.EXPLORER_URL}/transactions/${txHash}`);
        console.log('\n✅ FLOW COMPLETE (3/3). Proof submitted and validated on-chain.');
    }
    catch (err) {
        console.error('❌ Relay failed:', err.message);
        process.exit(1);
    }
}
main().catch(e => {
    console.error(e);
    process.exit(1);
});
//# sourceMappingURL=validation-response.js.map