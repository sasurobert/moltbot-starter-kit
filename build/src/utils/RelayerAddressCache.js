"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelayerAddressCache = void 0;
const fs = require("fs");
const path = require("path");
const CACHE_FILE = path.resolve('.relayer_cache.json');
class RelayerAddressCache {
    static load() {
        if (!fs.existsSync(CACHE_FILE)) {
            return {};
        }
        try {
            return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        }
        catch (e) {
            console.warn('Failed to load relayer cache, starting fresh.');
            return {};
        }
    }
    static save(cache) {
        fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2));
    }
    static get(url, userAddress) {
        const cache = this.load();
        const entry = cache[url]?.[userAddress];
        if (entry) {
            // Optional: Expiry check (e.g. 24h) - for now assuming static
            return entry.relayerAddress;
        }
        return null;
    }
    static set(url, userAddress, relayerAddress) {
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
exports.RelayerAddressCache = RelayerAddressCache;
//# sourceMappingURL=RelayerAddressCache.js.map