import axios from 'axios';

export class McpBridge {
  private baseUrl: string;

  constructor(url: string) {
    this.baseUrl = url;
  }

  async getAgentReputation(nonce: number): Promise<number> {
    try {
      const res = await axios.get(`${this.baseUrl}/agents/${nonce}/reputation`);
      return res.data.score;
    } catch (e) {
      console.warn('Failed to fetch reputation, returning default 50');
      return 50;
    }
  }

  async getGasPrice(): Promise<string> {
    try {
      const res = await axios.get(`${this.baseUrl}/network/economics`);
      return res.data.gasPrice;
    } catch (e) {
      return '1000000000'; // Default
    }
  }
}
