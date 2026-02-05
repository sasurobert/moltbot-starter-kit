import * as fs from 'fs';
import * as path from 'path';

interface CacheEntry {
  relayerAddress: string;
  timestamp: number;
}

interface CacheStore {
  [url: string]: {
    [userAddress: string]: CacheEntry;
  };
}

const CACHE_FILE = path.resolve('.relayer_cache.json');

export class RelayerAddressCache {
  private static load(): CacheStore {
    if (!fs.existsSync(CACHE_FILE)) {
      return {};
    }
    try {
      return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
    } catch (e) {
      console.warn('Failed to load relayer cache, starting fresh.');
      return {};
    }
  }

  private static save(cache: CacheStore) {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
  }

  static get(url: string, userAddress: string): string | null {
    const cache = this.load();
    const entry = cache[url]?.[userAddress];
    if (entry) {
      // Optional: Expiry check (e.g. 24h) - for now assuming static
      return entry.relayerAddress;
    }
    return null;
  }

  static set(url: string, userAddress: string, relayerAddress: string) {
    const cache = this.load();
    if (!cache[url]) {
      cache[url] = {};
    }
    cache[url][userAddress] = {
      relayerAddress,
      timestamp: Date.now(),
    };
    this.save(cache);
  }
}
