/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';

const mockQuery = jest.fn();
const mockController = {query: mockQuery};
const mockGetAccount = jest.fn();
const mockLoadSignerWithAddress = jest.fn();

jest.mock('axios');
jest.mock('../src/chain', () => ({
  createEntrypoint: () => ({
    createSmartContractController: jest.fn(() => mockController),
  }),
  createPatchedAbi: jest.fn(() => ({})),
  createProvider: jest.fn(() => ({
    getAccount: (...args: unknown[]) => mockGetAccount(...args),
  })),
  loadSignerWithAddress: (...args: unknown[]) =>
    mockLoadSignerWithAddress(...args),
}));

import {getBalance} from '../src/skills/discovery_skills';

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('discovery_skills getBalance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAccount.mockResolvedValue({balance: 123n});
    mockedAxios.get.mockResolvedValue({data: []} as any);
  });

  it('uses provided address and returns balances + tokens', async () => {
    mockedAxios.get.mockResolvedValueOnce({
      data: [{identifier: 'USDC', balance: '100', decimals: 6, name: 'USDC'}],
    } as any);

    const result = await getBalance('erd1provided');

    expect(result.address).toBe('erd1provided');
    expect(result.egld).toBe('123');
    expect(result.tokens).toHaveLength(1);
  });

  it('uses signer address when address is omitted', async () => {
    mockLoadSignerWithAddress.mockResolvedValue({
      senderAddress: {toBech32: () => 'erd1fromsigner'},
    });

    const result = await getBalance();

    expect(result.address).toBe('erd1fromsigner');
    expect(mockLoadSignerWithAddress).toHaveBeenCalled();
  });

  it('returns empty token list when token API call fails', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('api down'));

    const result = await getBalance('erd1provided');

    expect(result.tokens).toEqual([]);
    expect(result.egld).toBe('123');
  });
});
