import {pingAgent, hireA2A} from '../src/skills/a2a_skills';
import * as identity from '../src/skills/identity_skills';
import * as mpp from '../src/skills/mpp_automation';

jest.mock('../src/skills/identity_skills');
jest.mock('../src/skills/mpp_automation');

describe('A2A Skills', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as jest.Mock;
  });

  it('should ping an agent correctly if registered', async () => {
    (identity.getAgent as jest.Mock).mockResolvedValue({
      uri: 'https://agent.example.com',
    });
    (global.fetch as jest.Mock).mockResolvedValue({ok: true});

    const isUp = await pingAgent(42);
    expect(isUp).toBe(true);
    expect(global.fetch).toHaveBeenCalledWith('https://agent.example.com/ping');
  });

  it('should fail ping if agent is not registered', async () => {
    (identity.getAgent as jest.Mock).mockResolvedValue(null);
    const isUp = await pingAgent(42);
    expect(isUp).toBe(false);
  });

  it('should hire A2A by finding and funding an MPP session', async () => {
    (mpp.fundSessionFromDiscovery as jest.Mock).mockResolvedValue(
      '0xchannelfound',
    );
    const result = await hireA2A('DataAnalysis', 'USDC-123456', 50);

    expect(result.success).toBe(true);
    expect(result.channelId).toBe('0xchannelfound');
  });
});
