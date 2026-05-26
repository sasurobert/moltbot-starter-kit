import {Address} from '@multiversx/sdk-core';
import axios from 'axios';
import {CONFIG} from '../config';
import {RelayerAddressCache} from '../utils/RelayerAddressCache';
import {Logger} from '../utils/logger';

const logger = new Logger('Relayer');

/**
 * Discovers the relayer address for a sender's shard, with disk caching.
 *
 * Priority:
 * 1. MULTIVERSX_RELAYER_ADDRESS env var (explicit override)
 * 2. On-disk cache (.relayer_cache.json)
 * 3. GET <RELAYER_URL>/relayer/address/<sender>
 *
 * Returns null if the relayer is unreachable AND no cache/env hit exists.
 */
export async function discoverRelayerAddress(
  sender: Address,
): Promise<string | null> {
  const explicit = process.env.MULTIVERSX_RELAYER_ADDRESS;
  if (explicit) return explicit;

  const relayerBase = CONFIG.PROVIDERS.RELAYER_URL;
  const senderBech = sender.toBech32();

  const cached = RelayerAddressCache.get(relayerBase, senderBech);
  if (cached) return cached;

  try {
    const url = `${relayerBase.replace(/\/$/, '')}/relayer/address/${senderBech}`;
    const resp = await axios.get(url, {timeout: CONFIG.REQUEST_TIMEOUT});
    const addr = resp.data?.relayerAddress;
    if (addr) {
      RelayerAddressCache.set(relayerBase, senderBech, addr);
      return addr;
    }
    return null;
  } catch (e) {
    logger.warn(`Failed to discover relayer address: ${(e as Error).message}`);
    return null;
  }
}
