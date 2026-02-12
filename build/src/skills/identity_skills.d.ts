/**
 * Identity Skills — register, update, query agent identity on the Identity Registry
 *
 * Uses SDK v15 patterns: createEntrypoint() → factory/controller → ABI-typed arguments.
 * Follows validators.ts and hiring.ts established patterns.
 */
import { Address } from '@multiversx/sdk-core';
export interface AgentDetails {
    name: string;
    uri: string;
    public_key: string;
    owner: Address;
    metadata: Array<{
        key: string;
        value: string;
    }>;
}
export interface RegisterAgentParams {
    name: string;
    uri: string;
    metadata?: Array<{
        key: string;
        value: string;
    }>;
    useRelayer?: boolean;
}
export interface SetMetadataParams {
    agentNonce: number;
    entries: Array<{
        key: string;
        value: string;
    }>;
}
export declare function registerAgent(params: RegisterAgentParams): Promise<string>;
export declare function getAgent(agentNonce: number): Promise<AgentDetails | null>;
export declare function setMetadata(params: SetMetadataParams): Promise<string>;
