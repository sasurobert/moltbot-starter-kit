/**
 * Barrel export for all skills
 *
 * Import everything from one place:
 *   import { registerAgent, getBalance, buildManifest } from './skills';
 */

// Identity
export {
  registerAgent,
  getAgent,
  setMetadata,
  type AgentDetails,
  type RegisterAgentParams,
  type SetMetadataParams,
} from './identity_skills';

// Validation
export {
  initJob,
  submitProof,
  isJobVerified,
  getJobData,
  type InitJobParams,
  type SubmitProofParams,
  type JobData,
} from './validation_skills';

// Reputation
export {
  submitFeedback,
  getReputation,
  type SubmitFeedbackParams,
  type ReputationScore,
} from './reputation_skills';

// Escrow
export {
  deposit,
  release,
  refund,
  getEscrow,
  type DepositParams,
  type EscrowData,
} from './escrow_skills';

// Transfers
export {
  transfer,
  multiTransfer,
  type TransferParams,
  type MultiTransferParams,
  type MultiTransferItem,
} from './transfer_skills';

// Discovery
export {
  discoverAgents,
  getBalance,
  type DiscoveredAgent,
  type DiscoverParams,
  type BalanceResult,
  type TokenBalance,
} from './discovery_skills';

// Hiring (composite)
export {hireAgent, type HireAgentParams, type HireResult} from './hire_skills';

// Manifest
export {
  buildManifest,
  buildManifestJSON,
  type ManifestConfig,
  type AgentManifest,
  type ManifestService,
  type ManifestContact,
} from './manifest_skills';

// OASF Taxonomy
export {
  OASF_SCHEMA_VERSION,
  OASF_SKILLS,
  OASF_DOMAINS,
  getSkillCategory,
  getDomainCategory,
  getAllSkillIds,
  getAllDomainIds,
  validateOASF,
  type OASFSkillGroup,
  type OASFDomainGroup,
} from './oasf_taxonomy';
