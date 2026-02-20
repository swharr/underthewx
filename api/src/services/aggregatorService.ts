import { normalizeTemp, normalizePressure, feelsLike } from "./elevationService";
import type { StationReading, AggregatedReading, FrostRisk } from "../models/weatherTypes";
import { log } from "../utils/logger";

const HOME_ELEVATION_FT = parseInt(process.env.HOME_ELEVATION_FT ?? "4623", 10);
const STALE_THRESHOLD_MS = 20 * 60 * 1000; // 20 minutes

interface StationInput {
  reading: StationReading | null;
  baseWeight: number;
}

function isStale(reading: StationReading): boolean {
  const age = Date.now() - new Date(reading.timestamp).getTime();
  return age > STALE_THRESHOLD_MS;
}

function computeFrostRisk(
  tempF: number,
  dewPointF: number,
  solarWm2: number,
  windSpeedMph: number
): FrostRisk {
  if (tempF <= 28) return "imminent";
  if (tempF <= 32 || dewPointF <= 32) return "imminent";
  if (tempF <= 34) return "high";
  // Radiative frost: clear sky (low solar at night) + calm wind + temp just above freezing
  const radiativeFrost = solarWm2 < 5 && windSpeedMph < 3 && tempF <= 36;
  if (tempF <= 38 || dewPointF <= 34 || radiativeFrost) return "moderate";
  if (tempF <= 42 || dewPointF <= 36) return "low";
  return "none";
}

