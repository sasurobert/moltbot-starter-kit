"use strict";
/**
 * Barrel export for all skills
 *
 * Import everything from one place:
 *   import { registerAgent, getBalance, buildManifest } from './skills';
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateOASF = exports.getAllDomainIds = exports.getAllSkillIds = exports.getDomainCategory = exports.getSkillCategory = exports.OASF_DOMAINS = exports.OASF_SKILLS = exports.OASF_SCHEMA_VERSION = exports.buildManifestJSON = exports.buildManifest = exports.hireAgent = exports.getBalance = exports.discoverAgents = exports.multiTransfer = exports.transfer = exports.getEscrow = exports.refund = exports.release = exports.deposit = exports.getReputation = exports.submitFeedback = exports.getJobData = exports.isJobVerified = exports.submitProof = exports.initJob = exports.setMetadata = exports.getAgent = exports.registerAgent = void 0;
// Identity
var identity_skills_1 = require("./identity_skills");
Object.defineProperty(exports, "registerAgent", { enumerable: true, get: function () { return identity_skills_1.registerAgent; } });
Object.defineProperty(exports, "getAgent", { enumerable: true, get: function () { return identity_skills_1.getAgent; } });
Object.defineProperty(exports, "setMetadata", { enumerable: true, get: function () { return identity_skills_1.setMetadata; } });
// Validation
var validation_skills_1 = require("./validation_skills");
Object.defineProperty(exports, "initJob", { enumerable: true, get: function () { return validation_skills_1.initJob; } });
Object.defineProperty(exports, "submitProof", { enumerable: true, get: function () { return validation_skills_1.submitProof; } });
Object.defineProperty(exports, "isJobVerified", { enumerable: true, get: function () { return validation_skills_1.isJobVerified; } });
Object.defineProperty(exports, "getJobData", { enumerable: true, get: function () { return validation_skills_1.getJobData; } });
// Reputation
var reputation_skills_1 = require("./reputation_skills");
Object.defineProperty(exports, "submitFeedback", { enumerable: true, get: function () { return reputation_skills_1.submitFeedback; } });
Object.defineProperty(exports, "getReputation", { enumerable: true, get: function () { return reputation_skills_1.getReputation; } });
// Escrow
var escrow_skills_1 = require("./escrow_skills");
Object.defineProperty(exports, "deposit", { enumerable: true, get: function () { return escrow_skills_1.deposit; } });
Object.defineProperty(exports, "release", { enumerable: true, get: function () { return escrow_skills_1.release; } });
Object.defineProperty(exports, "refund", { enumerable: true, get: function () { return escrow_skills_1.refund; } });
Object.defineProperty(exports, "getEscrow", { enumerable: true, get: function () { return escrow_skills_1.getEscrow; } });
// Transfers
var transfer_skills_1 = require("./transfer_skills");
Object.defineProperty(exports, "transfer", { enumerable: true, get: function () { return transfer_skills_1.transfer; } });
Object.defineProperty(exports, "multiTransfer", { enumerable: true, get: function () { return transfer_skills_1.multiTransfer; } });
// Discovery
var discovery_skills_1 = require("./discovery_skills");
Object.defineProperty(exports, "discoverAgents", { enumerable: true, get: function () { return discovery_skills_1.discoverAgents; } });
Object.defineProperty(exports, "getBalance", { enumerable: true, get: function () { return discovery_skills_1.getBalance; } });
// Hiring (composite)
var hire_skills_1 = require("./hire_skills");
Object.defineProperty(exports, "hireAgent", { enumerable: true, get: function () { return hire_skills_1.hireAgent; } });
// Manifest
var manifest_skills_1 = require("./manifest_skills");
Object.defineProperty(exports, "buildManifest", { enumerable: true, get: function () { return manifest_skills_1.buildManifest; } });
Object.defineProperty(exports, "buildManifestJSON", { enumerable: true, get: function () { return manifest_skills_1.buildManifestJSON; } });
// OASF Taxonomy
var oasf_taxonomy_1 = require("./oasf_taxonomy");
Object.defineProperty(exports, "OASF_SCHEMA_VERSION", { enumerable: true, get: function () { return oasf_taxonomy_1.OASF_SCHEMA_VERSION; } });
Object.defineProperty(exports, "OASF_SKILLS", { enumerable: true, get: function () { return oasf_taxonomy_1.OASF_SKILLS; } });
Object.defineProperty(exports, "OASF_DOMAINS", { enumerable: true, get: function () { return oasf_taxonomy_1.OASF_DOMAINS; } });
Object.defineProperty(exports, "getSkillCategory", { enumerable: true, get: function () { return oasf_taxonomy_1.getSkillCategory; } });
Object.defineProperty(exports, "getDomainCategory", { enumerable: true, get: function () { return oasf_taxonomy_1.getDomainCategory; } });
Object.defineProperty(exports, "getAllSkillIds", { enumerable: true, get: function () { return oasf_taxonomy_1.getAllSkillIds; } });
Object.defineProperty(exports, "getAllDomainIds", { enumerable: true, get: function () { return oasf_taxonomy_1.getAllDomainIds; } });
Object.defineProperty(exports, "validateOASF", { enumerable: true, get: function () { return oasf_taxonomy_1.validateOASF; } });
//# sourceMappingURL=index.js.map