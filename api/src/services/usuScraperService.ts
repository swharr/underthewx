import { cacheGet, cacheSet } from "../utils/cache";
import { withRetry } from "../utils/retry";
import { log } from "../utils/logger";
import type { StationReading } from "../models/weatherTypes";
import * as cheerio from "cheerio";

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
const BASE_URL = "https://climate.usu.edu/mchd/quickview/quickview.php";

function buildUrl(stationId: string): string {
  return `${BASE_URL}?network=FGNET&station=${stationId}&units=E`;
}

function parseFloat2(s: string): number {
  const v = parseFloat(s.replace(/[^0-9.\-]/g, ""));
  return isNaN(v) ? 0 : v;
}

const HEADER_MAP: Record<string, keyof Pick<StationReading,
  "tempF" | "dewPointF" | "humidity" | "pressureInHg" |
  "windSpeedMph" | "windDirDeg" | "windGustMph" |
  "precipRateInHr" | "precipTodayIn" | "solarWm2" | "uvIndex"
>> = {
  "air temp": "tempF",
  "temperature": "tempF",
  "dew point": "dewPointF",
  "dewpoint": "dewPointF",
  "relative humidity": "humidity",
  "rh": "humidity",
  "humidity": "humidity",
  "pressure": "pressureInHg",
  "wind speed": "windSpeedMph",
  "wind gust": "windGustMph",
  "wind dir": "windDirDeg",
  "wind direction": "windDirDeg",
  "precipitation": "precipTodayIn",
  "precip": "precipTodayIn",
  "solar radiation": "solarWm2",
  "solar rad": "solarWm2",
};

function scrapeHtml(html: string, stationKey: StationKey): Partial<StationReading> {
  const $ = cheerio.load(html);
  const result: Partial<StationReading> = {};

  // Try to find a table with current readings
  // USU MCHD pages vary by station but typically have labeled rows
  $("table").each((_i, table) => {
    const rows = $(table).find("tr");
    rows.each((_j, row) => {
      const cells = $(row).find("td, th");
      if (cells.length >= 2) {
        const label = $(cells[0]).text().trim().toLowerCase();
        const value = $(cells[1]).text().trim();
        const field = Object.keys(HEADER_MAP).find((k) => label.includes(k));
        if (field && value) {
          const mapped = HEADER_MAP[field];
          (result as Record<string, number>)[mapped] = parseFloat2(value);
        }
      }
    });
  });

  // Also try definition lists (dl/dt/dd)
  $("dt").each((_i, el) => {
    const label = $(el).text().trim().toLowerCase();
    const value = $(el).next("dd").text().trim();
    const field = Object.keys(HEADER_MAP).find((k) => label.includes(k));
    if (field && value) {
      const mapped = HEADER_MAP[field];
      (result as Record<string, number>)[mapped] = parseFloat2(value);
    }
  });

  return result;
}

export async function fetchUsu(stationKey: StationKey): Promise<StationReading> {
  const cfg = STATIONS[stationKey];
  const cached = cacheGet<StationReading>(cfg.cacheKey);
  if (cached) return cached;

  const html = await withRetry(async () => {
    const res = await fetch(buildUrl(cfg.id), {
      headers: {
        "User-Agent": "UnderTheWx/1.0 (Garden Weather Aggregator; contact underthewx@localhost)",
        Accept: "text/html",
      },
    });
    if (!res.ok) throw new Error(`USU scrape ${res.status} for station ${cfg.id}`);
    return res.text();
  });

  const scraped = scrapeHtml(html, stationKey);

  // Build a reading with defaults for missing fields
  const reading: StationReading = {
    stationId: `usu-${cfg.id}`,
    timestamp: new Date().toISOString(),
    tempF: scraped.tempF ?? 0,
    dewPointF: scraped.dewPointF ?? 0,
    humidity: scraped.humidity ?? 0,
    pressureInHg: scraped.pressureInHg ?? 0,
    windSpeedMph: scraped.windSpeedMph ?? 0,
    windDirDeg: scraped.windDirDeg ?? 0,
    windGustMph: scraped.windGustMph ?? 0,
    precipRateInHr: scraped.precipRateInHr ?? 0,
    precipTodayIn: scraped.precipTodayIn ?? 0,
    solarWm2: scraped.solarWm2 ?? 0,
    uvIndex: scraped.uvIndex ?? 0,
    feelsLikeF: scraped.tempF ?? 0,
    elevationFt: cfg.elevationFt,
    stale: false,
  };

  cacheSet(cfg.cacheKey, reading, TTL_MS);
  log("info", `USU ${stationKey} scrape OK`, { tempF: reading.tempF, stationId: cfg.id });
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

  // 2-second polite delay between requests
  await new Promise((r) => setTimeout(r, 2000));

  return {
    usu16: r16.status === "fulfilled" ? r16.value : null,
    usu1302734: r1302734.status === "fulfilled" ? r1302734.value : null,
  };
}
