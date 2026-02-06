'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
exports.Facilitator = void 0;
const axios_1 = require('axios');
const config_1 = require('./config');
class Facilitator {
  listener = null;
  pollingInterval = null;
  facilitatorUrl;
  constructor(url) {
    this.facilitatorUrl = url || config_1.CONFIG.PROVIDERS.FACILITATOR_URL;
  }
  onPayment(callback) {
    this.listener = callback;
  }
  async start() {
    console.log(`Facilitator Listener attached to ${this.facilitatorUrl}`);
    this.pollingInterval = setInterval(async () => {
      if (!this.listener) return;
      try {
        const res = await axios_1.default.get(
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
  async prepare(request) {
    const res = await axios_1.default.post(
      `${this.facilitatorUrl}/prepare`,
      request,
    );
    return res.data;
  }
  async settle(payload) {
    const res = await axios_1.default.post(`${this.facilitatorUrl}/settle`, {
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
exports.Facilitator = Facilitator;
//# sourceMappingURL=facilitator.js.map
