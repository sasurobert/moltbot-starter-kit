import {
  createX402SignatureHeader,
  parseX402Header,
} from '../src/skills/x402_skills';

describe('x402 signature helpers', () => {
  it('creates signature header from signer output', async () => {
    const signer = {
      sign: jest.fn().mockResolvedValue(Buffer.from('aabb', 'hex')),
    } as never;

    const header = await createX402SignatureHeader(signer, 'tx123');
    expect(header).toBe('Signature tx="tx123", sig="aabb"');
  });

  it('returns null when required x402 fields are missing', () => {
    expect(parseX402Header('x402 address="erd1only"')).toBeNull();
    expect(parseX402Header('x402 amount="1000"')).toBeNull();
  });
});
