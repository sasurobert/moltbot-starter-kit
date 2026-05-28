/* eslint-disable @typescript-eslint/no-explicit-any */
const mockCreateTransactionForExecute = jest.fn();
const mockFactory = {
  createTransactionForExecute: mockCreateTransactionForExecute,
};

const mockLoadSignerWithAddress = jest.fn();
const mockCreateProvider = jest.fn();
const mockCreateEntrypoint = jest.fn(() => ({
  createSmartContractTransactionsFactory: jest.fn(() => mockFactory),
  createSmartContractController: jest.fn(() => ({query: jest.fn()})),
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

import {deposit, release, refund} from '../src/skills/escrow_skills';

describe('escrow_skills write paths', () => {
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

  it('deposit creates EGLD native transfer deposit tx', async () => {
    await deposit({
      jobId: 'job-1',
      receiverAddress:
        'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
      poaHash: 'ab',
      deadlineTimestamp: 123,
      amount: 100n,
    });

    expect(mockCreateTransactionForExecute).toHaveBeenCalledWith(
      senderAddress,
      expect.objectContaining({
        function: 'deposit',
        nativeTransferAmount: 100n,
      }),
    );
  });

  it('deposit uses 0 native amount when token is provided', async () => {
    await deposit({
      jobId: 'job-1',
      receiverAddress:
        'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
      poaHash: 'ab',
      deadlineTimestamp: 123,
      amount: 100n,
      token: 'USDC-123',
    });

    expect(mockCreateTransactionForExecute).toHaveBeenCalledWith(
      senderAddress,
      expect.objectContaining({
        function: 'deposit',
        nativeTransferAmount: 0n,
      }),
    );
  });

  it('release builds release tx', async () => {
    const hash = await release('job-2');
    expect(hash).toBe('tx-hash');
    expect(mockCreateTransactionForExecute).toHaveBeenCalledWith(
      senderAddress,
      expect.objectContaining({function: 'release'}),
    );
  });

  it('refund builds refund tx', async () => {
    const hash = await refund('job-3');
    expect(hash).toBe('tx-hash');
    expect(mockCreateTransactionForExecute).toHaveBeenCalledWith(
      senderAddress,
      expect.objectContaining({function: 'refund'}),
    );
  });
});
