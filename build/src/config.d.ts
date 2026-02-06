export declare const CONFIG: {
  CHAIN_ID: string;
  API_URL: string;
  EXPLORER_URL: string;
  ADDRESSES: {
    IDENTITY_REGISTRY: string;
    VALIDATION_REGISTRY: string;
    REPUTATION_REGISTRY: string;
  };
  PROVIDERS: {
    MCP_URL: string;
    FACILITATOR_URL: string;
    RELAYER_URL: string;
  };
  GAS_LIMITS: {
    REGISTER: bigint;
    UPDATE: bigint;
    SUBMIT_PROOF: bigint;
  };
  SECURITY: {
    ALLOWED_DOMAINS: string[];
  };
  REQUEST_TIMEOUT: number;
  RETRY: {
    MAX_ATTEMPTS: number;
    SUBMISSION_DELAY: number;
    CHECK_INTERVAL: number;
  };
  EMPLOYER: {
    PEM_PATH: string;
    ADDRESS: string;
  };
};
