"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecret = getSecret;
const keyvault_secrets_1 = require("@azure/keyvault-secrets");
const identity_1 = require("@azure/identity");
const logger_1 = require("../utils/logger");
let _client = null;
function getClient() {
    const uri = process.env.KEY_VAULT_URI;
    if (!uri)
        return null;
    if (!_client) {
        _client = new keyvault_secrets_1.SecretClient(uri, new identity_1.DefaultAzureCredential());
    }
    return _client;
}
// PascalCase → UPPER_SNAKE  (e.g. TempestApiToken → TEMPEST_API_TOKEN)
function toEnvKey(name) {
    return name.replace(/([A-Z])/g, "_$1").toUpperCase().replace(/^_/, "");
}
const _cache = new Map();
async function getSecret(name) {
    if (_cache.has(name))
        return _cache.get(name);
    const envKey = toEnvKey(name);
    // Try Key Vault first
    const client = getClient();
    if (client) {
        try {
            const secret = await client.getSecret(name);
            const value = secret.value ?? "";
            _cache.set(name, value);
            return value;
        }
        catch (err) {
            // Key Vault failed — fall through to env var fallback below
            (0, logger_1.log)("warn", `Key Vault getSecret failed for "${name}", trying env var "${envKey}"`, err);
        }
    }
    // Fall back to environment variables (local dev or app settings override)
    const value = process.env[envKey] ?? process.env[name] ?? "";
    if (!value) {
        throw new Error(`Missing secret/env: ${name} / ${envKey}`);
    }
    _cache.set(name, value);
    return value;
}
//# sourceMappingURL=secretsService.js.map