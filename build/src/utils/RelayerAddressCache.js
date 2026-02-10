"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelayerAddressCache = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const CACHE_FILE = path.resolve('.relayer_cache.json');
class RelayerAddressCache {
    static load() {
        if (!fs.existsSync(CACHE_FILE)) {
            return {};
        }
        try {
            return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        }
        catch {
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