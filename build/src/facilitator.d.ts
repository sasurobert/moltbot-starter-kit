export interface PaymentEvent {
    amount: string;
    token: string;
    meta?: {
        jobId?: string;
        payload?: string;
        [key: string]: unknown;
    };
}
type PaymentCallback = (payment: PaymentEvent) => Promise<void>;
export declare class Facilitator {
    private listener;
    private pollingInterval;
    private facilitatorUrl;
    constructor(url?: string);
    onPayment(callback: PaymentCallback): void;
    start(): Promise<void>;
    stop(): Promise<void>;
    prepare(request: {
        agentNonce: number;
        serviceId: string;
        employerAddress: string;
        jobId?: string;
    }): Promise<any>;
    settle(payload: {
        receiver: string;
        value: string;
        [key: string]: unknown;
    }): Promise<any>;
}
export {};
