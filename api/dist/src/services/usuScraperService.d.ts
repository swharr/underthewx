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
import type { StationReading } from "../models/weatherTypes";
declare const STATIONS: {
    readonly usu16: {
        readonly id: "16";
        readonly elevationFt: 4745;
        readonly cacheKey: "usu16:latest";
    };
    readonly usu1302734: {
        readonly id: "1302734";
        readonly elevationFt: 5475;
        readonly cacheKey: "usu1302734:latest";
    };
};
type StationKey = keyof typeof STATIONS;
export declare function fetchUsu(stationKey: StationKey): Promise<StationReading>;
export declare function fetchAllUsu(): Promise<{
    usu16: StationReading | null;
    usu1302734: StationReading | null;
}>;
export {};
//# sourceMappingURL=usuScraperService.d.ts.map