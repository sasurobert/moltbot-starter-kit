/* eslint-disable @typescript-eslint/no-explicit-any */
const mockCreateTransactionForExecute = jest.fn();
const mockFactory = {
  createTransactionForExecute: mockCreateTransactionForExecute,
};
const mockQuery = jest.fn();
const mockController = {query: mockQuery};

const mockLoadSignerWithAddress = jest.fn();
const mockCreateProvider = jest.fn();
const mockCreateEntrypoint = jest.fn(() => ({
  createSmartContractTransactionsFactory: jest.fn(() => mockFactory),
  createSmartContractController: jest.fn(() => mockController),
}));
const mockCreatePatchedAbi = jest.fn(() => ({}));
const mockSignAndSend = jest.fn();

jest.mock('../src/chain', () => ({
  loadSignerWithAddress: (...args: unknown[]) =>
    mockLoadSignerWithAddress(...args),
  createProvider: (...args: unknown[]) => mockCreateProvider(...args),
  createEntrypoint: () => mockCreateEntrypoint(),
  createPatchedAbi: () => mockCreatePatchedAbi(),
  signAndSend: (...args: unknown[]) => mockSignAndSend(...args),
}));

import {submitFeedback, getReputation} from '../src/skills/reputation_skills';

describe('reputation_skills write paths', () => {
  const tx = {id: 'tx'} as any;
  const senderAddress = {toBech32: () => 'erd1sender'} as any;
  const signer = {sign: jest.fn()} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadSignerWithAddress.mockResolvedValue({signer, senderAddress});
    mockCreateProvider.mockReturnValue({provider: true});
    mockCreateTransactionForExecute.mockResolvedValue(tx);
    mockSignAndSend.mockResolvedValue('tx-hash');
  });

  it('submitFeedback creates giveFeedbackSimple tx', async () => {
    const hash = await submitFeedback({
      jobId: 'job-1',
      agentNonce: 5,
      rating: 4,
    });

    expect(hash).toBe('tx-hash');
    expect(mockCreateTransactionForExecute).toHaveBeenCalledWith(
      senderAddress,
      expect.objectContaining({
        function: 'giveFeedbackSimple',
        arguments: [Buffer.from('job-1'), 5n, 4n],
      }),
    );
  });

  it('getReputation converts controller values to bigint', async () => {
    mockQuery.mockResolvedValueOnce(['12']).mockResolvedValueOnce(['3']);

    const result = await getReputation(9);
    expect(result).toEqual({score: 12n, totalFeedbacks: 3n});
  });
});
