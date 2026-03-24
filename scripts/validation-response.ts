#!/usr/bin/env node
/**
 * Validator/oracle responds to a validation request (ERC-8004 validation_response).
 *
 * Usage: npx ts-node scripts/validation-response.ts <requestHash> <score> [responseUri] [tag]
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

async function main(): Promise<void> {
  const requestHash = process.argv[2];
  const score = parseInt(process.argv[3], 10);
  const responseUri = process.argv[4] || 'validated';
  const tag = process.argv[5] || 'v1';

  if (!requestHash || requestHash.length !== 64) {
    console.error(
      'Usage: npx ts-node scripts/validation-response.ts <requestHash> <score> [responseUri] [tag]',
    );
    console.error(
      '  requestHash: 64-char hex (from validation_request output)',
    );
    console.error('  score: 0-100');
    process.exit(1);
  }

  if (isNaN(score) || score < 0 || score > 100) {
    console.error('Score must be 0-100');
    process.exit(1);
  }

  // Uses custom validtor/oracle PEM if set, otherwise falls back to bot signer for mock
  const validatorSigner = getSigner(process.env.VALIDATOR_PEM_PATH);
  const validatorAddress = Address.newFromBech32(
    validatorSigner.getAddress().toString(),
  );

  console.log(
    `Responding to validation request: ${requestHash} with score: ${score}`,
  );
  const relayerAddress = await getRelayerAddress(validatorAddress);

  const entrypoint = createEntrypoint();
  const provider = entrypoint.createNetworkProvider();
  const account = await provider.getAccount(validatorAddress);

  const requestHashHex = requestHash.replace(/^0x/, '');
  const scoreHex = score.toString(16).padStart(2, '0');
  const responseUriHex = Buffer.from(responseUri, 'utf8').toString('hex');

  const responseHash = crypto
    .createHash('sha256')
    .update(responseUri + score.toString())
    .digest('hex');
  const tagHex = Buffer.from(tag, 'utf8').toString('hex');

  const dataStr = `validation_response@${requestHashHex}@${scoreHex}@${responseUriHex}@${responseHash}@${tagHex}`;

  const tx = new Transaction({
    nonce: account.nonce,
    value: 0n,
    sender: validatorAddress,
    receiver: Address.newFromBech32(CONFIG.ADDRESSES.VALIDATION_REGISTRY),
    gasPrice: 1000000000n,
    gasLimit: CONFIG.GAS_LIMITS.SUBMIT_PROOF, // Reusing similar gas limit
    data: Buffer.from(dataStr),
    chainID: CONFIG.CHAIN_ID,
    version: 2,
    relayer: Address.newFromBech32(relayerAddress),
  });

  const computer = new TransactionComputer();
  tx.signature = await validatorSigner.sign(
    computer.computeBytesForSigning(tx),
  );

  try {
    const txHash = await relayTransaction(tx.toPlainObject());
    console.log(txHash);
    console.log(
      `✅ Validation response sent (score: ${score}): ${CONFIG.EXPLORER_URL}/transactions/${txHash}`,
    );

    console.log(
      '\n✅ FLOW COMPLETE (3/3). Proof submitted and validated on-chain.',
    );
  } catch (err) {
    console.error('❌ Relay failed:', (err as Error).message);
    process.exit(1);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
