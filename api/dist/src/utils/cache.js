"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cacheGet = cacheGet;
exports.cacheSet = cacheSet;
const store = new Map();
function cacheGet(key) {
    const entry = store.get(key);
    if (!entry)
        return undefined;
    if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return undefined;
    }
    return entry.data;
}
function cacheSet(key, data, ttlMs) {
    store.set(key, { data, expiresAt: Date.now() + ttlMs });
}
//# sourceMappingURL=cache.js.map