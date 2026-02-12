"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// Mock the entrypoint + ABI utilities
const mockQuery = jest.fn();
const mockController = { query: mockQuery };
const mockCreateSmartContractController = jest.fn(() => mockController);
jest.mock('../src/utils/entrypoint', () => ({
    createEntrypoint: () => ({
        createSmartContractController: mockCreateSmartContractController,
        createSmartContractTransactionsFactory: jest.fn(),
    }),
}));
jest.mock('../src/utils/abi', () => ({
    createPatchedAbi: jest.fn(() => ({})),
}));
const identity_skills_1 = require("../src/skills/identity_skills");
describe('Identity Skills', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });
    describe('getAgent', () => {
        it('should return agent details when found', async () => {
            mockQuery.mockResolvedValueOnce([
                {
                    name: 'TestBot',
                    uri: 'https://testbot.io',
                    public_key: 'abc123',
                    owner: { toBech32: () => 'erd1mock' },
                    metadata: [],
                },
            ]);
            const agent = await (0, identity_skills_1.getAgent)(1);
            expect(agent).not.toBeNull();
            expect(agent.name).toBe('TestBot');
            expect(agent.uri).toBe('https://testbot.io');
        });
        it('should return null when agent not found', async () => {
            mockQuery.mockResolvedValueOnce([null]);
            const agent = await (0, identity_skills_1.getAgent)(999);
            expect(agent).toBeNull();
        });
        it('should return null on query error', async () => {
            mockQuery.mockRejectedValueOnce(new Error('network error'));
            const agent = await (0, identity_skills_1.getAgent)(1);
            expect(agent).toBeNull();
        });
        it('should pass correct arguments to controller.query', async () => {
            mockQuery.mockResolvedValueOnce([null]);
            await (0, identity_skills_1.getAgent)(42);
            expect(mockQuery).toHaveBeenCalledWith(expect.objectContaining({
                function: 'get_agent',
                arguments: [42],
            }));
        });
    });
});
//# sourceMappingURL=identity_skills.test.js.map