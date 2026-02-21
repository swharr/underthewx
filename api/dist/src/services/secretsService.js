"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSecret = getSecret;
const keyvault_secrets_1 = require("@azure/keyvault-secrets");
const identity_1 = require("@azure/identity");
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
const _cache = new Map();
async function getSecret(name) {
    if (_cache.has(name))
        return _cache.get(name);
    const client = getClient();
    if (client) {
        const secret = await client.getSecret(name);
        const value = secret.value ?? "";
        _cache.set(name, value);
        return value;
    }
    // Local dev: fall back to environment variables
    // Key Vault secret names use PascalCase, env vars use UPPER_SNAKE
    const envKey = name.replace(/([A-Z])/g, "_$1").toUpperCase().replace(/^_/, "");
    const value = process.env[envKey] ?? process.env[name] ?? "";
    if (!value) {
        throw new Error(`Missing secret/env: ${name} / ${envKey}`);
    }
    _cache.set(name, value);
    return value;
}
//# sourceMappingURL=secretsService.js.map