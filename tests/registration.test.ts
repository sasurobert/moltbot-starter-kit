import {Validator} from '../src/validator';
import axios from 'axios';

jest.mock('axios');
jest.mock('@multiversx/sdk-core', () => {
  return {
    Address: jest.fn().mockImplementation(bech32 => ({
      bech32: () => bech32 || 'erd1test',
      toBech32: () => bech32 || 'erd1test',
      getPublicKey: () => Buffer.from('pubkey'),
      toString: () => bech32 || 'erd1test',
    })),
    TransactionComputer: jest.fn().mockImplementation(() => ({
      computeBytesForSigning: jest.fn().mockReturnValue(Buffer.from('bytes')),
    })),
    Abi: {
      create: jest.fn().mockReturnValue({}),
    },
    VariadicValue: {
      fromItemsCounted: jest.fn().mockReturnValue([]),
    },
    DevnetEntrypoint: jest.fn().mockImplementation(() => ({
      createSmartContractTransactionsFactory: jest.fn().mockReturnValue({
        createTransactionForExecute: jest.fn().mockResolvedValue({
          nonce: 0n,
          version: 1,
          gasLimit: 1000n,
          toPlainObject: () => ({}),
        }),
      }),
    })),
  };
});

jest.mock('@multiversx/sdk-wallet', () => ({
  UserSigner: {
    fromPem: jest.fn().mockReturnValue({
      getAddress: () => ({bech32: () => 'erd1user'}),
      sign: jest.fn().mockResolvedValue(Buffer.from('sig')),
    }),
  },
  UserVerifier: jest.fn(),
  UserPublicKey: jest.fn(),
}));

jest.mock('@multiversx/sdk-network-providers', () => ({
  ApiNetworkProvider: jest.fn().mockImplementation(() => ({
    getAccount: jest.fn().mockResolvedValue({nonce: 1}),
    getTransaction: jest.fn().mockResolvedValue({status: 'success'}), // Registration success
    sendTransaction: jest.fn().mockResolvedValue('txHash'),
  })),
}));
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue('PEM_CONTENT'),
  },
}));

describe('Validator Auto-Registration', () => {
  let validator: Validator;

  beforeEach(() => {
    validator = new Validator();
    validator.setRelayerConfig('http://mock-relayer', 'erd1relayer');
    (axios.post as jest.Mock).mockClear();
  });

  it('should auto-register on 403 error', async () => {
    // Mock Responses
    // 1. Submit Proof -> 403
    // 2. Register Agent:
    //    a. Get Challenge
    //    b. Relay Registration Tx
    // 3. Retry Submit Proof -> Success

    (axios.post as jest.Mock)
      .mockRejectedValueOnce({
        response: {
          status: 403,
          data: {error: 'Unauthorized: Agent not registered'},
        },
      }) // 1
      .mockResolvedValueOnce({
        data: {
          difficulty: 8,
          salt: 'salt',
          address: 'erd1',
          expiresAt: Date.now() + 60000,
        },
      }) // 2a (Challenge)
      .mockResolvedValueOnce({data: {txHash: 'txReg'}}) // 2b (Relay Reg)
      .mockResolvedValueOnce({data: {txHash: 'txProof'}}); // 3 (Retry Proof)

    const txHash = await validator.submitProof('job1', 'hash1');

    expect(txHash).toBe('txProof');
    expect(axios.post).toHaveBeenCalledTimes(4); // Proof(Fail) -> Challenge -> Reg -> Proof(Success)
  });
});
