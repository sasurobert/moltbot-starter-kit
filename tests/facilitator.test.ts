import {Facilitator} from '../src/facilitator';
import axios from 'axios';

jest.mock('axios');
jest.useFakeTimers();

describe('Facilitator', () => {
  let facilitator: Facilitator;
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
    (axios.get as jest.Mock).mockResolvedValue({data: mockEvents});
    facilitator = new Facilitator('http://mock-facilitator.com');
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

    // Expect axios to have been called with unread=true (with or without options)
    expect(axios.get).toHaveBeenCalledWith(
      'http://mock-facilitator.com/events?unread=true',
      expect.anything(),
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
