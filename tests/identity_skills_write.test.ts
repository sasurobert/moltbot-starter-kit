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

import {
  registerAgent,
  setMetadata,
  getAgent,
} from '../src/skills/identity_skills';

describe('identity_skills write paths', () => {
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
    mockQuery.mockResolvedValue([null]);
  });

  it('registerAgent creates tx and broadcasts', async () => {
    const hash = await registerAgent({name: 'bot', uri: 'https://bot.io'});

    expect(hash).toBe('tx-hash');
    expect(mockCreateTransactionForExecute).toHaveBeenCalledWith(
      senderAddress,
      expect.objectContaining({function: 'register_agent'}),
    );
    expect(mockSignAndSend).toHaveBeenCalled();
  });

  it('registerAgent applies relayer when enabled and discovered', async () => {
    await registerAgent({name: 'bot', uri: 'https://bot.io', useRelayer: true});

    expect(mockDiscoverRelayerAddress).toHaveBeenCalledWith(senderAddress);
    expect(mockWithRelayer).toHaveBeenCalledWith(tx, expect.anything());
  });

  it('setMetadata creates set_metadata transaction', async () => {
    const hash = await setMetadata({
      agentNonce: 5,
      entries: [{key: 'k', value: 'v'}],
    });

    expect(hash).toBe('tx-hash');
    expect(mockCreateTransactionForExecute).toHaveBeenCalledWith(
      senderAddress,
      expect.objectContaining({function: 'set_metadata'}),
    );
  });

  it('getAgent returns null when query returns empty', async () => {
    mockQuery.mockResolvedValueOnce([null]);
    const result = await getAgent(123);
    expect(result).toBeNull();
  });
});
