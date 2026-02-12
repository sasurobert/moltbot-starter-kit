"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Pin Agent Manifest to IPFS via Pinata
 *
 * Reads manifest.json and pins it to IPFS using Pinata's API.
 * Returns the ipfs:// URI to use in register_agent.
 *
 * Usage: npx ts-node scripts/pin_manifest.ts
 * Requires: PINATA_API_KEY and PINATA_SECRET in .env
 */
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const axios_1 = __importDefault(require("axios"));
// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
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
    let manifestContent;
    try {
        manifestContent = await fs.readFile(manifestPath, 'utf8');
    }
    catch {
        console.error('❌ manifest.json not found. Run "npx ts-node scripts/build_manifest.ts" first.');
        process.exit(1);
    }
    const manifest = JSON.parse(manifestContent);
    // 3. Pin to Pinata
    console.log(`📤 Uploading manifest for "${manifest.name}"...`);
    try {
        const response = await axios_1.default.post('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
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
        }, {
            headers: {
                'Content-Type': 'application/json',
                pinata_api_key: apiKey,
                pinata_secret_api_key: apiSecret,
            },
            timeout: 30000,
        });
        const ipfsHash = response.data.IpfsHash;
        const ipfsUri = `ipfs://${ipfsHash}`;
        const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
        console.log('\n✅ Manifest pinned successfully!');
        console.log(`   IPFS Hash: ${ipfsHash}`);
        console.log(`   IPFS URI:  ${ipfsUri}`);
        console.log(`   Gateway:   ${gatewayUrl}`);
        console.log(`   Pin Size:  ${response.data.PinSize} bytes`);
        // 4. Update agent.config.json with the manifest URI
        const configPath = path.resolve('agent.config.json');
        try {
            const configRaw = await fs.readFile(configPath, 'utf8');
            const config = JSON.parse(configRaw);
            config.manifestUri = ipfsUri;
            await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf8');
            console.log(`\n📝 Updated agent.config.json with manifestUri: ${ipfsUri}`);
        }
        catch {
            console.log(`\n⚠️  Could not update agent.config.json. Manually set manifestUri to: ${ipfsUri}`);
        }
        console.log('\n🚀 Next: Register your agent with: npx ts-node scripts/register.ts');
    }
    catch (error) {
        if (axios_1.default.isAxiosError(error)) {
            console.error('❌ Pinata API error:', error.response?.data || error.message);
        }
        else {
            console.error('❌ Failed to pin manifest:', error);
        }
        process.exit(1);
    }
}
main().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
});
//# sourceMappingURL=pin_manifest.js.map