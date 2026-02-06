'use strict';
Object.defineProperty(exports, '__esModule', {value: true});
const validator_1 = require('../src/validator');
const sdk_wallet_1 = require('@multiversx/sdk-wallet');
const sdk_network_providers_1 = require('@multiversx/sdk-network-providers');
// Mock dependencies
jest.mock('@multiversx/sdk-wallet');
jest.mock('@multiversx/sdk-network-providers');
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue('PEM_CONTENT'),
  },
}));
describe('Validator', () => {
  let validator;
  let mockProvider;
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock UserSigner
    sdk_wallet_1.UserSigner.fromPem.mockReturnValue({
      getAddress: () => ({
        bech32: () =>
          'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu',
      }),
      sign: jest.fn().mockResolvedValue(Buffer.from('signature')),
    });
    // Mock ApiNetworkProvider instance
    mockProvider = {
      getAccount: jest.fn().mockResolvedValue({nonce: 123}),
      sendTransaction: jest.fn().mockResolvedValue('real_tx_hash_123'),
    };
    sdk_network_providers_1.ApiNetworkProvider.mockImplementation(
      () => mockProvider,
    );
    validator = new validator_1.Validator();
  });
  test('submitProof should construct and broadcast a valid transaction', async () => {
    const txHash = await validator.submitProof('job-123', 'hash-456');
    expect(txHash).toBe('real_tx_hash_123');
    expect(sdk_wallet_1.UserSigner.fromPem).toHaveBeenCalled();
    expect(sdk_network_providers_1.ApiNetworkProvider).toHaveBeenCalled();
    expect(mockProvider.getAccount).toHaveBeenCalled();
    expect(mockProvider.sendTransaction).toHaveBeenCalled();
  });
  test('should retry on failure and eventually succeed', async () => {
    // Mock failure first 2 times, success on 3rd
    mockProvider.sendTransaction
      .mockRejectedValueOnce(new Error('Network Error'))
      .mockRejectedValueOnce(new Error('Timeout'))
      .mockResolvedValue('real_tx_hash_retry');
    const txHash = await validator.submitProof('job-retry', 'hash-retry');
    expect(txHash).toBe('real_tx_hash_retry');
    expect(mockProvider.sendTransaction).toHaveBeenCalledTimes(3);
  }, 10000); // Increase timeout for backoff
});
//# sourceMappingURL=validator.test.js.map
