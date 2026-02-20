import { getSecret } from "./secretsService";
import { cacheGet, cacheSet } from "../utils/cache";
import { log } from "../utils/logger";
import type { StationReading } from "../models/weatherTypes";

const STATION_ID = process.env.WU_STATION_ID ?? "KUTLINDO32";
const ELEVATION_FT = 4600;
const CACHE_KEY = "wunderground:latest";
const TTL_MS = 10 * 60 * 1000;

export async function fetchWunderground(): Promise<StationReading> {
  const cached = cacheGet<StationReading>(CACHE_KEY);
  if (cached) return cached;

  const apiKey = await getSecret("WuApiKey");
  const url = `https://api.weather.com/v2/pws/observations/current?stationId=${STATION_ID}&format=json&units=e&apiKey=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`WU API ${res.status}: ${await res.text()}`);

  const data = await res.json() as {
    observations: Array<{
      obsTimeUtc: string;
      imperial: {
        temp: number;
        dewpt: number;
        humidity: number;
        pressure: number;
        windspeed: number;
        winddir: number;
        windgust: number;
        precipRate: number;
        precipTotal: number;
        elev: number;
        solarRadiation: number;
        uv: number;
        heatindex: number;
        windchill: number;
      };
    }>;
  };

  if (!data.observations || data.observations.length === 0) {
    throw new Error("No WU observations");
  }

  const obs = data.observations[0];
  const imp = obs.imperial;

  const tempF = imp.temp;
  const windMph = imp.windspeed;
  const feelsLikeF =
    tempF >= 80 ? (imp.heatindex ?? tempF) : tempF <= 50 && windMph > 3 ? (imp.windchill ?? tempF) : tempF;

  const reading: StationReading = {
    stationId: STATION_ID,
    timestamp: obs.obsTimeUtc,
    tempF,
    dewPointF: imp.dewpt,
    humidity: imp.humidity,
    pressureInHg: imp.pressure,
    windSpeedMph: windMph,
    windDirDeg: imp.winddir,
    windGustMph: imp.windgust,
    precipRateInHr: imp.precipRate,
    precipTodayIn: imp.precipTotal,
    solarWm2: imp.solarRadiation,
    uvIndex: imp.uv,
    feelsLikeF,
    elevationFt: ELEVATION_FT,
    stale: false,
  };

  cacheSet(CACHE_KEY, reading, TTL_MS);
  log("info", "WU fetch OK", { tempF: reading.tempF });
  return reading;
}
