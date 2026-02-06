'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
const sdk_wallet_1 = require('@multiversx/sdk-wallet');
const fs_1 = require('fs');
const path = require('path');
async function main() {
  const walletPath = path.resolve(__dirname, '../wallet.pem');
  // Check if wallet already exists
  try {
    await fs_1.promises.access(walletPath);
    console.log('Wallet already exists at wallet.pem. Skipping generation.');
    return;
  } catch {
    // File doesn't exist, proceed
  }
  console.log('Generating new MultiversX wallet...');
  // Generate Mnemonic
  const mnemonic = sdk_wallet_1.Mnemonic.generate();
  const secretKey = mnemonic.deriveKey(0);
  const signer = new sdk_wallet_1.UserSigner(secretKey);
  const address = signer.getAddress().bech32();
  // Create PEM content
  // SDK expects Base64 encoding of the HEX STRING of the seed + pubkey
  const secretKeyHex = secretKey.hex();
  const pubKeyHex = signer.getAddress().hex();
  const combinedHex = secretKeyHex + pubKeyHex;
  const base64Content = Buffer.from(combinedHex).toString('base64');
  const pemContent = `-----BEGIN PRIVATE KEY for ${address}-----
${base64Content.match(/.{1,64}/g)?.join('\n')}
-----END PRIVATE KEY for ${address}-----`;
  // Save to file
  await fs_1.promises.writeFile(walletPath, pemContent, 'utf8');
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
//# sourceMappingURL=generate_wallet.js.map
