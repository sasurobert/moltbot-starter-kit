'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
const processor_1 = require('../src/processor');
const axios_1 = require('axios');
const crypto = require('crypto');
jest.mock('axios');
describe('JobProcessor', () => {
  let processor;
  beforeEach(() => {
    processor = new processor_1.JobProcessor();
    jest.clearAllMocks();
  });
  test('should hash simple string payload', async () => {
    const payload = 'hello world';
    // SHA256 of "hello world" = b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9
    const expectedHash = crypto
      .createHash('sha256')
      .update(payload)
      .digest('hex');
    const result = await processor.process({payload: payload});
    expect(result).toBe(expectedHash);
  });
  test('should fetch URL payload and hash content', async () => {
    const url = 'http://example.com/data';
    const content = 'remote data';
    axios_1.default.get.mockResolvedValue({data: content});
    const expectedHash = crypto
      .createHash('sha256')
      .update(content)
      .digest('hex');
    const result = await processor.process({payload: url, isUrl: true});
    expect(axios_1.default.get).toHaveBeenCalledWith(
      url,
      expect.objectContaining({timeout: expect.any(Number)}),
    );
    expect(result).toBe(expectedHash);
  });
  test('should throw error for disallowed domain (SSRF check)', async () => {
    const url = 'http://evil.com/metadata';
    await expect(
      processor.process({payload: url, isUrl: true}),
    ).rejects.toThrow('Domain not allowed');
    expect(axios_1.default.get).not.toHaveBeenCalledWith(url);
  });
});
//# sourceMappingURL=processor.test.js.map
