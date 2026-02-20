import { app, InvocationContext, Timer } from "@azure/functions";
import { fetchTempest } from "../services/tempestService";
import { fetchWunderground } from "../services/wundergroundService";
import { fetchAllUsu } from "../services/usuScraperService";
import { aggregate } from "../services/aggregatorService";
import { upsertLatest, insertReading, ensureTables } from "../services/storageService";
import { log } from "../utils/logger";
import type { StationReading } from "../models/weatherTypes";
import type { WeatherReadingEntity } from "../models/tableEntities";

let tablesEnsured = false;

app.timer("collectWeather", {
  schedule: "0 */10 * * * *",
  handler: async (_timer: Timer, context: InvocationContext) => {
    if (!tablesEnsured) {
      await ensureTables();
      tablesEnsured = true;
    }

    log("info", "collectWeather: starting collection run");

    // Fetch all sources in parallel; failures don't block others
    const [tempestResult, wuResult, usuResult] = await Promise.allSettled([
      fetchTempest(),
      fetchWunderground(),
      fetchAllUsu(),
    ]);

    const tempest: StationReading | null =
      tempestResult.status === "fulfilled" ? tempestResult.value : null;
    const wunderground: StationReading | null =
      wuResult.status === "fulfilled" ? wuResult.value : null;
    const usu16: StationReading | null =
      usuResult.status === "fulfilled" ? usuResult.value.usu16 : null;
    const usu1302734: StationReading | null =
      usuResult.status === "fulfilled" ? usuResult.value.usu1302734 : null;

    if (tempestResult.status === "rejected")
      log("error", "Tempest fetch failed", tempestResult.reason);
    if (wuResult.status === "rejected")
      log("error", "WU fetch failed", wuResult.reason);
    if (usuResult.status === "rejected")
      log("error", "USU fetch failed", usuResult.reason);

    if (!tempest && !wunderground && !usu16 && !usu1302734) {
      log("error", "All stations failed; skipping this collection run");
      return;
    }

    const aggregated = aggregate({ tempest, wunderground, usu16, usu1302734 });
    const hl = aggregated.homeLocation;
    const now = new Date();

    // Helper to serialize station reading
    const s = (r: StationReading | null) => JSON.stringify(r ?? null);

    // Write sentinel row
    await upsertLatest({
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
      tempestJson: s(tempest),
      wundergroundJson: s(wunderground),
      usu16Json: s(usu16),
      usu1302734Json: s(usu1302734),
    });

    // Write 10-min reading
    const monthKey = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
    const entity: WeatherReadingEntity = {
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
    await insertReading(entity);

    // Write hourly rollup (overwrite same-hour row)
    const hourKey = now.toISOString().slice(0, 13) + ":00:00.000Z";
    const yearKey = String(now.getUTCFullYear());
    await insertReading({ ...entity, partitionKey: `readings-hourly-${yearKey}`, rowKey: hourKey });

    // Write daily rollup (overwrite same-day row)
    const dayKey = now.toISOString().slice(0, 10);
    await insertReading({ ...entity, partitionKey: "readings-daily", rowKey: dayKey });

    log("info", "collectWeather: run complete", { frostRisk: hl.frostRisk });
  },
});
