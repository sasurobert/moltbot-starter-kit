'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
const sdk_wallet_1 = require('@multiversx/sdk-wallet');
const sdk_core_1 = require('@multiversx/sdk-core');
const sdk_network_providers_1 = require('@multiversx/sdk-network-providers');
const fs_1 = require('fs');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config();
async function main() {
  console.log('🚀 Starting Manifest Update...');
  const txComputer = new sdk_core_1.TransactionComputer();
  // 1. Setup Provider & Signer
  const providerUrl =
    process.env.MULTIVERSX_API_URL || 'https://devnet-api.multiversx.com';
  const provider = new sdk_network_providers_1.ApiNetworkProvider(providerUrl);
  const pemPath =
    process.env.MULTIVERSX_PRIVATE_KEY || path.resolve('wallet.pem');
  let pemContent = '';
  try {
    pemContent = await fs_1.promises.readFile(pemPath, 'utf8');
  } catch {
    console.error('❌ Wallet not found at wallet.pem. Run setup.sh first.');
    process.exit(1);
  }
  const signer = sdk_wallet_1.UserSigner.fromPem(pemContent);
  const senderAddress = new sdk_core_1.Address(signer.getAddress().bech32());
  // 2. Load Config to get new details
  const configPath = path.resolve('config.json');
  const config = JSON.parse(await fs_1.promises.readFile(configPath, 'utf8'));
  console.log(`Updating Agent: ${config.agentName}`);
  console.log('New Capabilities:', config.capabilities);
  // 3. Construct Transaction with ALL 3 required arguments
  // Contract signature: update_agent(nonce, new_uri, new_public_key)
  const registryAddress = process.env.IDENTITY_REGISTRY_ADDRESS;
  if (!registryAddress) {
    console.error('❌ IDENTITY_REGISTRY_ADDRESS not set in .env');
    process.exit(1);
  }
  const account = await provider.getAccount({
    bech32: () => senderAddress.toBech32(),
  });
  // Argument 1: Agent Nonce (NFT token nonce)
  if (!config.nonce || config.nonce === 0) {
    console.error('❌ Agent nonce not found in config.json. Register first.');
    process.exit(1);
  }
  const nonceHex = BigInt(config.nonce).toString(16).padStart(2, '0');
  // Argument 2: New URI - points to updated manifest/ARF JSON
  const newUri =
    config.manifestUri || `https://agent.molt.bot/${config.agentName}`;
  const uriHex = Buffer.from(newUri).toString('hex');
  // Argument 3: New Public Key - can keep same or update
  // Default to current signer's public key
  const publicKeyHex = senderAddress.toHex();
  // Argument 4: Metadata (optional)
  let metadataHex = '';
  if (config.metadata && config.metadata.length > 0) {
    for (const entry of config.metadata) {
      const keyHex = Buffer.from(entry.key).toString('hex');
      const valueHex = Buffer.from(entry.value).toString('hex');
      metadataHex += `@${keyHex}@${valueHex}`;
    }
  }
  console.log(`Updating Agent Nonce: ${config.nonce}`);
  console.log(`New URI: ${newUri}`);
  if (config.metadata?.length > 0)
    console.log(`New Metadata: ${config.metadata.length} entries`);
  // Format: update_agent@<nonceHex>@<uriHex>@<publicKeyHex>[@<key1Hex>@<value1Hex>...]
  const data = Buffer.from(
    `update_agent@${nonceHex}@${uriHex}@${publicKeyHex}${metadataHex}`,
  );
  const tx = new sdk_core_1.Transaction({
    nonce: BigInt(account.nonce),
    value: 0n,
    receiver: new sdk_core_1.Address(registryAddress),
    gasLimit: 10000000n,
    chainID: process.env.MULTIVERSX_CHAIN_ID || 'D',
    data: data,
    sender: senderAddress,
  });
  // 4. Sign
  // 4. Sign
  const serialized = txComputer.computeBytesForSigning(tx);
  const signature = await signer.sign(serialized);
  tx.signature = signature;
  console.log('Transaction Signed. Broadcasting...');
  // 5. Broadcast
  try {
    const txHash = await provider.sendTransaction(tx);
    console.log(`✅ Update Transaction Sent: ${txHash}`);
    console.log(
      `Check Explorer: https://devnet-explorer.multiversx.com/transactions/${txHash}`,
    );
  } catch (e) {
    console.error('Failed to broadcast update:', e.message);
  }
}
main().catch(console.error);
//# sourceMappingURL=update_manifest.js.map
