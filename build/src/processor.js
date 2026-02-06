'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
exports.JobProcessor = void 0;
const axios_1 = require('axios');
const crypto = require('crypto');
const config_1 = require('./config');
class JobProcessor {
  async process(job) {
    let content = job.payload;
    if (job.isUrl || job.payload.startsWith('http')) {
      // SSRF Protection
      const url = new URL(job.payload);
      const isAllowed = config_1.CONFIG.SECURITY.ALLOWED_DOMAINS.some(
        domain =>
          url.hostname === domain || url.hostname.endsWith(`.${domain}`),
      );
      if (!isAllowed) {
        throw new Error(`Domain not allowed: ${url.hostname}`);
      }
      try {
        console.log(`Fetching job data from ${job.payload}...`);
        const res = await axios_1.default.get(job.payload, {
          timeout: config_1.CONFIG.REQUEST_TIMEOUT,
        });
        content =
          typeof res.data === 'string' ? res.data : JSON.stringify(res.data);
      } catch (e) {
        // Propagate error if it's the domain check, otherwise logging warning approach for availability
        if (e.message.includes('Domain not allowed')) throw e;
        console.warn('Failed to fetch URL, using raw payload');
      }
    }
    // Hash computation (SHA256)
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
exports.JobProcessor = JobProcessor;
//# sourceMappingURL=processor.js.map
