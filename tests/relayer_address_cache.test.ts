import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('RelayerAddressCache', () => {
  const originalCwd = process.cwd();
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'relayer-cache-'));
    process.chdir(tempDir);
    jest.resetModules();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, {recursive: true, force: true});
  });

  test('returns null when cache file does not exist', async () => {
    const {RelayerAddressCache} =
      await import('../src/utils/RelayerAddressCache');
    expect(
      RelayerAddressCache.get('http://relayer.local', 'erd1user'),
    ).toBeNull();
  });

  test('persists and retrieves cached relayer address', async () => {
    const {RelayerAddressCache} =
      await import('../src/utils/RelayerAddressCache');

    RelayerAddressCache.set(
      'http://relayer.local',
      'erd1user',
      'erd1relayeraddress',
    );

    const value = RelayerAddressCache.get('http://relayer.local', 'erd1user');
    expect(value).toBe('erd1relayeraddress');

    const cachePath = path.resolve('.relayer_cache.json');
    const raw = fs.readFileSync(cachePath, 'utf8');
    const parsed = JSON.parse(raw) as Record<
      string,
      Record<string, {relayerAddress: string; timestamp: number}>
    >;

    expect(parsed['http://relayer.local']['erd1user'].relayerAddress).toBe(
      'erd1relayeraddress',
    );
    expect(typeof parsed['http://relayer.local']['erd1user'].timestamp).toBe(
      'number',
    );
  });

  test('returns null when cache file is invalid JSON', async () => {
    const cachePath = path.resolve('.relayer_cache.json');
    fs.writeFileSync(cachePath, '{invalid json}', 'utf8');
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

    const {RelayerAddressCache} =
      await import('../src/utils/RelayerAddressCache');
    expect(
      RelayerAddressCache.get('http://relayer.local', 'erd1user'),
    ).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(
      'Failed to load relayer cache, starting fresh.',
    );

    warnSpy.mockRestore();
  });
});
