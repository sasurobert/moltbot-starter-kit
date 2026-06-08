/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import {discoverRelayerAddress} from '../src/chain/relayer';
import {RelayerAddressCache} from '../src/utils/RelayerAddressCache';

jest.mock('axios');
jest.mock('../src/utils/RelayerAddressCache', () => ({
  RelayerAddressCache: {
    get: jest.fn(),
    set: jest.fn(),
  },
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const mockedCache = RelayerAddressCache as jest.Mocked<
  typeof RelayerAddressCache
>;

describe('chain/relayer discoverRelayerAddress', () => {
  const sender = {toBech32: () => 'erd1sender'} as any;

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env.MULTIVERSX_RELAYER_ADDRESS;
  });

  it('returns explicit relayer address from env override', async () => {
    process.env.MULTIVERSX_RELAYER_ADDRESS = 'erd1explicit';

    const result = await discoverRelayerAddress(sender);

    expect(result).toBe('erd1explicit');
    expect(mockedCache.get).not.toHaveBeenCalled();
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('returns cached relayer address when available', async () => {
    mockedCache.get.mockReturnValueOnce('erd1cached');

    const result = await discoverRelayerAddress(sender);

    expect(result).toBe('erd1cached');
    expect(mockedAxios.get).not.toHaveBeenCalled();
  });

  it('fetches relayer address and stores it in cache', async () => {
    mockedCache.get.mockReturnValueOnce(null);
    mockedAxios.get.mockResolvedValueOnce({
      data: {relayerAddress: 'erd1fromapi'},
    } as any);

    const result = await discoverRelayerAddress(sender);

    expect(result).toBe('erd1fromapi');
    expect(mockedCache.set).toHaveBeenCalledWith(
      expect.any(String),
      'erd1sender',
      'erd1fromapi',
    );
  });

  it('returns null when API responds without relayerAddress', async () => {
    mockedCache.get.mockReturnValueOnce(null);
    mockedAxios.get.mockResolvedValueOnce({data: {}} as any);

    const result = await discoverRelayerAddress(sender);

    expect(result).toBeNull();
    expect(mockedCache.set).not.toHaveBeenCalled();
  });

  it('returns null when relayer discovery request fails', async () => {
    mockedCache.get.mockReturnValueOnce(null);
    mockedAxios.get.mockRejectedValueOnce(new Error('network down'));

    const result = await discoverRelayerAddress(sender);

    expect(result).toBeNull();
  });
});
