/* eslint-disable @typescript-eslint/no-explicit-any */
import axios from 'axios';
import {
  applyFreshNonce,
  sign,
  withRelayer,
  signAndSend,
  signAndRelay,
} from '../src/chain/tx';

jest.mock('axios');
jest.mock('@multiversx/sdk-core', () => {
  return {
    TransactionComputer: jest.fn().mockImplementation(() => ({
      computeBytesForSigning: jest.fn(() => Buffer.from('bytes')),
    })),
  };
});

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('chain/tx helpers', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('applyFreshNonce fetches account nonce and sets tx.nonce', async () => {
    const tx: any = {nonce: 0n};
    const sender: any = {toBech32: () => 'erd1sender'};
    const provider: any = {
      getAccount: jest.fn().mockResolvedValue({nonce: 7}),
    };

    await applyFreshNonce(tx, sender, provider);

    expect(provider.getAccount).toHaveBeenCalled();
    expect(tx.nonce).toBe(7n);
  });

  it('sign computes signing bytes and sets tx.signature', async () => {
    const tx: any = {};
    const signer: any = {sign: jest.fn().mockResolvedValue(Buffer.from('sig'))};

    await sign(tx, signer);

    expect(signer.sign).toHaveBeenCalled();
    expect(tx.signature).toEqual(Buffer.from('sig'));
  });

  it('withRelayer sets relayer/version and adds gas overhead', () => {
    const tx: any = {gasLimit: 1_000_000n};
    const relayer: any = {toBech32: () => 'erd1relayer'};

    withRelayer(tx, relayer);

    expect(tx.relayer).toBe(relayer);
    expect(tx.version).toBe(2);
    expect(tx.gasLimit).toBeGreaterThan(1_000_000n);
  });

  it('signAndSend stamps nonce, signs and broadcasts', async () => {
    const tx: any = {};
    const signer: any = {sign: jest.fn().mockResolvedValue(Buffer.from('sig'))};
    const sender: any = {toBech32: () => 'erd1sender'};
    const provider: any = {
      getAccount: jest.fn().mockResolvedValue({nonce: 9}),
      sendTransaction: jest.fn().mockResolvedValue('tx-hash'),
    };

    const hash = await signAndSend(tx, signer, sender, provider);

    expect(hash).toBe('tx-hash');
    expect(provider.sendTransaction).toHaveBeenCalledWith(tx);
    expect(tx.nonce).toBe(9n);
    expect(tx.signature).toEqual(Buffer.from('sig'));
  });

  it('signAndRelay stamps nonce, signs and sends to relayer endpoint', async () => {
    const tx: any = {toPlainObject: jest.fn(() => ({foo: 'bar'}))};
    const signer: any = {sign: jest.fn().mockResolvedValue(Buffer.from('sig'))};
    const sender: any = {toBech32: () => 'erd1sender'};
    const provider: any = {
      getAccount: jest.fn().mockResolvedValue({nonce: 3}),
    };
    mockedAxios.post.mockResolvedValueOnce({
      data: {txHash: 'relayed-hash'},
    } as any);

    const hash = await signAndRelay(
      tx,
      signer,
      sender,
      provider,
      'http://relayer.local',
    );

    expect(hash).toBe('relayed-hash');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://relayer.local/relay',
      {transaction: {foo: 'bar'}},
      expect.objectContaining({timeout: expect.any(Number)}),
    );
  });
});
