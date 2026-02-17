/**
 * Pin Agent Manifest to IPFS via Pinata
 *
 * Reads manifest.json and pins it to IPFS using Pinata's API.
 * Returns the ipfs:// URI to use in register_agent.
 *
 * Usage: npx ts-node scripts/pin_manifest.ts
 * Requires: PINATA_API_KEY and PINATA_SECRET in .env
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import axios from 'axios';
import * as dotenv from 'dotenv';
dotenv.config();

// ─── Types ─────────────────────────────────────────────────────────────────────

interface PinataResponse {
  IpfsHash: string;
  PinSize: number;
  Timestamp: string;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('📌 Pinning Agent Manifest to IPFS...\n');

  // 1. Check Pinata credentials
  const apiKey = process.env.PINATA_API_KEY;
  const apiSecret = process.env.PINATA_SECRET;

  if (!apiKey || !apiSecret) {
    console.error('❌ PINATA_API_KEY and PINATA_SECRET must be set in .env');
    console.error('   Sign up at https://app.pinata.cloud/ to get API keys.');
    process.exit(1);
  }

  // 2. Read manifest.json
  const manifestPath = path.resolve('manifest.json');
  let manifestContent: string;

  try {
    manifestContent = await fs.readFile(manifestPath, 'utf8');
  } catch {
    console.error(
      '❌ manifest.json not found. Run "npx ts-node scripts/build_manifest.ts" first.',
    );
    process.exit(1);
  }

  const manifest = JSON.parse(manifestContent);

  // 3. Pin to Pinata
  console.log(`📤 Uploading manifest for "${manifest.name}"...`);

  try {
    const response = await axios.post<PinataResponse>(
      'https://api.pinata.cloud/pinning/pinJSONToIPFS',
      {
        pinataContent: manifest,
        pinataMetadata: {
          name: `${manifest.name}-manifest-v${manifest.version}`,
          keyvalues: {
            type: 'mx-8004-registration',
            agent: manifest.name,
            version: manifest.version,
          },
        },
        pinataOptions: {
          cidVersion: 1,
        },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          pinata_api_key: apiKey,
          pinata_secret_api_key: apiSecret,
        },
        timeout: 30000,
      },
    );

    const ipfsHash = response.data.IpfsHash;
    const ipfsUri = `ipfs://${ipfsHash}`;
    const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;

    console.log('\n✅ Manifest pinned successfully!');
    console.log(`   IPFS Hash: ${ipfsHash}`);
    console.log(`   IPFS URI:  ${ipfsUri}`);
    console.log(`   Gateway:   ${gatewayUrl}`);
    console.log(`   Pin Size:  ${response.data.PinSize} bytes`);

    // 4. Update agent.config.json with the gateway URL
    const configPath = path.resolve('agent.config.json');
    try {
      const configRaw = await fs.readFile(configPath, 'utf8');
      const config = JSON.parse(configRaw);
      config.manifestUri = gatewayUrl;
      await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
      console.log(
        `\n📝 Updated agent.config.json with manifestUri: ${gatewayUrl}`,
      );
    } catch {
      console.log(
        `\n⚠️  Could not update agent.config.json. Manually set manifestUri to: ${gatewayUrl}`,
      );
    }
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        '❌ Pinata API error:',
        error.response?.data || error.message,
      );
    } else {
      console.error('❌ Failed to pin manifest:', error);
    }
    process.exit(1);
  }
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
