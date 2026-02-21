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
    soilTempF?: number;
    soilMoisturePct?: number;
    leafWetPct?: number;
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
        /** Estimated soil temp at home elevation (10" depth), interpolated from USU stations */
        estSoilTempF?: number;
        /** Estimated soil moisture at home elevation, interpolated from USU stations */
        estSoilMoisturePct?: number;
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
//# sourceMappingURL=weatherTypes.d.ts.map