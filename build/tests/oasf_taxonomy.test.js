"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Tests for OASF Taxonomy module (TDD — these should pass when oasf_taxonomy.ts is correctly moved)
 */
const oasf_taxonomy_1 = require("../src/skills/oasf_taxonomy");
describe('OASF Taxonomy', () => {
    describe('Schema', () => {
        it('should report version 0.8.0', () => {
            expect(oasf_taxonomy_1.OASF_SCHEMA_VERSION).toBe('0.8.0');
        });
    });
    describe('Skills', () => {
        it('should have 12 skill categories', () => {
            expect(oasf_taxonomy_1.OASF_SKILLS).toHaveLength(12);
        });
        it('should have 136+ total skill items', () => {
            expect((0, oasf_taxonomy_1.getAllSkillIds)().length).toBeGreaterThanOrEqual(136);
        });
        it('should include Blockchain Operations with required items', () => {
            const cat = oasf_taxonomy_1.OASF_SKILLS.find(g => g.category === 'Blockchain Operations');
            expect(cat).toBeDefined();
            expect(cat.items).toContain('transaction_signing');
            expect(cat.items).toContain('smart_contract_interaction');
            expect(cat.items).toContain('token_transfer');
        });
        it('should find category for known skill', () => {
            expect((0, oasf_taxonomy_1.getSkillCategory)('transaction_signing')).toBe('Blockchain Operations');
            expect((0, oasf_taxonomy_1.getSkillCategory)('text_generation')).toBe('Natural Language Processing');
        });
        it('should return undefined for unknown skill', () => {
            expect((0, oasf_taxonomy_1.getSkillCategory)('nonexistent_skill')).toBeUndefined();
        });
    });
    describe('Domains', () => {
        it('should have 16 domain categories', () => {
            expect(oasf_taxonomy_1.OASF_DOMAINS).toHaveLength(16);
        });
        it('should have 204+ total domain items', () => {
            expect((0, oasf_taxonomy_1.getAllDomainIds)().length).toBeGreaterThanOrEqual(204);
        });
        it('should find category for known domain', () => {
            expect((0, oasf_taxonomy_1.getDomainCategory)('trading')).toBe('Finance & Business');
            expect((0, oasf_taxonomy_1.getDomainCategory)('threat_detection')).toBe('Cybersecurity');
        });
        it('should return undefined for unknown domain', () => {
            expect((0, oasf_taxonomy_1.getDomainCategory)('nonexistent_domain')).toBeUndefined();
        });
    });
    describe('Validation', () => {
        it('should pass for valid OASF', () => {
            const errors = (0, oasf_taxonomy_1.validateOASF)({
                schemaVersion: '0.8.0',
                skills: [
                    { category: 'Blockchain Operations', items: ['transaction_signing'] },
                ],
                domains: [{ category: 'Finance & Business', items: ['defi'] }],
            });
            expect(errors).toHaveLength(0);
        });
        it('should fail for unknown skill', () => {
            const errors = (0, oasf_taxonomy_1.validateOASF)({
                schemaVersion: '0.8.0',
                skills: [{ category: 'X', items: ['fake_skill'] }],
                domains: [],
            });
            expect(errors).toHaveLength(1);
            expect(errors[0]).toContain('fake_skill');
        });
        it('should fail for unknown domain', () => {
            const errors = (0, oasf_taxonomy_1.validateOASF)({
                schemaVersion: '0.8.0',
                skills: [],
                domains: [{ category: 'Y', items: ['fake_domain'] }],
            });
            expect(errors).toHaveLength(1);
            expect(errors[0]).toContain('fake_domain');
        });
        it('should report multiple errors', () => {
            const errors = (0, oasf_taxonomy_1.validateOASF)({
                schemaVersion: '0.8.0',
                skills: [{ category: 'X', items: ['bad1', 'bad2'] }],
                domains: [{ category: 'Y', items: ['bad3'] }],
            });
            expect(errors).toHaveLength(3);
        });
    });
});
//# sourceMappingURL=oasf_taxonomy.test.js.map