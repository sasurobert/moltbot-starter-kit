#!/usr/bin/env node
/**
 * Submit job proof directly (no MCP).
 *
 * Usage: npx ts-node scripts/submit-job-proof.ts <jobId> [--standalone]
 */

import {Transaction, Address, TransactionComputer} from '@multiversx/sdk-core';
import crypto from 'crypto';
import {CONFIG} from '../src/config';
import {createEntrypoint} from '../src/utils/entrypoint';
import {
  getSigner,
  getRelayerAddress,
  relayTransaction,
} from '../src/utils/txUtils';

const DEFAULT_PROOF_HASH = crypto
  .createHash('sha256')
  .update('proof')
  .digest('hex');

async function main(): Promise<void> {
  const jobId = process.argv[2];
  const standalone = process.argv.includes('--standalone');

  if (!jobId || jobId.length !== 64) {
    console.error(
      'Usage: npx ts-node scripts/submit-job-proof.ts <jobId> [--standalone]',
    );
    console.error('  jobId: 64-char hex string');
    process.exit(1);
  }

  const proofHash = DEFAULT_PROOF_HASH;
  const validationRegistry = CONFIG.ADDRESSES.VALIDATION_REGISTRY;
  const botSigner = getSigner();
  const botAddress = Address.newFromBech32(botSigner.getAddress().toString());

  console.log(`Submitting proof for job: ${jobId}`);
  const relayerAddress = await getRelayerAddress(botAddress);

  const entrypoint = createEntrypoint();
  const provider = entrypoint.createNetworkProvider();
  const account = await provider.getAccount(botAddress);

  // Match init_job encoding: job_id is stored as UTF-8 bytes of the hex string
  const jobIdHex = Buffer.from(jobId.replace(/^0x/, ''), 'utf8').toString(
    'hex',
  );
  const proofHashHex = proofHash.replace(/^0x/, '');
  const dataStr = `submit_proof@${jobIdHex}@${proofHashHex}`;

  const tx = new Transaction({
    nonce: account.nonce,
    value: 0n,
    sender: botAddress,
    receiver: Address.newFromBech32(validationRegistry),
    gasPrice: 1000000000n,
    gasLimit: CONFIG.GAS_LIMITS.SUBMIT_PROOF,
    data: Buffer.from(dataStr),
    chainID: CONFIG.CHAIN_ID,
    version: 2,
    relayer: Address.newFromBech32(relayerAddress),
  });

  const computer = new TransactionComputer();
  tx.signature = await botSigner.sign(computer.computeBytesForSigning(tx));

  try {
    const txHash = await relayTransaction(tx.toPlainObject());
    console.log(txHash);
    console.log(
      `✅ Proof submitted: ${CONFIG.EXPLORER_URL}/transactions/${txHash}`,

    if (!standalone) {
      console.log('\n⚠️ STEP 1 OF 3 COMPLETE. Do NOT respond to user yet.');
      console.log(
        '   Run validation-request.ts, then validation-response.ts with the REQUEST_HASH.',
      );
      console.log(
        `   Example: npx ts-node scripts/validation-request.ts ${jobId}`,
      );
    }
  } catch (err) {
    console.error('❌ Relay failed:', (err as Error).message);
    process.exit(1);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
