import axios from "axios";

export interface PaymentEvent {
    amount: string;
    token: string;
    meta: any;
}

type PaymentCallback = (payment: PaymentEvent) => Promise<void>;

export class Facilitator {
    private listener: PaymentCallback | null = null;
    private pollingInterval: NodeJS.Timeout | null = null;
    private facilitatorUrl: string;

    constructor(url?: string) {
        this.facilitatorUrl = url || process.env.X402_FACILITATOR_URL || "http://localhost:4000";
    }

    onPayment(callback: PaymentCallback) {
        this.listener = callback;
    }

    async start() {
        console.log(`Facilitator Listener attached to ${this.facilitatorUrl}`);
        // Polling simulation for received payments or Websocket connection
        // For Starter Kit, we'll simulate a polling loop or a mock stream if SDK is not full.
        // If @x402/facilitator-sdk existed, we would use it.
        // Since we are mocking/implementing basic logic:

        this.pollingInterval = setInterval(async () => {
            // Mock checking for new payments
            // In real impl, fetch from facilitator API
            // const payments = await axios.get(`${this.facilitatorUrl}/events?unread=true`);
            // for (const p of payments.data) { await this.listener(p); }
        }, 5000);
    }

    async stop() {
        if (this.pollingInterval) clearInterval(this.pollingInterval);
    }
}
