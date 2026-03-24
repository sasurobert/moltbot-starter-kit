import {queryContract} from '../src/skills/smart_contract_skills';
import {createEntrypoint} from '../src/utils/entrypoint';

jest.mock('../src/utils/entrypoint');

describe('Smart Contract Skills', () => {
  it('should query a smart contract properly', async () => {
    const mockQuery = jest.fn().mockResolvedValue(['0x1234']);
    (createEntrypoint as jest.Mock).mockReturnValue({
      createSmartContractController: () => ({
        query: mockQuery,
      }),
    });

    const result = await queryContract({
      address: 'erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th',
      funcName: 'get_balance',
    });

    expect(result).toEqual(['0x1234']);
    expect(mockQuery).toHaveBeenCalled();
  });
});
