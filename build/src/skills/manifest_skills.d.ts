/**
 * Manifest Builder Skill — generates MX-8004 registration-v1 manifests
 *
 * Pure logic, no blockchain interaction.
 * Validates OASF skills/domains against the official taxonomy.
 */
import { type OASFSkillGroup, type OASFDomainGroup } from './oasf_taxonomy';
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
/**
 * Build a registration-v1 manifest from config.
 * Throws if OASF validation fails.
 */
export declare function buildManifest(config: ManifestConfig): AgentManifest;
/**
 * Build manifest and return as formatted JSON string.
 */
export declare function buildManifestJSON(config: ManifestConfig): string;
