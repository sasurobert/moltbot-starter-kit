/**
 * Unit tests for Reputation Skills
 */

const mockQuery = jest.fn();
const mockController = {query: mockQuery};

jest.mock('../src/utils/entrypoint', () => ({
  createEntrypoint: () => ({
    createSmartContractController: jest.fn(() => mockController),
    createSmartContractTransactionsFactory: jest.fn(),
  }),
}));

jest.mock('../src/utils/abi', () => ({
  createPatchedAbi: jest.fn(() => ({})),
}));

import {getReputation} from '../src/skills/reputation_skills';

describe('Reputation Skills', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getReputation', () => {
    it('should return score and feedback count', async () => {
      mockQuery
        .mockResolvedValueOnce([45n]) // score
        .mockResolvedValueOnce([10n]); // feedbacks

      const rep = await getReputation(1);
      expect(rep.score).toBe(45n);
      expect(rep.totalFeedbacks).toBe(10n);
    });

    it('should return 0 when agent has no reputation', async () => {
      mockQuery.mockResolvedValueOnce([0n]).mockResolvedValueOnce([0n]);

      const rep = await getReputation(999);
      expect(rep.score).toBe(0n);
      expect(rep.totalFeedbacks).toBe(0n);
    });

    it('should return 0 on query error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('fail'));

      const rep = await getReputation(1);
      expect(rep.score).toBe(0n);
      expect(rep.totalFeedbacks).toBe(0n);
    });

    it('should query with correct function names', async () => {
      mockQuery.mockResolvedValueOnce([0n]).mockResolvedValueOnce([0n]);

      await getReputation(5);

      expect(mockQuery).toHaveBeenCalledTimes(2);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({function: 'get_reputation_score'}),
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({function: 'get_total_feedbacks'}),
      );
    });
  });
});
