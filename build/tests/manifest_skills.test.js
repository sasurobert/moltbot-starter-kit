"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Tests for Manifest Builder skill (TDD)
 */
const manifest_skills_1 = require("../src/skills/manifest_skills");
describe('Manifest Skills', () => {
    describe('buildManifest', () => {
        it('should build valid manifest with minimal config', () => {
            const m = (0, manifest_skills_1.buildManifest)({
                name: 'TestAgent',
                description: 'A test agent',
            });
            expect(m.type).toBe('https://multiversx.com/standards/mx-8004#registration-v1');
            expect(m.name).toBe('TestAgent');
            expect(m.description).toBe('A test agent');
            expect(m.version).toBe('1.0.0');
            expect(m.active).toBe(true);
            expect(m.x402Support).toBe(true);
            expect(m.oasf.schemaVersion).toBe('0.8.0');
            expect(m.services).toEqual([]);
        });
        it('should include services and OASF when provided', () => {
            const m = (0, manifest_skills_1.buildManifest)({
                name: 'FullAgent',
                description: 'Full featured agent',
                version: '2.0.0',
                services: [
                    {
                        name: 'MCP',
                        endpoint: 'https://agent.example.com/mcp',
                        version: '2025-01-15',
                    },
                ],
                skills: [
                    {
                        category: 'Blockchain Operations',
                        items: ['transaction_signing'],
                    },
                ],
                domains: [{ category: 'Finance & Business', items: ['defi'] }],
                contact: { email: 'agent@example.com' },
            });
            expect(m.version).toBe('2.0.0');
            expect(m.services).toHaveLength(1);
            expect(m.services[0].name).toBe('MCP');
            expect(m.oasf.skills).toHaveLength(1);
            expect(m.oasf.domains).toHaveLength(1);
            expect(m.contact?.email).toBe('agent@example.com');
        });
        it('should throw on invalid OASF skills', () => {
            expect(() => (0, manifest_skills_1.buildManifest)({
                name: 'Bad',
                description: 'Bad agent',
                skills: [{ category: 'Fake', items: ['nonexistent_skill'] }],
            })).toThrow('OASF validation failed');
        });
        it('should throw on invalid OASF domains', () => {
            expect(() => (0, manifest_skills_1.buildManifest)({
                name: 'Bad',
                description: 'Bad agent',
                domains: [{ category: 'Fake', items: ['nonexistent_domain'] }],
            })).toThrow('OASF validation failed');
        });
        it('should respect x402Support=false', () => {
            const m = (0, manifest_skills_1.buildManifest)({
                name: 'T',
                description: 'T',
                x402Support: false,
            });
            expect(m.x402Support).toBe(false);
        });
    });
    describe('buildManifestJSON', () => {
        it('should return valid JSON string', () => {
            const json = (0, manifest_skills_1.buildManifestJSON)({ name: 'J', description: 'J' });
            const parsed = JSON.parse(json);
            expect(parsed.name).toBe('J');
            expect(parsed.type).toContain('registration-v1');
        });
    });
});
//# sourceMappingURL=manifest_skills.test.js.map