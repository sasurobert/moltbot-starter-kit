/**
 * Manifest Builder Skill — generates MX-8004 registration-v1 manifests
 *
 * Pure logic, no blockchain interaction.
 * Validates OASF skills/domains against the official taxonomy.
 */
import {
  OASF_SCHEMA_VERSION,
  validateOASF,
  type OASFSkillGroup,
  type OASFDomainGroup,
} from './oasf_taxonomy';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface ManifestService {
  name: string;
  endpoint: string;
  version?: string;
}

export interface ManifestContact {
  email?: string;
  website?: string;
}

export interface ManifestConfig {
  name: string;
  description: string;
  image?: string;
  version?: string;
  services?: ManifestService[];
  skills?: OASFSkillGroup[];
  domains?: OASFDomainGroup[];
  contact?: ManifestContact;
  x402Support?: boolean;
}

export interface AgentManifest {
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

// ─── Build ─────────────────────────────────────────────────────────────────────

/**
 * Build a registration-v1 manifest from config.
 * Throws if OASF validation fails.
 */
export function buildManifest(config: ManifestConfig): AgentManifest {
  const skills = config.skills ?? [];
  const domains = config.domains ?? [];

  // Validate OASF
  const errors = validateOASF({
    schemaVersion: OASF_SCHEMA_VERSION,
    skills,
    domains,
  });
  if (errors.length > 0) {
    throw new Error(`OASF validation failed:\n${errors.join('\n')}`);
  }

  return {
    type: 'https://multiversx.com/standards/mx-8004#registration-v1',
    name: config.name,
    description: config.description,
    image: config.image,
    version: config.version ?? '1.0.0',
    active: true,
    services: config.services ?? [],
    oasf: {
      schemaVersion: OASF_SCHEMA_VERSION,
      skills,
      domains,
    },
    contact: config.contact,
    x402Support: config.x402Support ?? true,
  };
}

/**
 * Build manifest and return as formatted JSON string.
 */
export function buildManifestJSON(config: ManifestConfig): string {
  return JSON.stringify(buildManifest(config), null, 2);
}
