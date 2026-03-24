import {
  getNetworkConfig,
  getTransactionStatus,
} from '../src/skills/network_skills';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Network Skills', () => {
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
});
