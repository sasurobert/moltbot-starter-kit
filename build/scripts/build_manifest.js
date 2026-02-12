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
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Build Agent Registration Manifest (registration-v1 JSON)
 *
 * Reads config.json and generates a complete MX-8004 registration manifest
 * with OASF taxonomy validation.
 *
 * Usage: npx ts-node scripts/build_manifest.ts
 * Output: manifest.json in the project root
 */
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const OASF_SCHEMA_VERSION = '0.8.0';
// ─── Main ──────────────────────────────────────────────────────────────────────
async function main() {
    console.log('📋 Building Agent Registration Manifest...\n');
    // 1. Load config
    const configPath = path.resolve('config.json');
    let config;
    try {
        const raw = await fs.readFile(configPath, 'utf8');
        config = JSON.parse(raw);
    }
    catch {
        console.error('❌ Could not read config.json. Create one with agent details.');
        console.error('   See: SKILL.md → Agent Registration Manifest');
        process.exit(1);
    }
    if (!config.agentName) {
        console.error('❌ config.json must have an "agentName" field.');
        process.exit(1);
    }
    // 2. Build the manifest
    const manifest = {
        type: 'https://multiversx.com/standards/mx-8004#registration-v1',
        name: config.agentName,
        description: config.description || `${config.agentName} — MultiversX Agent`,
        image: config.image || undefined,
        version: config.version || '1.0.0',
        active: true,
        services: config.services || [],
        oasf: {
            schemaVersion: OASF_SCHEMA_VERSION,
            skills: config.oasf?.skills || [],
            domains: config.oasf?.domains || [],
        },
        contact: config.contact,
        x402Support: config.x402Support ?? true,
    };
    // 3. Validate
    const warnings = [];
    if (manifest.services.length === 0) {
        warnings.push('No services declared. Add at least one service (MCP, A2A, ACP, x402, UCP).');
    }
    if (manifest.oasf.skills.length === 0) {
        warnings.push('No OASF skills declared. Agents without skills are less discoverable.');
    }
    if (manifest.oasf.domains.length === 0) {
        warnings.push('No OASF domains declared. Consider adding at least one domain.');
    }
    const validServiceNames = ['MCP', 'A2A', 'ACP', 'x402', 'UCP'];
    for (const svc of manifest.services) {
        if (!validServiceNames.includes(svc.name)) {
            warnings.push(`Unknown service name "${svc.name}". Valid: ${validServiceNames.join(', ')}`);
        }
        if (!svc.endpoint) {
            warnings.push(`Service "${svc.name}" has no endpoint.`);
        }
    }
    // 4. Write manifest.json
    const outputPath = path.resolve('manifest.json');
    const json = JSON.stringify(manifest, null, 2);
    await fs.writeFile(outputPath, json, 'utf8');
    console.log(`✅ Manifest written to ${outputPath}`);
    console.log(`   Name: ${manifest.name}`);
    console.log(`   Version: ${manifest.version}`);
    console.log(`   Services: ${manifest.services.map((s) => s.name).join(', ') || 'none'}`);
    console.log(`   Skills: ${manifest.oasf.skills.length} categories`);
    console.log(`   Domains: ${manifest.oasf.domains.length} categories`);
    console.log(`   x402 Support: ${manifest.x402Support}`);
    if (warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        for (const w of warnings) {
            console.log(`   - ${w}`);
        }
    }
    console.log('\n📌 Next: Pin to IPFS with: npx ts-node scripts/pin_manifest.ts');
}
main().catch((err) => {
    console.error('❌ Failed to build manifest:', err);
    process.exit(1);
});
//# sourceMappingURL=build_manifest.js.map