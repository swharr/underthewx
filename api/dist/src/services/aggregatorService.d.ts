import type { StationReading, AggregatedReading } from "../models/weatherTypes";
export declare function aggregate(inputs: {
    tempest: StationReading | null;
    wunderground: StationReading | null;
    usu16: StationReading | null;
    usu1302734: StationReading | null;
}): AggregatedReading;
//# sourceMappingURL=aggregatorService.d.ts.map