import {Mnemonic, UserSigner} from '@multiversx/sdk-wallet';
import {promises as fs} from 'fs';
import * as path from 'path';

async function main() {
  const walletPath = path.resolve(__dirname, '../wallet.pem');

  try {
    await fs.access(walletPath);
    console.log('Wallet already exists at wallet.pem. Skipping generation.');
    return;
  } catch {
    // wallet doesn't exist — proceed with generation
  }

  console.log('Generating new MultiversX wallet...');

  const mnemonic = Mnemonic.generate();
  const secretKey = mnemonic.deriveKey(0);
  const signer = new UserSigner(secretKey);
  const address = signer.getAddress().bech32();

  // SDK PEM format: base64 of the hex-encoded (seed || pubkey) string.
  const secretKeyHex = secretKey.hex();
  const pubKeyHex = signer.getAddress().hex();
  const combinedHex = secretKeyHex + pubKeyHex;
  const base64Content = Buffer.from(combinedHex).toString('base64');

  const pemContent = `-----BEGIN PRIVATE KEY for ${address}-----
${base64Content.match(/.{1,64}/g)?.join('\n')}
-----END PRIVATE KEY for ${address}-----`;

  await fs.writeFile(walletPath, pemContent, 'utf8');

  console.log('\n✅ Wallet generated successfully!');
  console.log(`📍 Location: ${walletPath}`);
  console.log(`ADDERSS: ${address}`);
  console.log(
    '\n⚠️  IMPORTANT: SAVE THESE WORDS SECURELY (This is your only backup):',
  );
  console.log(
    '------------------------------------------------------------------',
  );
  console.log(mnemonic.getWords().join(' '));
  console.log(
    '------------------------------------------------------------------\n',
  );
}

main().catch(err => {
  console.error('Failed to generate wallet:', err);
  process.exit(1);
});
