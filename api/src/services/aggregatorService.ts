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
      if (skipZero && (s.normalized[field] as number) === 0) return false;
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
