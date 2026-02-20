export interface WeatherLatestEntity {
  partitionKey: string; // "latest"
  rowKey: string;       // "current"
  updatedAt: string;
  aggTempF: number;
  aggDewPointF: number;
  aggHumidity: number;
  aggPressureInHg: number;
  aggWindSpeedMph: number;
  aggWindDirDeg: number;
  aggWindGustMph: number;
  aggPrecipRateInHr: number;
  aggPrecipTodayIn: number;
  aggSolarWm2: number;
  aggUvIndex: number;
  aggFeelsLikeF: number;
  frostRisk: string;
  tempestJson: string;    // JSON.stringify(StationReading | null)
  wundergroundJson: string;
  usu16Json: string;
  usu1302734Json: string;
}

export interface WeatherReadingEntity {
  partitionKey: string; // e.g. "readings-10min-2026-02"
  rowKey: string;       // ISO timestamp
  aggTempF: number;
  aggDewPointF: number;
  aggHumidity: number;
  aggPressureInHg: number;
  aggWindSpeedMph: number;
  aggWindDirDeg: number;
  aggWindGustMph: number;
  aggPrecipRateInHr: number;
  aggPrecipTodayIn: number;
  aggSolarWm2: number;
  aggUvIndex: number;
  aggFeelsLikeF: number;
  frostRisk: string;
  tempestJson: string;
  wundergroundJson: string;
  usu16Json: string;
  usu1302734Json: string;
}

export interface PlantingConfigEntity {
  partitionKey: string; // "config"
  rowKey: string;       // "zone" | "frostDates"
  value: string;        // JSON blob
  lastUpdated: string;
}
