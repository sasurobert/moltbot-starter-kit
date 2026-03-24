"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const acp_skills_1 = require("../src/skills/acp_skills");
const axios_1 = __importDefault(require("axios"));
jest.mock('axios');
const mockedAxios = axios_1.default;
describe('ACP Skills', () => {
    it('should browse products from an ACP well-known url', async () => {
        mockedAxios.get.mockResolvedValue({
            data: {
                products: [
                    { id: '1', name: 'AI API Access', price: '100', currency: 'EGLD' },
                ],
            },
        });
        const products = await (0, acp_skills_1.browseAcpProducts)('https://agent.example.com');
        expect(products.length).toBe(1);
        expect(products[0].name).toBe('AI API Access');
        expect(mockedAxios.get).toHaveBeenCalledWith('https://agent.example.com/.well-known/acp/products.json');
    });
    it('should handle errors gracefully during browse', async () => {
        mockedAxios.get.mockRejectedValue(new Error('Network Error'));
        const products = await (0, acp_skills_1.browseAcpProducts)('https://agent.example.com');
        expect(products).toEqual([]);
    });
});
//# sourceMappingURL=acp_skills.test.js.map