"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const BlockchainService_1 = require("../src/BlockchainService");
const sdk_core_1 = require("@multiversx/sdk-core");
jest.mock('@multiversx/sdk-core', () => {
    const original = jest.requireActual('@multiversx/sdk-core');
    return {
        ...original,
        DevnetEntrypoint: jest.fn().mockImplementation(() => ({
            createSmartContractController: jest.fn().mockImplementation(() => ({
                query: jest.fn(),
            })),
        })),
    };
});
describe('BlockchainService', () => {
    let service;
    let mockController;
    beforeEach(() => {
        service = new BlockchainService_1.BlockchainService();
        mockController = service.identityController;
    });
    it('should fetch agent details using ABI', async () => {
        const mockDetails = {
            name: 'Test Agent',
            uri: 'ipfs://test',
            public_key: 'pk',
            owner: sdk_core_1.Address.newFromBech32('erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu'),
            metadata: [],
        };
        mockController.query.mockResolvedValue([mockDetails]);
        const details = await service.getAgentDetails(1);
        expect(details).toEqual(mockDetails);
        expect(mockController.query).toHaveBeenCalledWith(expect.objectContaining({
            function: 'get_agent',
        }));
    });
    it('should fetch agent service price using ABI', async () => {
        const mockPrice = 1000000000000000000n;
        mockController.query.mockResolvedValue([mockPrice]);
        const price = await service.getAgentServicePrice(1, 'chat');
        expect(price).toEqual(mockPrice);
        expect(mockController.query).toHaveBeenCalledWith(expect.objectContaining({
            function: 'get_agent_service_price',
        }));
    });
});
//# sourceMappingURL=BlockchainService.test.js.map