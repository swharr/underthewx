"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchTempest = fetchTempest;
const secretsService_1 = require("./secretsService");
const cache_1 = require("../utils/cache");
const logger_1 = require("../utils/logger");
const STATION_ID = process.env.TEMPEST_STATION_ID ?? "189439";
const ELEVATION_FT = 4600;
const CACHE_KEY = "tempest:latest";
const TTL_MS = 10 * 60 * 1000; // 10 minutes
function obsToReading(obs) {
    return {
        stationId: `tempest-${STATION_ID}`,
        timestamp: new Date(obs.timestamp * 1000).toISOString(),
        tempF: obs.air_temperature * 9 / 5 + 32,
        dewPointF: obs.dew_point * 9 / 5 + 32,
        humidity: obs.relative_humidity,
        pressureInHg: obs.station_pressure * 0.02953,
        windSpeedMph: obs.wind_avg * 2.237,
        windDirDeg: obs.wind_direction,
        windGustMph: obs.wind_gust * 2.237,
        precipRateInHr: obs.precip * 39.3701,
        precipTodayIn: obs.precip_accum_local_day * 0.0393701,
        solarWm2: obs.solar_radiation,
        uvIndex: obs.uv,
        feelsLikeF: obs.feels_like * 9 / 5 + 32,
        elevationFt: ELEVATION_FT,
        stale: false,
    };
}
async function fetchTempest() {
    const cached = (0, cache_1.cacheGet)(CACHE_KEY);
    if (cached)
        return cached;
    const token = await (0, secretsService_1.getSecret)("TempestApiToken");
    const url = `https://swd.weatherflow.com/swd/rest/observations/station/${STATION_ID}?token=${token}`;
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`Tempest API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (!data.obs || data.obs.length === 0)
        throw new Error("No Tempest observations");
    const reading = obsToReading(data.obs[0]);
    (0, cache_1.cacheSet)(CACHE_KEY, reading, TTL_MS);
    (0, logger_1.log)("info", "Tempest fetch OK", { tempF: reading.tempF });
    return reading;
}
//# sourceMappingURL=tempestService.js.map