"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withRetry = withRetry;
async function withRetry(fn, retries = 2, delayMs = 1000) {
    for (let attempt = 0; attempt <= retries; attempt++) {
        try {
            return await fn();
        }
        catch (err) {
            if (attempt === retries)
                throw err;
            await new Promise((r) => setTimeout(r, delayMs * Math.pow(2, attempt)));
        }
    }
    throw new Error("unreachable");
}
//# sourceMappingURL=retry.js.map