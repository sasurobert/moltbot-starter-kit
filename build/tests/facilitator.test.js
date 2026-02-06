'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
const facilitator_1 = require('../src/facilitator');
const axios_1 = require('axios');
jest.mock('axios');
jest.useFakeTimers();
describe('Facilitator', () => {
  let facilitator;
  const mockEvents = [
    {
      id: 'evt-1',
      amount: '1000000',
      token: 'USDC-123456',
      meta: {jobId: 'job-abc', payload: 'http://data'},
    },
  ];
  beforeEach(() => {
    jest.clearAllMocks();
    axios_1.default.get.mockResolvedValue({data: mockEvents});
    facilitator = new facilitator_1.Facilitator('http://mock-facilitator.com');
  });
  afterEach(async () => {
    await facilitator.stop();
  });
  test('should poll events and trigger callback', async () => {
    const callback = jest.fn();
    facilitator.onPayment(callback);
    void facilitator.start();
    // Fast-forward time to trigger interval
    jest.advanceTimersByTime(5100);
    // Allow any pending promises to resolve
    await Promise.resolve();
    await Promise.resolve();
    // Expect axios to have been called with unread=true
    expect(axios_1.default.get).toHaveBeenCalledWith(
      'http://mock-facilitator.com/events?unread=true',
    );
    // Expect callback to be called with parsed event
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: '1000000',
        token: 'USDC-123456',
        meta: expect.objectContaining({jobId: 'job-abc'}),
      }),
    );
  });
});
//# sourceMappingURL=facilitator.test.js.map
