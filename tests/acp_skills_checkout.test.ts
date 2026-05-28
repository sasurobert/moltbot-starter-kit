import axios from 'axios';
import {browseAcpProducts, checkoutAcpProduct} from '../src/skills/acp_skills';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('ACP skills checkout paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty list when products payload is missing', async () => {
    mockedAxios.get.mockResolvedValueOnce({data: {}} as never);

    const products = await browseAcpProducts('https://agent.example.com');
    expect(products).toEqual([]);
  });

  it('returns checkout payload on success', async () => {
    mockedAxios.post.mockResolvedValueOnce({
      data: {receiver: 'erd1receiver', value: '1000', data: '0xabc'},
    } as never);

    const result = await checkoutAcpProduct(
      'https://agent.example.com',
      'prod-1',
      'erd1buyer',
    );

    expect(result).toEqual({
      receiver: 'erd1receiver',
      value: '1000',
      data: '0xabc',
    });
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://agent.example.com/acp/checkout',
      {productId: 'prod-1', buyerAddress: 'erd1buyer'},
    );
  });

  it('returns null when checkout fails', async () => {
    mockedAxios.post.mockRejectedValueOnce(new Error('down'));

    const result = await checkoutAcpProduct(
      'https://agent.example.com',
      'prod-1',
      'erd1buyer',
    );

    expect(result).toBeNull();
  });
});
