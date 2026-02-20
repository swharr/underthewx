import { TableClient, TableServiceClient, odata } from "@azure/data-tables";
import type { WeatherLatestEntity, WeatherReadingEntity, PlantingConfigEntity } from "../models/tableEntities";

const CONNECTION_STRING =
  process.env.AZURE_STORAGE_CONNECTION_STRING ?? "UseDevelopmentStorage=true";

function client(table: string): TableClient {
  return TableClient.fromConnectionString(CONNECTION_STRING, table);
}

// ── Tables ───────────────────────────────────────────────────────────────────

export async function ensureTables(): Promise<void> {
  const svc = TableServiceClient.fromConnectionString(CONNECTION_STRING);
  for (const name of ["WeatherLatest", "WeatherReadings", "PlantingConfig"]) {
    try {
      await svc.createTable(name);
    } catch {
      // Ignore already-exists errors
    }
  }
}

// ── WeatherLatest ─────────────────────────────────────────────────────────────

export async function upsertLatest(entity: Omit<WeatherLatestEntity, "partitionKey" | "rowKey">): Promise<void> {
  const c = client("WeatherLatest");
  await c.upsertEntity(
    { partitionKey: "latest", rowKey: "current", ...entity },
    "Replace"
  );
}

export async function getLatest(): Promise<WeatherLatestEntity | null> {
  try {
    const c = client("WeatherLatest");
    const entity = await c.getEntity<WeatherLatestEntity>("latest", "current");
    return entity;
  } catch {
    return null;
  }
}

// ── WeatherReadings ───────────────────────────────────────────────────────────

export async function insertReading(entity: WeatherReadingEntity): Promise<void> {
  const c = client("WeatherReadings");
  await c.upsertEntity(entity, "Replace");
}

export type ReadingResolution = "10min" | "hourly" | "daily";

export async function queryReadings(
  resolution: ReadingResolution,
  hours: number
): Promise<WeatherReadingEntity[]> {
  const c = client("WeatherReadings");
  const now = new Date();

  let partitionKey: string;
  if (resolution === "10min") {
    partitionKey = `readings-10min-${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  } else if (resolution === "hourly") {
    partitionKey = `readings-hourly-${now.getUTCFullYear()}`;
  } else {
    partitionKey = "readings-daily";
  }

  const since = new Date(now.getTime() - hours * 3600_000).toISOString();

  const entities = c.listEntities<WeatherReadingEntity>({
    queryOptions: {
      filter: odata`PartitionKey eq ${partitionKey} and RowKey ge ${since}`,
    },
  });

  const results: WeatherReadingEntity[] = [];
  for await (const e of entities) {
    results.push(e as WeatherReadingEntity);
  }
  return results.sort((a, b) => a.rowKey.localeCompare(b.rowKey));
}

// ── PlantingConfig ────────────────────────────────────────────────────────────

export async function getPlantingConfig(rowKey: string): Promise<PlantingConfigEntity | null> {
  try {
    const c = client("PlantingConfig");
    return await c.getEntity<PlantingConfigEntity>("config", rowKey);
  } catch {
    return null;
  }
}

export async function upsertPlantingConfig(
  rowKey: string,
  value: unknown
): Promise<void> {
  const c = client("PlantingConfig");
  await c.upsertEntity(
    {
      partitionKey: "config",
      rowKey,
      value: JSON.stringify(value),
      lastUpdated: new Date().toISOString(),
    },
    "Replace"
  );
}
