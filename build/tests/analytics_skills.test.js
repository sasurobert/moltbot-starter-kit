"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const analytics_skills_1 = require("../src/skills/analytics_skills");
const axios_1 = __importDefault(require("axios"));
jest.mock('axios');
const mockedAxios = axios_1.default;
describe('Analytics Skills', () => {
    it('should aggregate revenue successfully', async () => {
        mockedAxios.post.mockResolvedValue({
            data: {
                hits: {
                    hits: [
                        { _source: { value: '1000000000000000000' } }, // 1 EGLD
                        { _source: { value: '500000000000000000' } }, // 0.5 EGLD
                    ],
                },
            },
        });
        const revenue = await (0, analytics_skills_1.getAgentRevenue)('erd1test');
        expect(revenue).toBe(1.5);
    });
    it('should handle analytics errors', async () => {
        mockedAxios.post.mockRejectedValue(new Error('Network error'));
        const spend = await (0, analytics_skills_1.getAgentSpend)('erd1test');
        expect(spend).toBe(0);
    });
});
//# sourceMappingURL=analytics_skills.test.js.map