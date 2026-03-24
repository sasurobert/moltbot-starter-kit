export interface A2ANegotiationResult {
    agentUri: string;
    channelId: string | null;
    success: boolean;
}
/**
 * Pings another agent via their registered URI found in mx8004 to verify availability.
 */
export declare function pingAgent(agentNonce: number): Promise<boolean>;
/**
 * A composite skill that handles finding an agent, pinging them, and opening a funded MPP session.
 */
export declare function hireA2A(agentAddress: string, tokenIdentifier: string, durationSeconds: number): Promise<A2ANegotiationResult>;
