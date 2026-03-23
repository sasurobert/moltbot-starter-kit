#!/usr/bin/env node
"use strict";
/**
 * Submit job proof directly (no MCP).
 *
 * Usage: npx ts-node scripts/submit-job-proof.ts <jobId> [--standalone]
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
const DEFAULT_PROOF_HASH = crypto_1.default
    .createHash('sha256')
    .update('proof')
    .digest('hex');
async function main() {
    const jobId = process.argv[2];
    const standalone = process.argv.includes('--standalone');
    if (!jobId || jobId.length !== 64) {
        console.error('Usage: npx ts-node scripts/submit-job-proof.ts <jobId> [--standalone]');
        console.error('  jobId: 64-char hex string');
        process.exit(1);
    }
    const proofHash = DEFAULT_PROOF_HASH;
    const validationRegistry = config_1.CONFIG.ADDRESSES.VALIDATION_REGISTRY;
    const botSigner = (0, txUtils_1.getSigner)();
    const botAddress = sdk_core_1.Address.newFromBech32(botSigner.getAddress().toString());
    console.log(`Submitting proof for job: ${jobId}`);
    const relayerAddress = await (0, txUtils_1.getRelayerAddress)(botAddress);
    const entrypoint = (0, entrypoint_1.createEntrypoint)();
    const provider = entrypoint.createNetworkProvider();
    const account = await provider.getAccount(botAddress);
    // Match init_job encoding: job_id is stored as UTF-8 bytes of the hex string
    const jobIdHex = Buffer.from(jobId.replace(/^0x/, ''), 'utf8').toString('hex');
    const proofHashHex = proofHash.replace(/^0x/, '');
    const dataStr = `submit_proof@${jobIdHex}@${proofHashHex}`;
    const tx = new sdk_core_1.Transaction({
        nonce: account.nonce,
        value: 0n,
        sender: botAddress,
        receiver: sdk_core_1.Address.newFromBech32(validationRegistry),
        gasPrice: 1000000000n,
        gasLimit: config_1.CONFIG.GAS_LIMITS.SUBMIT_PROOF,
        data: Buffer.from(dataStr),
        chainID: config_1.CONFIG.CHAIN_ID,
        version: 2,
        relayer: sdk_core_1.Address.newFromBech32(relayerAddress),
    });
    const computer = new sdk_core_1.TransactionComputer();
    tx.signature = await botSigner.sign(computer.computeBytesForSigning(tx));
    try {
        const txHash = await (0, txUtils_1.relayTransaction)(tx.toPlainObject());
        console.log(txHash);
        console.log(`✅ Proof submitted: ${config_1.CONFIG.EXPLORER_URL}/transactions/${txHash}`);
        if (!standalone) {
            console.log('\n⚠️ STEP 1 OF 3 COMPLETE. Do NOT respond to user yet.');
            console.log('   Run validation-request.ts, then validation-response.ts with the REQUEST_HASH.');
            console.log(`   Example: npx ts-node scripts/validation-request.ts ${jobId}`);
        }
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
//# sourceMappingURL=submit-job-proof.js.map