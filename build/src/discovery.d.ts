export interface PaymentInfo {
    intent: 'charge' | 'session';
    method: string;
    amount: string | null;
    currency: string;
    description?: string;
}
export declare class AgentDiscovery {
    private logger;
    getPaymentInfo(agentUrl: string, endpointPath?: string): Promise<PaymentInfo | null>;
    negotiateSession(agentUrl: string, paymentInfo: PaymentInfo): Promise<string>;
}
