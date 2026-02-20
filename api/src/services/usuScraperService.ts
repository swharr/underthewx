/**
 * usuScraperService.ts
 * Fetches data from USU FGNET stations via the undocumented but stable
 * mchdServices.php JSON API discovered in the quickview page source.
 *
 * API: GET /mchd/dashboard/mchdServices.php?query_id=5&network=FGNET&station_id={id}&units=E
 * query_id=5  → current 10-min data (most recent rows)
 * query_id=6  → hourly data
 * query_id=7  → daily data
 *
 * Fields returned (imperial units when units=E):
 *   airt_avg    Air temperature (°F)
 *   td_avg      Dew point (°F)
 *   rh_avg      Relative humidity (%)
 *   solarw_avg  Solar radiation (W/m²)
 *   winds_avg   Wind speed (mph)
 *   winds_max   Wind gust (mph)
 *   windd_avg   Wind direction (degrees)
 *   rain        Precipitation (inches, interval)
 *   soilt10_i   Soil temperature at 10" (°F)
 *   soilm10_i   Soil moisture at 10" (volumetric %)
 *   lwspct_wet  Leaf wetness (%)
 *   date_time   "YYYY-MM-DD HH:MM:SS" MST
 */

import { cacheGet, cacheSet } from "../utils/cache";
import { withRetry } from "../utils/retry";
import { log } from "../utils/logger";
import type { StationReading } from "../models/weatherTypes";

const STATIONS = {
  usu16: {
    id: "16",
    elevationFt: 4745,
    cacheKey: "usu16:latest",
  },
  usu1302734: {
    id: "1302734",
    elevationFt: 5475,
    cacheKey: "usu1302734:latest",
  },
} as const;

type StationKey = keyof typeof STATIONS;

const TTL_MS = 10 * 60 * 1000;
const API_BASE = "https://climate.usu.edu/mchd/dashboard/mchdServices.php";
const QUERY_CURRENT = 5; // Most recent 10-min readings

interface MchdRow {
  station_id: string;
  airt_avg: string | null;
  td_avg: string | null;
  rh_avg: string | null;
  solarw_avg: string | null;
  winds_avg: string | null;
  winds_max: string | null;
  windd_avg: string | null;
  rain: string | null;
  soilt10_i: string | null;
  soilm10_i: string | null;
  lwspct_wet: string | null;
  date_time: string | null;
}

interface MchdResponse {
  success: boolean;
  payload: MchdRow[];
}

function pf(v: string | null | undefined): number {
  if (v == null) return 0;
  const n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function buildUrl(stationId: string): string {
  return `${API_BASE}?query_id=${QUERY_CURRENT}&network=FGNET&station_id=${stationId}&units=E`;
}

export async function fetchUsu(stationKey: StationKey): Promise<StationReading> {
  const cfg = STATIONS[stationKey];
  const cached = cacheGet<StationReading>(cfg.cacheKey);
  if (cached) return cached;

  const data = await withRetry(async () => {
    const res = await fetch(buildUrl(cfg.id), {
      headers: {
        "User-Agent": "UnderTheWx/1.0 (Garden Weather Aggregator)",
        Accept: "application/json",
        // Referer required — the API checks it
        Referer: `https://climate.usu.edu/mchd/quickview/quickview.php?network=FGNET&station=${cfg.id}&units=E`,
      },
    });
    if (!res.ok) throw new Error(`USU API ${res.status} for station ${cfg.id}`);
    const json = await res.json() as MchdResponse;
    if (!json.success || !json.payload?.length) {
      throw new Error(`USU API returned no data for station ${cfg.id}`);
    }
    return json;
  });

  // Most recent reading is first in the array
  const row = data.payload[0];

  // date_time is MST ("YYYY-MM-DD HH:MM:SS"), convert to ISO UTC (+7h)
  let timestamp = new Date().toISOString();
  if (row.date_time) {
    // MST = UTC-7
    const mst = row.date_time.replace(" ", "T") + "-07:00";
    const d = new Date(mst);
    if (!isNaN(d.getTime())) timestamp = d.toISOString();
  }

  const tempF = pf(row.airt_avg);
  const windMph = pf(row.winds_avg);
  const humidity = pf(row.rh_avg);

  // Compute dew point from temp + RH (Magnus formula approximation)
  // If td_avg is provided, use it; otherwise compute
  let dewPointF = pf(row.td_avg);
  if (!dewPointF && tempF && humidity) {
    const tempC = (tempF - 32) * 5 / 9;
    const a = 17.27, b = 237.7;
    const gamma = (a * tempC) / (b + tempC) + Math.log(humidity / 100);
    const dpC = (b * gamma) / (a - gamma);
    dewPointF = Math.round((dpC * 9 / 5 + 32) * 10) / 10;
  }

  // Wind chill / feels like
  let feelsLikeF = tempF;
  if (tempF <= 50 && windMph > 3) {
    feelsLikeF = 35.74 + 0.6215 * tempF - 35.75 * Math.pow(windMph, 0.16) + 0.4275 * tempF * Math.pow(windMph, 0.16);
    feelsLikeF = Math.round(feelsLikeF * 10) / 10;
  }

  const reading: StationReading = {
    stationId: `usu-${cfg.id}`,
    timestamp,
    tempF,
    dewPointF,
    humidity,
    pressureInHg: 0, // USU FGNET does not report pressure
    windSpeedMph: windMph,
    windDirDeg: pf(row.windd_avg),
    windGustMph: pf(row.winds_max),
    precipRateInHr: 0, // interval rain not rate; set to 0
    precipTodayIn: pf(row.rain),
    solarWm2: pf(row.solarw_avg),
    uvIndex: 0, // not reported by USU
    feelsLikeF,
    elevationFt: cfg.elevationFt,
    stale: false,
    // Soil & leaf data — unique to USU FGNET ag stations
    soilTempF: row.soilt10_i != null ? pf(row.soilt10_i) : undefined,
    soilMoisturePct: row.soilm10_i != null ? pf(row.soilm10_i) : undefined,
    leafWetPct: row.lwspct_wet != null ? pf(row.lwspct_wet) : undefined,
  };

  cacheSet(cfg.cacheKey, reading, TTL_MS);
  log("info", `USU ${stationKey} API OK`, {
    tempF: reading.tempF,
    soilTempF: reading.soilTempF,
    soilMoisturePct: reading.soilMoisturePct,
    stationId: cfg.id,
  });
  return reading;
}

export async function fetchAllUsu(): Promise<{
  usu16: StationReading | null;
  usu1302734: StationReading | null;
}> {
  const [r16, r1302734] = await Promise.allSettled([
    fetchUsu("usu16"),
    fetchUsu("usu1302734"),
  ]);

  return {
    usu16: r16.status === "fulfilled" ? r16.value : null,
    usu1302734: r1302734.status === "fulfilled" ? r1302734.value : null,
  };
}
