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
export declare class BlockchainService {
    private identityController;
    constructor();
    getAgentDetails(nonce: number): Promise<AgentDetails>;
    getAgentServicePrice(nonce: number, serviceId: string): Promise<bigint>;
}
