import {browseAcpProducts} from '../src/skills/acp_skills';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ACP Skills', () => {
  it('should browse products from an ACP well-known url', async () => {
    mockedAxios.get.mockResolvedValue({
      data: {
        products: [
          {id: '1', name: 'AI API Access', price: '100', currency: 'EGLD'},
        ],
      },
    });

    const products = await browseAcpProducts('https://agent.example.com');
    expect(products.length).toBe(1);
    expect(products[0].name).toBe('AI API Access');
    expect(mockedAxios.get).toHaveBeenCalledWith(
      'https://agent.example.com/.well-known/acp/products.json',
    );
  });

  it('should handle errors gracefully during browse', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network Error'));
    const products = await browseAcpProducts('https://agent.example.com');
    expect(products).toEqual([]);
  });
});
