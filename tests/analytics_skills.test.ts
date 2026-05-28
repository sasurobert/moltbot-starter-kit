import {getAgentRevenue, getAgentSpend} from '../src/skills/analytics_skills';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Analytics Skills', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should aggregate revenue successfully', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        hits: {
          hits: [
            {_source: {value: '1000000000000000000'}}, // 1 EGLD
            {_source: {value: '500000000000000000'}}, // 0.5 EGLD
          ],
        },
      },
    });

    const revenue = await getAgentRevenue('erd1test');
    expect(revenue).toBe(1.5);
  });

  it('should handle analytics errors', async () => {
    mockedAxios.post.mockRejectedValue(new Error('Network error'));
    const spend = await getAgentSpend('erd1test');
    expect(spend).toBe(0);
  });

  it('should return zero revenue when analytics API fails', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('error'));
    await expect(getAgentRevenue('erd1test')).resolves.toBe(0);
  });

  it('should aggregate spend across multiple transaction hits', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {
        hits: {
          hits: [
            {_source: {value: '1000000000000000000'}},
            {_source: {value: '2000000000000000000'}},
          ],
        },
      },
    });

    const spend = await getAgentSpend('erd1test');
    expect(spend).toBe(3);
  });
});
