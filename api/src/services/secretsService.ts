import { SecretClient } from "@azure/keyvault-secrets";
import { DefaultAzureCredential } from "@azure/identity";

let _client: SecretClient | null = null;

function getClient(): SecretClient | null {
  const uri = process.env.KEY_VAULT_URI;
  if (!uri) return null;
  if (!_client) {
    _client = new SecretClient(uri, new DefaultAzureCredential());
  }
  return _client;
}

const _cache = new Map<string, string>();

export async function getSecret(name: string): Promise<string> {
  if (_cache.has(name)) return _cache.get(name)!;

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
