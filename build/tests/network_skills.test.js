"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const network_skills_1 = require("../src/skills/network_skills");
const axios_1 = __importDefault(require("axios"));
jest.mock('axios');
const mockedAxios = axios_1.default;
describe('Network Skills', () => {
    it('should fetch network config', async () => {
        mockedAxios.get.mockResolvedValue({
            data: { data: { config: { erd_chain_id: 'D', erd_round_duration: 6000 } } },
        });
        const config = await (0, network_skills_1.getNetworkConfig)();
        expect(config?.erd_chain_id).toBe('D');
    });
    it('should fetch tx status', async () => {
        mockedAxios.get.mockResolvedValue({
            data: { status: 'success' },
        });
        const status = await (0, network_skills_1.getTransactionStatus)('abc');
        expect(status?.status).toBe('success');
    });
});
//# sourceMappingURL=network_skills.test.js.map