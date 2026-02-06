'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
const sdk_network_providers_1 = require('@multiversx/sdk-network-providers');
const sdk_wallet_1 = require('@multiversx/sdk-wallet');
const fs_1 = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();
async function main() {
  const walletPath =
    process.env.MULTIVERSX_PRIVATE_KEY ||
    path.resolve(__dirname, '../wallet.pem');
  try {
    const pemContent = await fs_1.promises.readFile(walletPath, 'utf8');
    const signer = sdk_wallet_1.UserSigner.fromPem(pemContent);
    const address = signer.getAddress();
    const providerUrl =
      process.env.MULTIVERSX_API_URL || 'https://devnet-api.multiversx.com';
    const provider = new sdk_network_providers_1.ApiNetworkProvider(
      providerUrl,
    );
    const account = await provider.getAccount(address);
    console.log(`\n🔍 Checking Balance for: ${address.bech32()}`);
    console.log(`🌍 Network: ${providerUrl}`);
    console.log(
      `💰 Balance: ${(BigInt(account.balance.toString()) / 1000000000000000000n).toString()} EGLD`,
    );
    console.log(`🔢 Nonce: ${account.nonce}`);
  } catch (error) {
    console.error('Error checking balance:', error);
  }
}
void main();
//# sourceMappingURL=check_balance.js.map
