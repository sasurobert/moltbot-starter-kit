"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const smart_contract_skills_1 = require("../src/skills/smart_contract_skills");
const entrypoint_1 = require("../src/utils/entrypoint");
jest.mock('../src/utils/entrypoint');
describe('Smart Contract Skills', () => {
    it('should query a smart contract properly', async () => {
        const mockQuery = jest.fn().mockResolvedValue(['0x1234']);
        entrypoint_1.createEntrypoint.mockReturnValue({
            createSmartContractController: () => ({
                query: mockQuery,
            }),
        });
        const result = await (0, smart_contract_skills_1.queryContract)({
            address: 'erd1qyu5wthldzr8wx5c9ucg8kjagg0jfs53s8nr3zpz3hypefsdd8ssycr6th',
            funcName: 'get_balance',
        });
        expect(result).toEqual(['0x1234']);
        expect(mockQuery).toHaveBeenCalled();
    });
});
//# sourceMappingURL=smart_contract_skills.test.js.map