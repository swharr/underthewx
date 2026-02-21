"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureTables = ensureTables;
exports.upsertLatest = upsertLatest;
exports.getLatest = getLatest;
exports.insertReading = insertReading;
exports.queryReadings = queryReadings;
exports.getPlantingConfig = getPlantingConfig;
exports.upsertPlantingConfig = upsertPlantingConfig;
const data_tables_1 = require("@azure/data-tables");
const CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING ?? "UseDevelopmentStorage=true";
function client(table) {
    return data_tables_1.TableClient.fromConnectionString(CONNECTION_STRING, table);
}
// ── Tables ───────────────────────────────────────────────────────────────────
async function ensureTables() {
    const svc = data_tables_1.TableServiceClient.fromConnectionString(CONNECTION_STRING);
    for (const name of ["WeatherLatest", "WeatherReadings", "PlantingConfig"]) {
        try {
            await svc.createTable(name);
        }
        catch {
            // Ignore already-exists errors
        }
    }
}
// ── WeatherLatest ─────────────────────────────────────────────────────────────
async function upsertLatest(entity) {
    const c = client("WeatherLatest");
    await c.upsertEntity({ partitionKey: "latest", rowKey: "current", ...entity }, "Replace");
}
async function getLatest() {
    try {
        const c = client("WeatherLatest");
        const entity = await c.getEntity("latest", "current");
        return entity;
    }
    catch {
        return null;
    }
}
// ── WeatherReadings ───────────────────────────────────────────────────────────
async function insertReading(entity) {
    const c = client("WeatherReadings");
    await c.upsertEntity(entity, "Replace");
}
async function queryReadings(resolution, hours) {
    const c = client("WeatherReadings");
    const now = new Date();
    let partitionKey;
    if (resolution === "10min") {
        partitionKey = `readings-10min-${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    }
    else if (resolution === "hourly") {
        partitionKey = `readings-hourly-${now.getUTCFullYear()}`;
    }
    else {
        partitionKey = "readings-daily";
    }
    const since = new Date(now.getTime() - hours * 3600_000).toISOString();
    const entities = c.listEntities({
        queryOptions: {
            filter: (0, data_tables_1.odata) `PartitionKey eq ${partitionKey} and RowKey ge ${since}`,
        },
    });
    const results = [];
    for await (const e of entities) {
        results.push(e);
    }
    return results.sort((a, b) => a.rowKey.localeCompare(b.rowKey));
}
// ── PlantingConfig ────────────────────────────────────────────────────────────
async function getPlantingConfig(rowKey) {
    try {
        const c = client("PlantingConfig");
        return await c.getEntity("config", rowKey);
    }
    catch {
        return null;
    }
}
async function upsertPlantingConfig(rowKey, value) {
    const c = client("PlantingConfig");
    await c.upsertEntity({
        partitionKey: "config",
        rowKey,
        value: JSON.stringify(value),
        lastUpdated: new Date().toISOString(),
    }, "Replace");
}
//# sourceMappingURL=storageService.js.map