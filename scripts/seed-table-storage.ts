/**
 * seed-table-storage.ts
 * Creates all required Azure Table Storage tables.
 * Run once: npx ts-node scripts/seed-table-storage.ts
 *
 * Uses Azurite (local emulator) by default.
 * Set AZURE_STORAGE_CONNECTION_STRING in .env for production.
 */

import { TableServiceClient } from "@azure/data-tables";

const CONNECTION_STRING =
  process.env.AZURE_STORAGE_CONNECTION_STRING ?? "UseDevelopmentStorage=true";

const TABLES = ["WeatherLatest", "WeatherReadings", "PlantingConfig"];

async function main() {
  const client = TableServiceClient.fromConnectionString(CONNECTION_STRING);

  for (const tableName of TABLES) {
    try {
      await client.createTable(tableName);
      console.log(`  ✓ Created table: ${tableName}`);
    } catch (err: unknown) {
      const e = err as { statusCode?: number; message?: string };
      if (e?.statusCode === 409) {
        console.log(`  ~ Table already exists: ${tableName}`);
      } else {
        console.error(`  ✗ Failed to create ${tableName}:`, e?.message);
      }
    }
  }

  // Seed default zone config
  const { TableClient } = await import("@azure/data-tables");
  const configClient = TableClient.fromConnectionString(CONNECTION_STRING, "PlantingConfig");
  try {
    await configClient.upsertEntity(
      {
        partitionKey: "config",
        rowKey: "zone",
        value: JSON.stringify({
          zone: "6b-7a",
          verifiedDate: "2026-02-20",
        }),
        lastUpdated: new Date().toISOString(),
      },
      "Replace"
    );
    console.log("  ✓ Seeded zone config (6b-7a, verified 2026-02-20)");
  } catch (e: unknown) {
    const err = e as { message?: string };
    console.error("  ✗ Failed to seed zone config:", err?.message);
  }

  console.log("\nDone. Tables ready.");
}

main().catch(console.error);
