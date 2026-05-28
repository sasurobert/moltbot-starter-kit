import {
  getNetworkConfig,
  getTransactionStatus,
} from '../src/skills/network_skills';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Network Skills', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch network config', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {data: {config: {erd_chain_id: 'D', erd_round_duration: 6000}}},
    });

    const config = await getNetworkConfig();
    expect(config?.erd_chain_id).toBe('D');
  });

  it('should fetch tx status', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {status: 'success'},
    });

    const status = await getTransactionStatus('abc');
    expect(status?.status).toBe('success');
  });

  it('should return null when network config request fails', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('down'));
    await expect(getNetworkConfig()).resolves.toBeNull();
  });

  it('should default tx status to unknown when missing in payload', async () => {
    mockedAxios.get.mockResolvedValueOnce({data: {}});
    await expect(getTransactionStatus('tx-1')).resolves.toEqual({
      hash: 'tx-1',
      status: 'unknown',
    });
  });

  it('should return null when transaction status request fails', async () => {
    mockedAxios.get.mockRejectedValueOnce(new Error('down'));
    await expect(getTransactionStatus('tx-2')).resolves.toBeNull();
  });
});
