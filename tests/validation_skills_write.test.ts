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
const mockDiscoverRelayerAddress = jest.fn();
const mockSignAndSend = jest.fn();
const mockWithRelayer = jest.fn();

jest.mock('../src/chain', () => ({
  loadSignerWithAddress: (...args: unknown[]) =>
    mockLoadSignerWithAddress(...args),
  createProvider: (...args: unknown[]) => mockCreateProvider(...args),
  createEntrypoint: () => mockCreateEntrypoint(),
  createPatchedAbi: () => mockCreatePatchedAbi(),
  discoverRelayerAddress: (...args: unknown[]) =>
    mockDiscoverRelayerAddress(...args),
  signAndSend: (...args: unknown[]) => mockSignAndSend(...args),
  withRelayer: (...args: unknown[]) => mockWithRelayer(...args),
}));

import {initJob, submitProof} from '../src/skills/validation_skills';

describe('validation_skills write paths', () => {
  const tx = {id: 'tx'} as any;
  const senderAddress = {
    toBech32: () => 'erd1sender',
    getPublicKey: () => Buffer.from('pub'),
  } as any;
  const signer = {sign: jest.fn()} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadSignerWithAddress.mockResolvedValue({signer, senderAddress});
    mockCreateProvider.mockReturnValue({provider: true});
    mockCreateTransactionForExecute.mockResolvedValue(tx);
    mockSignAndSend.mockResolvedValue('tx-hash');
    mockDiscoverRelayerAddress.mockResolvedValue(
      'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
    );
  });

  it('initJob builds init_job transaction with optional serviceId', async () => {
    const hash = await initJob({jobId: 'job-1', agentNonce: 2, serviceId: 3});

    expect(hash).toBe('tx-hash');
    expect(mockCreateTransactionForExecute).toHaveBeenCalledWith(
      senderAddress,
      expect.objectContaining({
        function: 'init_job',
        arguments: [Buffer.from('job-1'), 2n, 3],
      }),
    );
  });

  it('submitProof builds submit_proof and sends', async () => {
    const hash = await submitProof({jobId: 'job-1', proofHash: 'abcd'});

    expect(hash).toBe('tx-hash');
    expect(mockCreateTransactionForExecute).toHaveBeenCalledWith(
      senderAddress,
      expect.objectContaining({
        function: 'submit_proof',
      }),
    );
    expect(mockSignAndSend).toHaveBeenCalled();
  });

  it('submitProof uses relayer when enabled and discovered', async () => {
    await submitProof({jobId: 'job-1', proofHash: 'abcd', useRelayer: true});

    expect(mockDiscoverRelayerAddress).toHaveBeenCalledWith(senderAddress);
    expect(mockWithRelayer).toHaveBeenCalledWith(tx, expect.anything());
  });
});
