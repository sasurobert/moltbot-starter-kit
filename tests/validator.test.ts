import axios from 'axios';
import {Validator} from '../src/validator';
import {UserSigner} from '@multiversx/sdk-wallet';
import {ApiNetworkProvider} from '@multiversx/sdk-network-providers';

jest.mock('@multiversx/sdk-wallet');
jest.mock('@multiversx/sdk-network-providers');
// Spy on axios.post/get instead of jest.mock('axios') — sdk-core's
// userAgent.ts uses axios.AxiosHeaders.from(...).normalize(), which gets
// wiped by a full module mock.
jest.spyOn(axios, 'post');
jest.spyOn(axios, 'get');
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue('PEM_CONTENT'),
  },
}));

const SENDER = 'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu';
const RELAYER =
  'erd1qqqqqqqqqqqqqpgqxyum8w6cn6xkz9q5rsy4mfcsw3njpd6cd8ssr4quyy';

describe('Validator', () => {
  let validator: Validator;
  let mockProvider: Record<string, jest.Mock>;

  beforeEach(() => {
    jest.clearAllMocks();

    (UserSigner.fromPem as jest.Mock).mockReturnValue({
      getAddress: () => ({bech32: () => SENDER}),
      sign: jest.fn().mockResolvedValue(Buffer.from('signature')),
    });

    mockProvider = {
      getAccount: jest.fn().mockResolvedValue({nonce: 123}),
      sendTransaction: jest.fn().mockResolvedValue('tx_direct'),
      getTransaction: jest.fn().mockResolvedValue({
        status: {toString: () => 'success'},
      }),
    };
    (ApiNetworkProvider as unknown as jest.Mock).mockImplementation(
      () => mockProvider,
    );

    validator = new Validator();
  });

  describe('submitProof — direct (no relayer)', () => {
    test('builds, signs and broadcasts via provider.sendTransaction', async () => {
      const txHash = await validator.submitProof('job-1', 'deadbeef');

      expect(txHash).toBe('tx_direct');
      expect(UserSigner.fromPem).toHaveBeenCalled();
      expect(mockProvider.getAccount).toHaveBeenCalledTimes(1);
      expect(mockProvider.sendTransaction).toHaveBeenCalledTimes(1);
    });

    test('retries on transient failure with fresh nonce on each attempt', async () => {
      mockProvider.sendTransaction
        .mockRejectedValueOnce(new Error('Network Error'))
        .mockRejectedValueOnce(new Error('Timeout'))
        .mockResolvedValue('tx_after_retry');

      const txHash = await validator.submitProof('job-2', 'cafe');

      expect(txHash).toBe('tx_after_retry');
      // 3 attempts × 1 getAccount each = 3 (verifies nonce is re-fetched)
      expect(mockProvider.getAccount).toHaveBeenCalledTimes(3);
      expect(mockProvider.sendTransaction).toHaveBeenCalledTimes(3);
    }, 10000);
  });

  describe('submitProof — relayed', () => {
    beforeEach(() => {
      validator.setRelayerConfig('http://mock-relayer', RELAYER);
    });

    test('broadcasts via /relay endpoint with relayer field', async () => {
      (axios.post as jest.Mock).mockResolvedValue({data: {txHash: 'tx_relay'}});

      const txHash = await validator.submitProof('job-3', 'feed');

      expect(txHash).toBe('tx_relay');
      expect(axios.post).toHaveBeenCalledWith(
        'http://mock-relayer/relay',
        expect.objectContaining({
          transaction: expect.objectContaining({relayer: expect.anything()}),
        }),
        expect.anything(),
      );
      // Direct provider.sendTransaction should NOT be used when relayed
      expect(mockProvider.sendTransaction).not.toHaveBeenCalled();
    });
  });

  describe('Auto-Registration', () => {
    beforeEach(() => {
      validator.setRelayerConfig('http://mock-relayer', RELAYER);
    });

    test('triggers auto-register on explicit AGENT_NOT_REGISTERED code', async () => {
      (axios.post as jest.Mock)
        // 1. Initial proof relay → 403 with explicit code
        .mockRejectedValueOnce({
          response: {
            status: 403,
            data: {error: 'forbidden', code: 'AGENT_NOT_REGISTERED'},
          },
        })
        // 2. Challenge request
        .mockResolvedValueOnce({
          data: {difficulty: 1, salt: 'salt', address: SENDER},
        })
        // 3. Registration relay
        .mockResolvedValueOnce({data: {txHash: 'tx_register'}})
        // 4. Retry proof relay → success
        .mockResolvedValueOnce({data: {txHash: 'tx_proof_retry'}});

      const txHash = await validator.submitProof('job-4', 'beef');

      expect(txHash).toBe('tx_proof_retry');
      expect(axios.post).toHaveBeenCalledTimes(4);
    });

    test('falls back to substring match for older relayers', async () => {
      (axios.post as jest.Mock)
        .mockRejectedValueOnce({
          response: {
            status: 403,
            data: {error: 'Unauthorized: Agent not registered on chain'},
          },
        })
        .mockResolvedValueOnce({
          data: {difficulty: 1, salt: 'salt', address: SENDER},
        })
        .mockResolvedValueOnce({data: {txHash: 'tx_register'}})
        .mockResolvedValueOnce({data: {txHash: 'tx_proof_retry2'}});

      const txHash = await validator.submitProof('job-5', 'dead');
      expect(txHash).toBe('tx_proof_retry2');
    });

    test('does NOT auto-register on unrelated 403', async () => {
      (axios.post as jest.Mock).mockRejectedValue({
        response: {status: 403, data: {error: 'rate limit exceeded'}},
      });

      await expect(
        validator.submitProof('job-6', 'aabb'),
      ).rejects.toBeDefined();
      // 3 attempts × 1 relay call = 3
      expect(axios.post).toHaveBeenCalledTimes(3);
    }, 10000);
  });

  describe('edge and failure paths', () => {
    test('registerAgent throws when relayer config is missing', async () => {
      await expect(validator.registerAgent()).rejects.toThrow(
        'Relayer not configured',
      );
    });

    test('waitForTx throws on failed status', async () => {
      jest.spyOn(validator, 'getTxStatus').mockResolvedValueOnce('failed');
      await expect(validator.waitForTx('tx')).rejects.toThrow(
        'Registration failed on-chain',
      );
    });

    test('waitForTx throws timeout after max retries', async () => {
      jest.useFakeTimers();
      jest.spyOn(validator, 'getTxStatus').mockResolvedValue('pending');
      const run = validator.waitForTx('tx');
      const expectation = expect(run).rejects.toThrow('Registration timed out');
      await jest.runAllTimersAsync();
      await expectation;
      jest.useRealTimers();
    });

    test('getTxStatus returns not_found on 404-like errors', async () => {
      mockProvider.getTransaction.mockRejectedValueOnce({
        response: {status: 404},
      });
      await expect(validator.getTxStatus('tx')).resolves.toBe('not_found');
    });

    test('getTxStatus returns unknown on non-404 errors', async () => {
      mockProvider.getTransaction.mockRejectedValueOnce(new Error('other'));
      await expect(validator.getTxStatus('tx')).resolves.toBe('unknown');
    });

    test('submitProof surfaces auto-registration failure when registerAgent fails', async () => {
      validator.setRelayerConfig('http://mock-relayer', RELAYER);
      jest
        .spyOn(validator, 'registerAgent')
        .mockRejectedValueOnce(new Error('challenge failed'));

      (axios.post as jest.Mock).mockRejectedValueOnce({
        response: {
          status: 403,
          data: {code: 'AGENT_NOT_REGISTERED', error: 'x'},
        },
      });

      await expect(validator.submitProof('job-x', 'abcd')).rejects.toThrow(
        'challenge failed',
      );
    });
  });
});
