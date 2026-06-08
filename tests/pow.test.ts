/* eslint-disable @typescript-eslint/no-explicit-any */
import {PoWSolver} from '../src/pow';

describe('PoWSolver', () => {
  it('solves trivial challenge with zero difficulty', () => {
    const solver = new PoWSolver();
    const nonce = solver.solve({
      address: 'erd1a',
      salt: 'salt',
      difficulty: 0,
    });
    expect(nonce).toBe('0');
  });

  it('checkDifficulty validates full-byte and bit-prefix cases', () => {
    const solver = new PoWSolver() as any;

    expect(solver.checkDifficulty(Buffer.from([0x00, 0x00]), 8)).toBe(true);
    expect(solver.checkDifficulty(Buffer.from([0x01, 0x00]), 8)).toBe(false);

    // For 12 bits: first byte must be 0, and high 4 bits of second byte must be 0.
    expect(solver.checkDifficulty(Buffer.from([0x00, 0x0f]), 12)).toBe(true);
    expect(solver.checkDifficulty(Buffer.from([0x00, 0xf0]), 12)).toBe(false);
  });
});
