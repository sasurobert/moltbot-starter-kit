import {UserSigner} from '@multiversx/sdk-wallet';
import {Address} from '@multiversx/sdk-core';
import fs from 'fs';
import path from 'path';
import {CONFIG} from '../config';
import {RelayerAddressCache} from './RelayerAddressCache';

/**
 * Resolves a PEM path and returns a UserSigner.
 * Priority: customPath, then env variables, then default wallet.pem.
 */
export function getSigner(customPath?: string): UserSigner {
  const p =
    customPath ||
    process.env.AGENT_PEM_PATH ||
    process.env.BOT_PEM_PATH ||
    process.env.MULTIVERSX_PRIVATE_KEY ||
    'wallet.pem';

  const resolvedPath = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);

  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Signer PEM not found at: ${resolvedPath}`);
  }

  return UserSigner.fromPem(fs.readFileSync(resolvedPath, 'utf8'));
}

/**
 * Fetches the specific relayer address for a sender's shard, with caching.
 */
export async function getRelayerAddress(sender: Address): Promise<string> {
  const relayerBase = CONFIG.PROVIDERS.RELAYER_URL;
  const cached = RelayerAddressCache.get(relayerBase, sender.toBech32());
  if (cached) return cached;

  const url = `${relayerBase.replace(/\/$/, '')}/relayer/address/${sender.toBech32()}`;
  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Relayer address fetch failed: ${response.status} ${text}`);
  }

  const {relayerAddress} = (await response.json()) as {relayerAddress: string};
  RelayerAddressCache.set(relayerBase, sender.toBech32(), relayerAddress);
  return relayerAddress;
}

export interface ITransactionPlainObject {
  nonce: number;
  value: string;
  receiver: string;
  sender: string;
  gasPrice: number;
  gasLimit: number;
  data?: string;
  signature?: string;
  chainID: string;
  version: number;
  options?: number;
}

/**
 * Standard relay function.
 */
export async function relayTransaction(
  txPlain: ITransactionPlainObject,
): Promise<string> {
  const relayerBase = CONFIG.PROVIDERS.RELAYER_URL;
  const url = `${relayerBase.replace(/\/$/, '')}/relay`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({transaction: txPlain}),
  });

  const result = (await response.json()) as {txHash?: string; error?: string};
  if (result.txHash) {
    return result.txHash;
  }
  throw new Error(result.error || JSON.stringify(result));
}
