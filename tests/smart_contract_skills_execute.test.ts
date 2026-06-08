/* eslint-disable @typescript-eslint/no-explicit-any */
const mockQuery = jest.fn();
const mockCreateTransactionForExecute = jest.fn();
const mockFactory = {
  createTransactionForExecute: mockCreateTransactionForExecute,
};
const mockLoadSignerWithAddress = jest.fn();
const mockCreateProvider = jest.fn();
const mockSignAndSend = jest.fn();

jest.mock('../src/chain', () => ({
  loadSignerWithAddress: (...args: unknown[]) =>
    mockLoadSignerWithAddress(...args),
  createProvider: (...args: unknown[]) => mockCreateProvider(...args),
  createEntrypoint: jest.fn(() => ({
    createSmartContractController: jest.fn(() => ({
      query: (...args: unknown[]) => mockQuery(...args),
    })),
    createSmartContractTransactionsFactory: jest.fn(() => mockFactory),
  })),
  signAndSend: (...args: unknown[]) => mockSignAndSend(...args),
}));

import {
  queryContract,
  executeContract,
} from '../src/skills/smart_contract_skills';

describe('smart_contract_skills execute and error paths', () => {
  const senderAddress = {toBech32: () => 'erd1sender'} as any;
  const signer = {sign: jest.fn()} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadSignerWithAddress.mockResolvedValue({signer, senderAddress});
    mockCreateProvider.mockReturnValue({provider: true});
    mockCreateTransactionForExecute.mockResolvedValue({id: 'tx'} as any);
    mockSignAndSend.mockResolvedValue('tx-hash');
  });

  it('queryContract returns empty list when query throws', async () => {
    mockQuery.mockRejectedValueOnce(new Error('query failed'));

    const result = await queryContract({
      address: 'erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th',
      funcName: 'get_something',
    });

    expect(result).toEqual([]);
  });

  it('executeContract uses default value and gasLimit', async () => {
    const txHash = await executeContract({
      address: 'erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th',
      funcName: 'do_something',
    });

    expect(txHash).toBe('tx-hash');
    expect(mockCreateTransactionForExecute).toHaveBeenCalledWith(
      senderAddress,
      expect.objectContaining({
        nativeTransferAmount: 0n,
        gasLimit: 10_000_000n,
      }),
    );
  });

  it('executeContract forwards provided value and gasLimit', async () => {
    await executeContract({
      address: 'erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th',
      funcName: 'do_something',
      value: 99n,
      gasLimit: 88n,
      args: ['aa'],
    });

    expect(mockCreateTransactionForExecute).toHaveBeenCalledWith(
      senderAddress,
      expect.objectContaining({
        arguments: ['aa'],
        nativeTransferAmount: 99n,
        gasLimit: 88n,
      }),
    );
  });
});
