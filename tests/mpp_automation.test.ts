import {
  fundSessionFromDiscovery,
  slashSessionOnFeedback,
} from '../src/skills/mpp_automation';

describe('MPP Agent Automation Skills', () => {
  let mockIdentitySkill: {
    getAgentPricing: jest.Mock;
    submitFeedback: jest.Mock;
  };
  let mockMppSkill: {openSession: jest.Mock; requestCloseSession: jest.Mock};

  beforeEach(() => {
    mockIdentitySkill = {
      getAgentPricing: jest.fn(),
      submitFeedback: jest.fn(),
    };
    mockMppSkill = {
      openSession: jest.fn(),
      requestCloseSession: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch agent pricing and open a funded session', async () => {
    // Agent B charges 0.5 EGLD
    mockIdentitySkill.getAgentPricing.mockResolvedValueOnce(
      500000000000000000n,
    );
    mockMppSkill.openSession.mockResolvedValueOnce('tx_hash_open');

    const result = await fundSessionFromDiscovery(
      mockIdentitySkill,
      mockMppSkill,
      'erd1agentB',
      'EGLD',
      3600,
    );

    expect(mockIdentitySkill.getAgentPricing).toHaveBeenCalledWith(
      'erd1agentB',
    );
    expect(mockMppSkill.openSession).toHaveBeenCalledWith(
      'erd1agentB',
      500000000000000000n,
      'EGLD',
      3600,
    );
    expect(result).toBe('tx_hash_open');
  });

  it('should not open session if pricing fetch fails', async () => {
    mockIdentitySkill.getAgentPricing.mockRejectedValueOnce(
      new Error('Agent not found'),
    );

    await expect(
      fundSessionFromDiscovery(
        mockIdentitySkill,
        mockMppSkill,
        'erd1agentB',
        'EGLD',
        3600,
      ),
    ).rejects.toThrow('Agent not found');

    expect(mockMppSkill.openSession).not.toHaveBeenCalled();
  });

  it('should submit negative feedback and request session closure', async () => {
    mockIdentitySkill.submitFeedback = jest
      .fn()
      .mockResolvedValueOnce('tx_hash_feedback');
    mockMppSkill.requestCloseSession.mockResolvedValueOnce('tx_hash_close');

    const result = await slashSessionOnFeedback(
      mockIdentitySkill,
      mockMppSkill,
      'erd1agentB',
      1, // 1 star rating (negative)
      'job123',
      'channel_abc',
    );

    expect(mockIdentitySkill.submitFeedback).toHaveBeenCalledWith(
      'erd1agentB',
      1,
      'job123',
    );
    expect(mockMppSkill.requestCloseSession).toHaveBeenCalledWith(
      'channel_abc',
    );
    expect(result.feedbackTx).toBe('tx_hash_feedback');
    expect(result.closeTx).toBe('tx_hash_close');
  });

  it('should not request closure if feedback is positive', async () => {
    mockIdentitySkill.submitFeedback = jest
      .fn()
      .mockResolvedValueOnce('tx_hash_feedback');

    const result = await slashSessionOnFeedback(
      mockIdentitySkill,
      mockMppSkill,
      'erd1agentB',
      5, // 5 star rating (positive)
      'job123',
      'channel_abc',
    );

    expect(mockIdentitySkill.submitFeedback).toHaveBeenCalledWith(
      'erd1agentB',
      5,
      'job123',
    );
    expect(mockMppSkill.requestCloseSession).not.toHaveBeenCalled();
    expect(result.feedbackTx).toBe('tx_hash_feedback');
    expect(result.closeTx).toBeUndefined();
  });
});
