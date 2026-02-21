export interface WeatherLatestEntity {
    partitionKey: string;
    rowKey: string;
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
    estSoilTempF?: number;
    estSoilMoisturePct?: number;
    tempestJson: string;
    wundergroundJson: string;
    usu16Json: string;
    usu1302734Json: string;
}
export interface WeatherReadingEntity {
    partitionKey: string;
    rowKey: string;
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
    partitionKey: string;
    rowKey: string;
    value: string;
    lastUpdated: string;
}
//# sourceMappingURL=tableEntities.d.ts.map