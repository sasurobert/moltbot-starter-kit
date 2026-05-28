import axios from 'axios';
import {EventEmitter} from 'events';
import {CONFIG} from './config';
import {Logger} from './utils/logger';

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
  private emitter = new EventEmitter();
  private pollingTimer: NodeJS.Timeout | null = null;
  private facilitatorUrl: string;
  private logger = new Logger('Facilitator');
  private consecutiveFailures = 0;
  private readonly basePollMs = 5000;
  private readonly maxPollMs = 60000;

  constructor(url?: string) {
    this.facilitatorUrl = url || CONFIG.PROVIDERS.FACILITATOR_URL;
  }

  /**
   * Subscribe to payment events. Multiple subscribers are supported.
   */
  onPayment(callback: PaymentCallback) {
    this.listener = callback;
    this.emitter.on('payment', callback);
  }

  /**
   * Synchronously emit a payment event to subscribers — used by tests and
   * by alternative event sources (e.g., webhooks).
   */
  emit(payment: PaymentEvent): void {
    this.emitter.emit('payment', payment);
  }

  async start() {
    this.logger.info(`Listener attached to ${this.facilitatorUrl}`);
    this.scheduleNextPoll(this.basePollMs);
  }

  async stop() {
    if (this.pollingTimer) {
      clearTimeout(this.pollingTimer);
      this.pollingTimer = null;
    }
    this.emitter.removeAllListeners('payment');
  }

  /**
   * Computes next poll delay with exponential backoff & jitter on failure.
   */
  private nextDelayMs(): number {
    if (this.consecutiveFailures === 0) return this.basePollMs;
    const backoff = Math.min(
      this.basePollMs * 2 ** this.consecutiveFailures,
      this.maxPollMs,
    );
    const jitter = Math.floor(Math.random() * 1000);
    return backoff + jitter;
  }

  private scheduleNextPoll(delayMs: number): void {
    this.pollingTimer = setTimeout(() => this.poll(), delayMs);
  }

  private async poll(): Promise<void> {
    try {
      const res = await axios.get(`${this.facilitatorUrl}/events?unread=true`, {
        timeout: CONFIG.REQUEST_TIMEOUT,
      });
      const events = res.data;
      if (Array.isArray(events)) {
        for (const payment of events) {
          this.emitter.emit('payment', payment);
        }
      }
      this.consecutiveFailures = 0;
    } catch (e) {
      this.consecutiveFailures++;
      const next = this.nextDelayMs();
      this.logger.warn(
        `Facilitator poll failed (${this.consecutiveFailures}): ${
          (e as Error).message
        }. Next attempt in ${next}ms.`,
      );
    } finally {
      this.scheduleNextPoll(this.nextDelayMs());
    }
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
        network: CONFIG.CHAIN_ID,
      },
    });
    return res.data;
  }
}
