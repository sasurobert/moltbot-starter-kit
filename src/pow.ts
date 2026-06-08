import {createHash} from 'crypto';
import {Logger} from './utils/logger';

export interface Challenge {
  address: string;
  salt: string;
  difficulty: number;
  target?: string;
  expiresAt?: number;
}

export class PoWSolver {
  private logger = new Logger('PoWSolver');

  solve(challenge: Challenge): string {
    this.logger.info(`Solving challenge (Diff: ${challenge.difficulty})...`);
    const start = Date.now();
    let nonce = 0;

    while (true) {
      const nonceStr = nonce.toString();
      const data = `${challenge.address}${challenge.salt}${nonceStr}`;
      const hash = createHash('sha256').update(data).digest();

      if (this.checkDifficulty(hash, challenge.difficulty)) {
        this.logger.info(
          `Solved in ${Date.now() - start}ms. Nonce: ${nonceStr}`,
        );
        return nonceStr;
      }

      nonce++;
      if (
        challenge.expiresAt !== undefined &&
        nonce % 100000 === 0 &&
        Date.now() > challenge.expiresAt
      ) {
        throw new Error('Challenge expired during solving');
      }
    }
  }

  private checkDifficulty(hash: Buffer, difficulty: number): boolean {
    const fullBytes = Math.floor(difficulty / 8);
    const remainingBits = difficulty % 8;

    for (let i = 0; i < fullBytes; i++) {
      if (hash[i] !== 0) return false;
    }

    if (remainingBits > 0) {
      const lastByte = hash[fullBytes];
      if (lastByte >= 1 << (8 - remainingBits)) return false;
    }

    return true;
  }
}
