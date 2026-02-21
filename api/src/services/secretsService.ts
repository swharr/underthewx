import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";
import { log } from "../utils/logger";

let _client: SecretClient | null = null;

function getClient(): SecretClient | null {
  const uri = process.env.KEY_VAULT_URI;
  if (!uri) return null;
  if (!_client) {
    _client = new SecretClient(uri, new DefaultAzureCredential());
  }
  return _client;
}

// PascalCase → UPPER_SNAKE  (e.g. TempestApiToken → TEMPEST_API_TOKEN)
function toEnvKey(name: string): string {
  return name.replace(/([A-Z])/g, "_$1").toUpperCase().replace(/^_/, "");
}

const _cache = new Map<string, string>();

export async function getSecret(name: string): Promise<string> {
  if (_cache.has(name)) return _cache.get(name)!;

  const envKey = toEnvKey(name);

  // Try Key Vault first
  const client = getClient();
  if (client) {
    try {
      const secret = await client.getSecret(name);
      const value = secret.value ?? "";
      _cache.set(name, value);
      return value;
    } catch (err) {
      // Key Vault failed — fall through to env var fallback below
      log("warn", `Key Vault getSecret failed for "${name}", trying env var "${envKey}"`, err);
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
