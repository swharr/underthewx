/**
 * Adjust temperature for elevation difference using dry adiabatic lapse rate.
 * A station higher than home will read colder; we warm it up to home elevation.
 */
export declare function normalizeTemp(tempF: number, stationElevFt: number): number;
/**
 * Adjust pressure for elevation difference using the barometric formula.
 */
export declare function normalizePressure(pressureInHg: number, stationElevFt: number): number;
/**
 * Compute feels-like temperature using heat index (warm) or wind chill (cold).
 */
export declare function feelsLike(tempF: number, humidity: number, windMph: number): number;
//# sourceMappingURL=elevationService.d.ts.map