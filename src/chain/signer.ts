import {UserSigner} from '@multiversx/sdk-wallet';
import {Address} from '@multiversx/sdk-core';
import {promises as fs} from 'fs';
import * as fsSync from 'fs';
import * as path from 'path';

/**
 * Resolves a PEM path with a consistent priority order and returns a UserSigner.
 *
 * Priority: explicit pemPath > MULTIVERSX_PRIVATE_KEY > AGENT_PEM_PATH > BOT_PEM_PATH > ./wallet.pem
 *
 * Synchronous version — used by scripts that need a signer immediately.
 */
export function loadSignerSync(pemPath?: string): UserSigner {
  const p =
    pemPath ||
    process.env.MULTIVERSX_PRIVATE_KEY ||
    process.env.AGENT_PEM_PATH ||
    process.env.BOT_PEM_PATH ||
    'wallet.pem';

  const resolved = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  if (!fsSync.existsSync(resolved)) {
    throw new Error(`Signer PEM not found at: ${resolved}`);
  }
  return UserSigner.fromPem(fsSync.readFileSync(resolved, 'utf8'));
}

/**
 * Async version — preferred from library code (non-blocking PEM read).
 */
export async function loadSigner(pemPath?: string): Promise<UserSigner> {
  const p =
    pemPath ||
    process.env.MULTIVERSX_PRIVATE_KEY ||
    process.env.AGENT_PEM_PATH ||
    process.env.BOT_PEM_PATH ||
    'wallet.pem';

  const resolved = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  return UserSigner.fromPem(await fs.readFile(resolved, 'utf8'));
}

/**
 * Convenience: returns both the signer and its bech32 sender Address.
 */
export async function loadSignerWithAddress(pemPath?: string): Promise<{
  signer: UserSigner;
  senderAddress: Address;
}> {
  const signer = await loadSigner(pemPath);
  const senderAddress = Address.newFromBech32(signer.getAddress().bech32());
  return {signer, senderAddress};
}
