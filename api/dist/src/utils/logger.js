"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.log = log;
function log(level, msg, data) {
    const entry = {
        level,
        timestamp: new Date().toISOString(),
        msg,
        ...(data !== undefined ? { data } : {}),
    };
    if (level === "error") {
        console.error(JSON.stringify(entry));
    }
    else if (level === "warn") {
        console.warn(JSON.stringify(entry));
    }
    else {
        console.log(JSON.stringify(entry));
    }
}
//# sourceMappingURL=logger.js.map