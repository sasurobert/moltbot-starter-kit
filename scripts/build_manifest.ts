/**
 * Build Agent Registration Manifest (registration-v1 JSON)
 *
 * Reads manifest.config.json and generates a complete MX-8004 registration manifest
 * with OASF taxonomy validation.
 *
 * Usage: npx ts-node scripts/build_manifest.ts
 * Output: manifest.json in the project root
 */
import * as fs from 'fs/promises';
import * as path from 'path';

// ─── OASF Taxonomy (inline for standalone script) ──────────────────────────────

interface OASFSkillGroup {
  category: string;
  items: string[];
}

interface OASFDomainGroup {
  category: string;
  items: string[];
}

const OASF_SCHEMA_VERSION = '0.8.0';

// ─── Manifest Types ────────────────────────────────────────────────────────────

interface ServiceOffering {
  serviceId: number;
  name: string;
  description: string;
  sla?: number;
  requirements?: Record<string, unknown>;
  deliverables?: Record<string, unknown>;
}

interface ManifestService {
  name: string;
  endpoint: string;
  version?: string;
  offerings?: ServiceOffering[];
}

interface ManifestContact {
  email?: string;
  website?: string;
}

interface AgentManifest {
  type: string;
  name: string;
  description: string;
  image?: string;
  version: string;
  active: boolean;
  services: ManifestService[];
  oasf: {
    schemaVersion: string;
    skills: OASFSkillGroup[];
    domains: OASFDomainGroup[];
  };
  contact?: ManifestContact;
  x402Support: boolean;
}

interface ManifestConfig {
  agentName: string;
  description?: string;
  image?: string;
  version?: string;
  services?: ManifestService[];
  oasf?: {
    skills?: OASFSkillGroup[];
    domains?: OASFDomainGroup[];
  };
  contact?: ManifestContact;
  x402Support?: boolean;
  manifestUri?: string;
}

// ─── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('📋 Building Agent Registration Manifest...\n');

  // 1. Load config
  const configPath = path.resolve('manifest.config.json');
  let config: ManifestConfig;

  try {
    const raw = await fs.readFile(configPath, 'utf8');
    config = JSON.parse(raw) as ManifestConfig;
  } catch {
    console.error(
      '❌ Could not read manifest.config.json. Create one with agent details.',
    );
    console.error(
      '   See: manifest.config.example.json for the expected format.',
    );
    process.exit(1);
  }

  if (!config.agentName) {
    console.error('❌ manifest.config.json must have an "agentName" field.');
    process.exit(1);
  }

  // 2. Build the manifest
  const manifest: AgentManifest = {
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
  const warnings: string[] = [];

  if (manifest.services.length === 0) {
    warnings.push(
      'No services declared. Add at least one service (MCP, A2A, ACP, x402, UCP).',
    );
  }

  if (manifest.oasf.skills.length === 0) {
    warnings.push(
      'No OASF skills declared. Agents without skills are less discoverable.',
    );
  }

  if (manifest.oasf.domains.length === 0) {
    warnings.push(
      'No OASF domains declared. Consider adding at least one domain.',
    );
  }

  const validServiceNames = ['MCP', 'A2A', 'ACP', 'x402', 'UCP'];
  for (const svc of manifest.services) {
    if (!validServiceNames.includes(svc.name)) {
      warnings.push(
        `Unknown service name "${svc.name}". Valid: ${validServiceNames.join(', ')}`,
      );
    }
    if (!svc.endpoint) {
      warnings.push(`Service "${svc.name}" has no endpoint.`);
    }
    if (svc.offerings) {
      for (const offering of svc.offerings) {
        if (!offering.name) {
          warnings.push(
            `Service "${svc.name}" has an offering with serviceId ${offering.serviceId} but no name.`,
          );
        }
        if (!offering.description) {
          warnings.push(
            `Service "${svc.name}" offering "${offering.name || offering.serviceId}" has no description.`,
          );
        }
      }
    }
  }

  // Check for offerings without on-chain service config match
  const hasOfferings = manifest.services.some(
    svc => svc.offerings && svc.offerings.length > 0,
  );
  if (!hasOfferings) {
    warnings.push(
      'No service offerings declared. Consider adding offerings to describe what each on-chain service provides. See: https://github.com/sasurobert/mx-8004/blob/master/docs/specification.md#74-relationship-offerings-vs-on-chain-services',
    );
  }

  // 4. Write manifest.json
  const outputPath = path.resolve('manifest.json');
  const json = JSON.stringify(manifest, null, 2);
  await fs.writeFile(outputPath, json, 'utf8');

  const totalOfferings = manifest.services.reduce(
    (sum, svc) => sum + (svc.offerings?.length ?? 0),
    0,
  );

  console.log(`✅ Manifest written to ${outputPath}`);
  console.log(`   Name: ${manifest.name}`);
  console.log(`   Version: ${manifest.version}`);
  console.log(
    `   Services: ${manifest.services.map(s => s.name).join(', ') || 'none'}`,
  );
  console.log(`   Offerings: ${totalOfferings}`);
  console.log(`   Skills: ${manifest.oasf.skills.length} categories`);
  console.log(`   Domains: ${manifest.oasf.domains.length} categories`);
  console.log(`   x402 Support: ${manifest.x402Support}`);

  if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    for (const w of warnings) {
      console.log(`   - ${w}`);
    }
  }

  console.log(
    '\n📌 Next: Pin to IPFS with: npx ts-node scripts/pin_manifest.ts',
  );
}

main().catch(err => {
  console.error('❌ Failed to build manifest:', err);
  process.exit(1);
});
