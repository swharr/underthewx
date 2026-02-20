export type FrostRisk = "none" | "low" | "moderate" | "high" | "imminent";

export interface StationReading {
  stationId: string;
  timestamp: string;
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
  elevationFt: number;
  stale: boolean;
  // Soil & leaf data (USU FGNET ag stations only)
  soilTempF?: number;
  soilMoisturePct?: number;
  leafWetPct?: number;
}

export interface HomeLocation {
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
}

export interface AggregatedReading {
  timestamp: string;
  dataAgeSeconds: number;
  homeLocation: HomeLocation;
  stations: {
    tempest?: StationReading;
    wunderground?: StationReading;
    usu16?: StationReading;
    usu1302734?: StationReading;
  };
}

export interface HistoricalPoint {
  timestamp: string;
  aggregated: Partial<HomeLocation>;
  tempest?: Partial<StationReading>;
  wunderground?: Partial<StationReading>;
  usu16?: Partial<StationReading>;
  usu1302734?: Partial<StationReading>;
}

export type HistoryResolution = "10min" | "hourly" | "daily";
