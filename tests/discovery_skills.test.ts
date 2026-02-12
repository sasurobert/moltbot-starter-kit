/**
 * Unit tests for Discovery Skills
 */

const mockQuery = jest.fn();
const mockController = {query: mockQuery};

jest.mock('../src/utils/entrypoint', () => ({
  createEntrypoint: () => ({
    createSmartContractController: jest.fn(() => mockController),
  }),
}));

jest.mock('../src/utils/abi', () => ({
  createPatchedAbi: jest.fn(() => ({})),
}));

import {discoverAgents} from '../src/skills/discovery_skills';

describe('Discovery Skills', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('discoverAgents', () => {
    it('should discover agents from registry', async () => {
      mockQuery
        .mockResolvedValueOnce([{name: 'Agent1', uri: 'https://a1.io'}])
        .mockResolvedValueOnce([{name: 'Agent2', uri: 'https://a2.io'}])
        .mockResolvedValueOnce([null]); // end

      const agents = await discoverAgents({maxResults: 5});
      expect(agents).toHaveLength(2);
      expect(agents[0].nonce).toBe(1);
      expect(agents[0].name).toBe('Agent1');
      expect(agents[1].nonce).toBe(2);
      expect(agents[1].name).toBe('Agent2');
    });

    it('should respect maxResults', async () => {
      mockQuery
        .mockResolvedValueOnce([{name: 'A1', uri: 'u1'}])
        .mockResolvedValueOnce([{name: 'A2', uri: 'u2'}]);

      const agents = await discoverAgents({maxResults: 2});
      expect(agents).toHaveLength(2);
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should return empty array when no agents', async () => {
      mockQuery.mockResolvedValueOnce([null]);
      const agents = await discoverAgents();
      expect(agents).toHaveLength(0);
    });

    it('should stop on query error', async () => {
      mockQuery
        .mockResolvedValueOnce([{name: 'A1', uri: 'u1'}])
        .mockRejectedValueOnce(new Error('fail'));

      const agents = await discoverAgents({maxResults: 10});
      expect(agents).toHaveLength(1);
    });
  });
});
