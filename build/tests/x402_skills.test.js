"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const x402_skills_1 = require("../src/skills/x402_skills");
describe('x402 Skills', () => {
    it('should correctly parse a valid x402 header', () => {
        const header = 'x402 address="erd1test", amount="50000"';
        const result = (0, x402_skills_1.parseX402Header)(header);
        expect(result).not.toBeNull();
        expect(result?.receiver).toBe('erd1test');
        expect(result?.amount).toBe('50000');
        expect(result?.token).toBeUndefined();
    });
    it('should correctly parse an ESDT x402 header', () => {
        const header = 'x402 address="erd1test", amount="100", token="USDC-123"';
        const result = (0, x402_skills_1.parseX402Header)(header);
        expect(result?.token).toBe('USDC-123');
    });
    it('should reject invalid headers', () => {
        const header = 'Bearer some-token';
        const result = (0, x402_skills_1.parseX402Header)(header);
        expect(result).toBeNull();
    });
});
//# sourceMappingURL=x402_skills.test.js.map