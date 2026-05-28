import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {Address} from '@multiversx/sdk-core';
import {UserSigner} from '@multiversx/sdk-wallet';
import {
  loadSignerSync,
  loadSigner,
  loadSignerWithAddress,
} from '../src/chain/signer';

jest.mock('@multiversx/sdk-wallet', () => ({
  UserSigner: {
    fromPem: jest.fn(),
  },
}));

describe('chain/signer', () => {
  const mockedFromPem = UserSigner.fromPem as jest.Mock;
  let tmpDir: string;
  const originalCwd = process.cwd();

  beforeEach(() => {
    jest.clearAllMocks();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'signer-test-'));
    process.chdir(tmpDir);
    delete process.env.MULTIVERSX_PRIVATE_KEY;
    delete process.env.AGENT_PEM_PATH;
    delete process.env.BOT_PEM_PATH;
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tmpDir, {recursive: true, force: true});
  });

  it('loadSignerSync throws when pem does not exist', () => {
    expect(() => loadSignerSync('missing.pem')).toThrow('Signer PEM not found');
  });

  it('loadSignerSync reads pem and returns signer', () => {
    fs.writeFileSync(path.join(tmpDir, 'wallet.pem'), 'pem-content', 'utf8');
    mockedFromPem.mockReturnValueOnce({id: 'signer-sync'});

    const signer = loadSignerSync();

    expect(mockedFromPem).toHaveBeenCalledWith('pem-content');
    expect(signer).toEqual({id: 'signer-sync'});
  });

  it('loadSigner uses env fallback path', async () => {
    const pemPath = path.join(tmpDir, 'agent.pem');
    fs.writeFileSync(pemPath, 'async-pem', 'utf8');
    process.env.AGENT_PEM_PATH = pemPath;
    mockedFromPem.mockReturnValueOnce({id: 'signer-async'});

    const signer = await loadSigner();

    expect(mockedFromPem).toHaveBeenCalledWith('async-pem');
    expect(signer).toEqual({id: 'signer-async'});
  });

  it('loadSignerWithAddress returns signer and bech32 sender address', async () => {
    const pemPath = path.join(tmpDir, 'wallet.pem');
    fs.writeFileSync(pemPath, 'pem-content', 'utf8');
    const bech =
      'erd1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq6gq4hu';
    mockedFromPem.mockReturnValueOnce({
      getAddress: () => ({bech32: () => bech}),
    });

    const result = await loadSignerWithAddress('wallet.pem');

    expect(result.signer).toBeDefined();
    expect(result.senderAddress).toBeInstanceOf(Address);
    expect(result.senderAddress.toBech32()).toBe(bech);
  });
});
