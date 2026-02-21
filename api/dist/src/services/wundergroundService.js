"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchWunderground = fetchWunderground;
const secretsService_1 = require("./secretsService");
const cache_1 = require("../utils/cache");
const logger_1 = require("../utils/logger");
const STATION_ID = process.env.WU_STATION_ID ?? "KUTLINDO32";
const ELEVATION_FT = 4600;
const CACHE_KEY = "wunderground:latest";
const TTL_MS = 10 * 60 * 1000;
async function fetchWunderground() {
    const cached = (0, cache_1.cacheGet)(CACHE_KEY);
    if (cached)
        return cached;
    const apiKey = await (0, secretsService_1.getSecret)("WuApiKey");
    const url = `https://api.weather.com/v2/pws/observations/current?stationId=${STATION_ID}&format=json&units=e&apiKey=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok)
        throw new Error(`WU API ${res.status}: ${await res.text()}`);
    const data = await res.json();
    if (!data.observations || data.observations.length === 0) {
        throw new Error("No WU observations");
    }
    const obs = data.observations[0];
    const imp = obs.imperial;
    const tempF = imp.temp;
    const windMph = imp.windSpeed ?? 0;
    const feelsLikeF = tempF >= 80 ? (imp.heatIndex ?? tempF) : tempF <= 50 && windMph > 3 ? (imp.windChill ?? tempF) : tempF;
    const reading = {
        stationId: STATION_ID,
        timestamp: obs.obsTimeUtc,
        tempF,
        dewPointF: imp.dewpt,
        humidity: obs.humidity ?? 0,
        pressureInHg: imp.pressure,
        windSpeedMph: windMph,
        windDirDeg: obs.winddir ?? 0,
        windGustMph: imp.windGust ?? 0,
        precipRateInHr: imp.precipRate,
        precipTodayIn: imp.precipTotal,
        solarWm2: obs.solarRadiation ?? 0,
        uvIndex: obs.uv ?? 0,
        feelsLikeF,
        elevationFt: ELEVATION_FT,
        stale: false,
    };
    (0, cache_1.cacheSet)(CACHE_KEY, reading, TTL_MS);
    (0, logger_1.log)("info", "WU fetch OK", { tempF: reading.tempF });
    return reading;
}
//# sourceMappingURL=wundergroundService.js.map