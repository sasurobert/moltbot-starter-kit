import {UserSigner} from '@multiversx/sdk-wallet';
import {Transaction, Address, TransactionComputer} from '@multiversx/sdk-core';
import {promises as fs} from 'fs';

// Usage: ts-node sign_x402_relayed.ts <pemPath> <receiver> <value> <nonce> <chainID> <relayerAddress> [data]
// Signs an x402 payment transaction with relayer field set (Relayed V3 compatible).

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 6) {
    console.error(
      'Usage: sign_x402_relayed.ts <pemPath> <receiver> <value> <nonce> <chainID> <relayerAddress> [data]',
    );
    process.exit(1);
  }

  const [pemPath, receiver, value, nonceStr, chainID, relayerAddress, dataStr] =
    args;

  const pemContent = await fs.readFile(pemPath, 'utf8');
  const signer = UserSigner.fromPem(pemContent);
  const sender = signer.getAddress();

  const RELAYED_V3_EXTRA_GAS = 50000n;
  const BASE_GAS_LIMIT = 500000n;

  const tx = new Transaction({
    nonce: BigInt(nonceStr),
    value: BigInt(value),
    receiver: new Address(receiver),
    sender: new Address(sender.bech32()),
    // Relayer field + version 2 are part of the signed payload; both must be
    // set before computeBytesForSigning, or the relayer will reject the tx.
    relayer: new Address(relayerAddress),
    gasPrice: 1000000000n,
    gasLimit: BASE_GAS_LIMIT + RELAYED_V3_EXTRA_GAS,
    data: dataStr ? Buffer.from(dataStr) : undefined,
    chainID: chainID,
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
    gasLimit: Number(BASE_GAS_LIMIT + RELAYED_V3_EXTRA_GAS),
    relayer: relayerAddress,
    validBefore: Math.floor(Date.now() / 1000) + 3600,
  };

  console.log(JSON.stringify(payload));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
