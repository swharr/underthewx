"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const tempestService_1 = require("../services/tempestService");
const wundergroundService_1 = require("../services/wundergroundService");
const usuScraperService_1 = require("../services/usuScraperService");
const aggregatorService_1 = require("../services/aggregatorService");
const storageService_1 = require("../services/storageService");
const logger_1 = require("../utils/logger");
let tablesEnsured = false;
// ── Shared collection logic ────────────────────────────────────────────────────
async function runCollection() {
    if (!tablesEnsured) {
        await (0, storageService_1.ensureTables)();
        tablesEnsured = true;
    }
    (0, logger_1.log)("info", "collectWeather: starting collection run");
    // Fetch all sources in parallel; failures don't block others
    const [tempestResult, wuResult, usuResult] = await Promise.allSettled([
        (0, tempestService_1.fetchTempest)(),
        (0, wundergroundService_1.fetchWunderground)(),
        (0, usuScraperService_1.fetchAllUsu)(),
    ]);
    const tempest = tempestResult.status === "fulfilled" ? tempestResult.value : null;
    const wunderground = wuResult.status === "fulfilled" ? wuResult.value : null;
    const usu16 = usuResult.status === "fulfilled" ? usuResult.value.usu16 : null;
    const usu1302734 = usuResult.status === "fulfilled" ? usuResult.value.usu1302734 : null;
    if (tempestResult.status === "rejected")
        (0, logger_1.log)("error", "Tempest fetch failed", tempestResult.reason);
    if (wuResult.status === "rejected")
        (0, logger_1.log)("error", "WU fetch failed", wuResult.reason);
    if (usuResult.status === "rejected")
        (0, logger_1.log)("error", "USU fetch failed", usuResult.reason);
    if (!tempest && !wunderground && !usu16 && !usu1302734) {
        (0, logger_1.log)("error", "All stations failed; skipping this collection run");
        return { ok: false, message: "All stations failed" };
    }
    const aggregated = (0, aggregatorService_1.aggregate)({ tempest, wunderground, usu16, usu1302734 });
    const hl = aggregated.homeLocation;
    const now = new Date();
    // Helper to serialize station reading
    const s = (r) => JSON.stringify(r ?? null);
    // Write sentinel row
    await (0, storageService_1.upsertLatest)({
        updatedAt: now.toISOString(),
        aggTempF: hl.tempF,
        aggDewPointF: hl.dewPointF,
        aggHumidity: hl.humidity,
        aggPressureInHg: hl.pressureInHg,
        aggWindSpeedMph: hl.windSpeedMph,
        aggWindDirDeg: hl.windDirDeg,
        aggWindGustMph: hl.windGustMph,
        aggPrecipRateInHr: hl.precipRateInHr,
        aggPrecipTodayIn: hl.precipTodayIn,
        aggSolarWm2: hl.solarWm2,
        aggUvIndex: hl.uvIndex,
        aggFeelsLikeF: hl.feelsLikeF,
        frostRisk: hl.frostRisk,
        ...(hl.estSoilTempF !== undefined && { estSoilTempF: hl.estSoilTempF }),
        ...(hl.estSoilMoisturePct !== undefined && { estSoilMoisturePct: hl.estSoilMoisturePct }),
        tempestJson: s(tempest),
        wundergroundJson: s(wunderground),
        usu16Json: s(usu16),
        usu1302734Json: s(usu1302734),
    });
    // Write 10-min reading
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const entity = {
        partitionKey: `readings-10min-${monthKey}`,
        rowKey: now.toISOString(),
        aggTempF: hl.tempF,
        aggDewPointF: hl.dewPointF,
        aggHumidity: hl.humidity,
        aggPressureInHg: hl.pressureInHg,
        aggWindSpeedMph: hl.windSpeedMph,
        aggWindDirDeg: hl.windDirDeg,
        aggWindGustMph: hl.windGustMph,
        aggPrecipRateInHr: hl.precipRateInHr,
        aggPrecipTodayIn: hl.precipTodayIn,
        aggSolarWm2: hl.solarWm2,
        aggUvIndex: hl.uvIndex,
        aggFeelsLikeF: hl.feelsLikeF,
        frostRisk: hl.frostRisk,
        tempestJson: s(tempest),
        wundergroundJson: s(wunderground),
        usu16Json: s(usu16),
        usu1302734Json: s(usu1302734),
    };
    await (0, storageService_1.insertReading)(entity);
    // Write hourly rollup (overwrite same-hour row)
    const hourKey = now.toISOString().slice(0, 13) + ":00:00.000Z";
    const yearKey = String(now.getUTCFullYear());
    await (0, storageService_1.insertReading)({ ...entity, partitionKey: `readings-hourly-${yearKey}`, rowKey: hourKey });
    // Write daily rollup (overwrite same-day row)
    const dayKey = now.toISOString().slice(0, 10);
    await (0, storageService_1.insertReading)({ ...entity, partitionKey: "readings-daily", rowKey: dayKey });
    (0, logger_1.log)("info", "collectWeather: run complete", { frostRisk: hl.frostRisk });
    return { ok: true, message: `Collection complete. frostRisk=${hl.frostRisk}` };
}
// ── Timer trigger (every 10 min) ───────────────────────────────────────────────
functions_1.app.timer("collectWeather", {
    schedule: "0 */10 * * * *",
    handler: async (_timer, _context) => {
        await runCollection();
    },
});
// ── HTTP trigger (cron fallback for SWA managed Functions) ────────────────────
// Protected by COLLECT_SECRET header — set this in Azure App Settings and
// in the GitHub Actions secret COLLECT_SECRET.
functions_1.app.http("collectWeatherHttp", {
    methods: ["POST"],
    route: "weather/collect",
    authLevel: "anonymous",
    handler: async (req, _context) => {
        const secret = process.env.COLLECT_SECRET;
        const provided = req.headers.get("x-collect-secret");
        if (!secret || !provided || provided !== secret) {
            return { status: 401, jsonBody: { error: "Unauthorized" } };
        }
        const result = await runCollection();
        return {
            status: result.ok ? 200 : 502,
            jsonBody: result,
        };
    },
});
//# sourceMappingURL=collectWeather.js.map