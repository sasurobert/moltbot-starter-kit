"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildManifest = buildManifest;
exports.buildManifestJSON = buildManifestJSON;
/**
 * Manifest Builder Skill — generates MX-8004 registration-v1 manifests
 *
 * Pure logic, no blockchain interaction.
 * Validates OASF skills/domains against the official taxonomy.
 */
const oasf_taxonomy_1 = require("./oasf_taxonomy");
// ─── Build ─────────────────────────────────────────────────────────────────────
/**
 * Build a registration-v1 manifest from config.
 * Throws if OASF validation fails.
 */
function buildManifest(config) {
    const skills = config.skills ?? [];
    const domains = config.domains ?? [];
    // Validate OASF
    const errors = (0, oasf_taxonomy_1.validateOASF)({
        schemaVersion: oasf_taxonomy_1.OASF_SCHEMA_VERSION,
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
            schemaVersion: oasf_taxonomy_1.OASF_SCHEMA_VERSION,
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
function buildManifestJSON(config) {
    return JSON.stringify(buildManifest(config), null, 2);
}
//# sourceMappingURL=manifest_skills.js.map