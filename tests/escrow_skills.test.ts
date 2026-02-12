/**
 * Unit tests for Escrow Skills
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

import {getEscrow} from '../src/skills/escrow_skills';

describe('Escrow Skills', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getEscrow', () => {
    it('should return escrow data when found', async () => {
      const mockEscrow = {
        employer: 'erd1...',
        receiver: 'erd1...',
        token_id: 'EGLD',
        token_nonce: 0n,
        amount: 1000000000000000000n,
        status: 'Active',
      };
      mockQuery.mockResolvedValueOnce([mockEscrow]);

      const escrow = await getEscrow('job-123');
      expect(escrow).not.toBeNull();
      expect(escrow!.status).toBe('Active');
      expect(escrow!.amount).toBe(1000000000000000000n);
    });

    it('should return null when escrow not found', async () => {
      mockQuery.mockResolvedValueOnce([null]);
      const escrow = await getEscrow('nonexistent');
      expect(escrow).toBeNull();
    });

    it('should return null on error', async () => {
      mockQuery.mockRejectedValueOnce(new Error('fail'));
      const escrow = await getEscrow('job-123');
      expect(escrow).toBeNull();
    });

    it('should query get_escrow with correct jobId', async () => {
      mockQuery.mockResolvedValueOnce([null]);
      await getEscrow('test-job');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          function: 'get_escrow',
          arguments: [Buffer.from('test-job')],
        }),
      );
    });
  });
});
