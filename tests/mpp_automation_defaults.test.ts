import {
  fundSessionFromDiscovery,
  slashSessionOnFeedback,
} from '../src/skills/mpp_automation';

describe('mpp automation defaults and errors', () => {
  it('uses default token and duration in fundSessionFromDiscovery', async () => {
    const identitySkill = {
      getAgentPricing: jest.fn().mockResolvedValue(42n),
    };
    const mppSkill = {
      openSession: jest.fn().mockResolvedValue('tx-hash'),
    };

    const result = await fundSessionFromDiscovery(
      identitySkill,
      mppSkill,
      'erd1agent',
    );
    expect(result).toBe('tx-hash');
    expect(mppSkill.openSession).toHaveBeenCalledWith(
      'erd1agent',
      42n,
      'EGLD',
      3600,
    );
  });

  it('propagates requestCloseSession error for negative ratings', async () => {
    const identitySkill = {
      submitFeedback: jest.fn().mockResolvedValue('feedback-tx'),
    };
    const mppSkill = {
      requestCloseSession: jest.fn().mockRejectedValue(new Error('close fail')),
    };

    await expect(
      slashSessionOnFeedback(
        identitySkill,
        mppSkill,
        'erd1agent',
        1,
        'job-1',
        'channel-1',
      ),
    ).rejects.toThrow('close fail');
  });
});
