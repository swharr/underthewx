export type FrostRisk = "none" | "low" | "moderate" | "high" | "imminent";

export interface StationReading {
  stationId: string;
  timestamp: string; // ISO 8601
  tempF: number;
  dewPointF: number;
  humidity: number; // 0-100
  pressureInHg: number;
  windSpeedMph: number;
  windDirDeg: number;
  windGustMph: number;
  precipRateInHr: number;
  precipTodayIn: number;
  solarWm2: number;
  uvIndex: number;
  feelsLikeF: number;
  elevationFt: number;
  stale: boolean;
  // Soil data (USU FGNET stations only)
  soilTempF?: number;      // at 10" depth
  soilMoisturePct?: number; // volumetric water content %
  leafWetPct?: number;     // leaf wetness %
}

export interface AggregatedReading {
  timestamp: string;
  dataAgeSeconds: number;
  homeLocation: {
    tempF: number;
    dewPointF: number;
    humidity: number;
    pressureInHg: number;
    windSpeedMph: number;
    windDirDeg: number;
    windGustMph: number;
    precipRateInHr: number;
    precipTodayIn: number;
    solarWm2: number;
    uvIndex: number;
    feelsLikeF: number;
    frostRisk: FrostRisk;
  };
  stations: {
    tempest?: StationReading;
    wunderground?: StationReading;
    usu16?: StationReading;
    usu1302734?: StationReading;
  };
}

export interface HistoricalPoint {
  timestamp: string;
  aggregated: Partial<AggregatedReading["homeLocation"]>;
  tempest?: Partial<StationReading>;
  wunderground?: Partial<StationReading>;
  usu16?: Partial<StationReading>;
  usu1302734?: Partial<StationReading>;
}
