import axios from 'axios';
import {CONFIG} from './config';

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

export class Facilitator {
  private listener: PaymentCallback | null = null;
  private pollingInterval: NodeJS.Timeout | null = null;
  private facilitatorUrl: string;

  constructor(url?: string) {
    this.facilitatorUrl = url || CONFIG.PROVIDERS.FACILITATOR_URL;
  }

  onPayment(callback: PaymentCallback) {
    this.listener = callback;
  }

  async start() {
    console.log(`Facilitator Listener attached to ${this.facilitatorUrl}`);

    this.pollingInterval = setInterval(async () => {
      if (!this.listener) return;
      try {
        const res = await axios.get(
          `${this.facilitatorUrl}/events?unread=true`,
        );
        const events = res.data;
        if (Array.isArray(events)) {
          for (const payment of events) {
            // Validate structure if needed, or assume trusted source
            await this.listener(payment);
          }
        }
      } catch {
        // Suppress connection error logs during tests often, but log warn in prod
        // console.warn("Facilitator poll failed:", (e as Error).message);
      }
    }, 5000);
  }

  async stop() {
    if (this.pollingInterval) clearInterval(this.pollingInterval);
  }

  async prepare(request: {
    agentNonce: number;
    serviceId: string;
    employerAddress: string;
    jobId?: string;
  }) {
    const res = await axios.post(`${this.facilitatorUrl}/prepare`, request);
    return res.data;
  }

  async settle(payload: {
    receiver: string;
    value: string;
    [key: string]: unknown;
  }) {
    const res = await axios.post(`${this.facilitatorUrl}/settle`, {
      scheme: 'exact',
      payload,
      requirements: {
        payTo: payload.receiver,
        amount: payload.value,
        asset: 'EGLD',
        network: 'D',
      },
    });
    return res.data;
  }
}
