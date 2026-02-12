/**
 * OASF (Open Agent Skill Framework) Taxonomy v0.8.0
 * Source: https://github.com/multiversx/mx-8004-explorer/blob/main/src/data/mock/oasf-taxonomy.ts
 *
 * Used by the Explorer to validate agent skill/domain declarations during registration.
 */
export declare const OASF_SCHEMA_VERSION = "0.8.0";
export interface OASFSkillGroup {
    category: string;
    items: string[];
}
export interface OASFDomainGroup {
    category: string;
    items: string[];
}
export interface OASFManifest {
    schemaVersion: string;
    skills: OASFSkillGroup[];
    domains: OASFDomainGroup[];
}
export declare const OASF_SKILLS: OASFSkillGroup[];
export declare const OASF_DOMAINS: OASFDomainGroup[];
export declare function getSkillCategory(skillId: string): string | undefined;
export declare function getDomainCategory(domainId: string): string | undefined;
export declare function getAllSkillIds(): string[];
export declare function getAllDomainIds(): string[];
export declare function validateOASF(manifest: OASFManifest): string[];