export function aggregate(inputs: {
  tempest: StationReading | null;
  wunderground: StationReading | null;
  usu16: StationReading | null;
  usu1302734: StationReading | null;
}): AggregatedReading {
  const stations: StationInput[] = [
    { reading: inputs.tempest, baseWeight: 0.40 },
    { reading: inputs.wunderground, baseWeight: 0.30 },
    { reading: inputs.usu16, baseWeight: 0.25 },
    { reading: inputs.usu1302734, baseWeight: 0.05 },
  ];

  // Mark stale and compute effective weights
  const live = stations.map((s) => ({
    ...s,
    isLive: s.reading !== null && !isStale(s.reading),
  }));

  const totalBase = live.filter((s) => s.isLive).reduce((sum, s) => sum + s.baseWeight, 0);

  const weighted = live.map((s) => ({
    ...s,
    weight: s.isLive && totalBase > 0 ? s.baseWeight / totalBase : 0,
  }));

  // Normalize each station reading to home elevation
  function norm(r: StationReading): StationReading {
    return {
      ...r,
      tempF: normalizeTemp(r.tempF, r.elevationFt),
      dewPointF: normalizeTemp(r.dewPointF, r.elevationFt),
      pressureInHg: normalizePressure(r.pressureInHg, r.elevationFt),
      elevationFt: HOME_ELEVATION_FT,
      stale: isStale(r),
    };
  }

  const normalized = weighted.map((s) => ({
    ...s,
    normalized: s.reading ? norm(s.reading) : null,
  }));

  // Weighted average of each field.
  // For fields where some stations report 0 as "not available" (pressure, uvIndex),
  // we use only stations that have a non-zero value to avoid dragging down the average.
  function wavg(
    field: keyof Pick<StationReading, "tempF" | "dewPointF" | "humidity" |
      "pressureInHg" | "windSpeedMph" | "windDirDeg" | "windGustMph" |
      "precipRateInHr" | "precipTodayIn" | "solarWm2" | "uvIndex">,
    skipZero = false
  ): number {
    const contributors = normalized.filter((s) => {
      if (!s.normalized || s.weight === 0) return false;
      const val = s.normalized[field] as number | undefined;
      if (val === undefined || val === null || isNaN(val)) return false;
      if (skipZero && val === 0) return false;
      return true;
    });
    if (contributors.length === 0) return 0;
    // Re-normalize weights among contributors only
    const totalW = contributors.reduce((sum, s) => sum + s.weight, 0);
    return contributors.reduce((sum, s) => {
      return sum + (s.normalized![field] as number) * (s.weight / totalW);
    }, 0);
  }

  const tempF = wavg("tempF");
  const humidity = wavg("humidity");
  const windSpeedMph = wavg("windSpeedMph");
  const solarWm2 = wavg("solarWm2");
  const dewPointF = wavg("dewPointF");

  // ── Soil temperature estimation ──────────────────────────────────────────
  // Interpolate/extrapolate from USU stations to home elevation using:
  //   - Soil temp lapse rate: ~1°F per 500 ft (0.002°F/ft), shallower than air
  //   - Inverse-distance weighting by elevation difference
  // Only computed when at least one live USU station has soil temp data.
  function estimateSoil(): { soilTempF?: number; soilMoisturePct?: number } {
    const SOIL_LAPSE_RATE = 1 / 500; // °F per foot of elevation change

    const candidatesTemp: Array<{ tempF: number; weight: number }> = [];
    const candidatesMoist: Array<{ pct: number; weight: number }> = [];

    // Build candidates from both USU stations
    const usuSources = [
      inputs.usu16,
      inputs.usu1302734,
    ] as const;

    // Soil temp changes slowly (hours, not minutes) — allow up to 2 hours stale
    const SOIL_STALE_MS = 2 * 60 * 60 * 1000;
    function isSoilStale(r: StationReading): boolean {
      return Date.now() - new Date(r.timestamp).getTime() > SOIL_STALE_MS;
    }

    for (const src of usuSources) {
      if (!src || isSoilStale(src)) continue;
      const elevDiff = Math.abs(src.elevationFt - HOME_ELEVATION_FT);
      // Inverse-distance weight: closer stations count more. Add 1 to avoid div/0.
      const w = 1 / (elevDiff + 1);
      // Adjust soil temp to home elevation (warmer at lower elevations)
      if (src.soilTempF != null) {
        const adjusted = src.soilTempF + (src.elevationFt - HOME_ELEVATION_FT) * SOIL_LAPSE_RATE;
        candidatesTemp.push({ tempF: adjusted, weight: w });
      }
      if (src.soilMoisturePct != null) {
        // Moisture doesn't have a meaningful elevation correction — use raw value
        candidatesMoist.push({ pct: src.soilMoisturePct, weight: w });
      }
    }

    if (candidatesTemp.length === 0 && candidatesMoist.length === 0) return {};

    const totalWt = candidatesTemp.reduce((s, c) => s + c.weight, 0);
    const totalWm = candidatesMoist.reduce((s, c) => s + c.weight, 0);

    return {
      soilTempF: totalWt > 0
        ? Math.round(candidatesTemp.reduce((s, c) => s + c.tempF * c.weight, 0) / totalWt * 10) / 10
        : undefined,
      soilMoisturePct: totalWm > 0
        ? Math.round(candidatesMoist.reduce((s, c) => s + c.pct * c.weight, 0) / totalWm * 10) / 10
        : undefined,
    };
  }

  const { soilTempF: estSoilTempF, soilMoisturePct: estSoilMoisturePct } = estimateSoil();

  const homeLocation: AggregatedReading["homeLocation"] = {
    tempF: Math.round(tempF * 10) / 10,
    dewPointF: Math.round(dewPointF * 10) / 10,
    humidity: Math.round(humidity),
    // Only average pressure from stations that actually report it (skipZero=true)
    pressureInHg: Math.round(wavg("pressureInHg", true) * 100) / 100,
    windSpeedMph: Math.round(windSpeedMph * 10) / 10,
    windDirDeg: Math.round(wavg("windDirDeg")),
    windGustMph: Math.round(wavg("windGustMph") * 10) / 10,
    precipRateInHr: Math.round(wavg("precipRateInHr") * 1000) / 1000,
    precipTodayIn: Math.round(wavg("precipTodayIn") * 100) / 100,
    solarWm2: Math.round(solarWm2),
    uvIndex: Math.round(wavg("uvIndex", true) * 10) / 10,
    feelsLikeF: feelsLike(tempF, humidity, windSpeedMph),
    frostRisk: computeFrostRisk(tempF, dewPointF, solarWm2, windSpeedMph),
    ...(estSoilTempF !== undefined && { estSoilTempF }),
    ...(estSoilMoisturePct !== undefined && { estSoilMoisturePct }),
  };

  // Attach stale flag to original readings
  const stationMap: AggregatedReading["stations"] = {};
  if (inputs.tempest) stationMap.tempest = { ...inputs.tempest, stale: isStale(inputs.tempest) };
  if (inputs.wunderground) stationMap.wunderground = { ...inputs.wunderground, stale: isStale(inputs.wunderground) };
  if (inputs.usu16) stationMap.usu16 = { ...inputs.usu16, stale: isStale(inputs.usu16) };
  if (inputs.usu1302734) stationMap.usu1302734 = { ...inputs.usu1302734, stale: isStale(inputs.usu1302734) };

  const now = new Date().toISOString();
  log("info", "Aggregation complete", { frostRisk: homeLocation.frostRisk, tempF: homeLocation.tempF });

  return {
    timestamp: now,
    dataAgeSeconds: 0,
    homeLocation,
    stations: stationMap,
  };
}
