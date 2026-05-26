import {UserSigner} from '@multiversx/sdk-wallet';
import {Transaction, Address, TransactionComputer} from '@multiversx/sdk-core';
import {promises as fs} from 'fs';

// Usage: ts-node sign_x402.ts <pemPath> <receiver> <value> <nonce> <chainID> [data]

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 5) {
    console.error(
      'Usage: sign_x402.ts <pemPath> <receiver> <value> <nonce> <chainID> [data]',
    );
    process.exit(1);
  }

  const [pemPath, receiver, value, nonceStr, chainID, dataStr] = args;

  const pemContent = await fs.readFile(pemPath, 'utf8');
  const signer = UserSigner.fromPem(pemContent);
  const sender = signer.getAddress();

  // These constants must match the construction in the facilitator's
  // Settler.ts byte-for-byte; mismatches invalidate the signature.
  const tx = new Transaction({
    nonce: BigInt(nonceStr),
    value: BigInt(value),
    receiver: new Address(receiver),
    sender: new Address(sender.bech32()),
    gasPrice: 1000000000n,
    gasLimit: 500000n,
    data: dataStr ? Buffer.from(dataStr) : undefined,
    chainID: chainID,
    // version 2 keeps the payload compatible with Relayed V3 if a relayer
    // later wraps it.
    version: 2,
  });

  const computer = new TransactionComputer();
  const serialized = computer.computeBytesForSigning(tx);
  const signature = await signer.sign(serialized);
  tx.signature = signature;

  const payload = {
    sender: sender.bech32(),
    receiver: receiver,
    value: value,
    nonce: parseInt(nonceStr),
    data: dataStr,
    signature: signature.toString('hex'),
    chainID: chainID,
    version: 2,
    options: 0,
    gasPrice: 1000000000,
    gasLimit: 500000,
    validBefore: Math.floor(Date.now() / 1000) + 3600,
  };

  console.log(JSON.stringify(payload));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
