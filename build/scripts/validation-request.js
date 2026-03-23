#!/usr/bin/env node
"use strict";
/**
 * Request third-party validation for a job (ERC-8004 validation_request).
 * Run AFTER submit_proof.
 *
 * Usage: npx ts-node scripts/validation-request.ts <jobId> [validatorAddress]
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
    const jobId = process.argv[2];
    let validatorAddress = process.argv[3] || process.env.VALIDATOR_ADDRESS;
    if (!jobId || jobId.length !== 64) {
        console.error('Usage: npx ts-node scripts/validation-request.ts <jobId> [validatorAddress]');
        console.error('  jobId: 64-char hex string');
        console.error('  validatorAddress: erd1... (optional — uses agent for mock if unset)');
        process.exit(1);
    }
    const agentSigner = (0, txUtils_1.getSigner)();
    const agentAddress = sdk_core_1.Address.newFromBech32(agentSigner.getAddress().toString());
    // VALID_ADDRESS = oracle/validator to request from; when unset, use agent (mock)
    if (!validatorAddress || !validatorAddress.startsWith('erd1')) {
        validatorAddress = agentAddress.toString();
    }
    console.log(`Requesting validation for job: ${jobId}`);
    const relayerAddress = await (0, txUtils_1.getRelayerAddress)(agentAddress);
    const entrypoint = (0, entrypoint_1.createEntrypoint)();
    const provider = entrypoint.createNetworkProvider();
    const account = await provider.getAccount(agentAddress);
    // Encoding: job_id is UTF-8 bytes (same as submit_proof)
    const jobIdHex = Buffer.from(jobId.replace(/^0x/, ''), 'utf8').toString('hex');
    const validatorAddr = sdk_core_1.Address.newFromBech32(validatorAddress);
    const validatorHex = Buffer.from(validatorAddr.getPublicKey()).toString('hex');
    const requestUri = `job:${jobId}`;
    const requestUriHex = Buffer.from(requestUri, 'utf8').toString('hex');
    const requestHash = crypto_1.default
        .createHash('sha256')
        .update(requestUri + jobId)
        .digest('hex');
    const dataStr = `validation_request@${jobIdHex}@${validatorHex}@${requestUriHex}@${requestHash}`;
    const tx = new sdk_core_1.Transaction({
        nonce: account.nonce,
        value: 0n,
        sender: agentAddress,
        receiver: sdk_core_1.Address.newFromBech32(config_1.CONFIG.ADDRESSES.VALIDATION_REGISTRY),
        gasPrice: 1000000000n,
        gasLimit: config_1.CONFIG.GAS_LIMITS.SUBMIT_PROOF, // Reusing similar gas limit
        data: Buffer.from(dataStr),
        chainID: config_1.CONFIG.CHAIN_ID,
        version: 2,
        relayer: sdk_core_1.Address.newFromBech32(relayerAddress),
    });
    const computer = new sdk_core_1.TransactionComputer();
    tx.signature = await agentSigner.sign(computer.computeBytesForSigning(tx));
    try {
        const txHash = await (0, txUtils_1.relayTransaction)(tx.toPlainObject());
        console.log(txHash);
        console.log(`REQUEST_HASH=${requestHash}`);
        console.log(`✅ Validation request sent: ${config_1.CONFIG.EXPLORER_URL}/transactions/${txHash}`);
        console.log('\n⚠️ STEP 2 OF 3 COMPLETE. Run validation-response.ts NOW before responding to user:');
        console.log(`   npx ts-node scripts/validation-response.ts ${requestHash} 100`);
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
//# sourceMappingURL=validation-request.js.map