const HOME_ELEVATION_FT = parseInt(process.env.HOME_ELEVATION_FT ?? "4623", 10);
const LAPSE_RATE_F_PER_1000FT = 3.5;

/**
 * Adjust temperature for elevation difference using dry adiabatic lapse rate.
 * A station higher than home will read colder; we warm it up to home elevation.
 */
export function normalizeTemp(tempF: number, stationElevFt: number): number {
  const delta = (stationElevFt - HOME_ELEVATION_FT) / 1000;
  return tempF + delta * LAPSE_RATE_F_PER_1000FT;
}

/**
 * Adjust pressure for elevation difference using the barometric formula.
 */
export function normalizePressure(pressureInHg: number, stationElevFt: number): number {
  const deltaFt = HOME_ELEVATION_FT - stationElevFt;
  return pressureInHg * Math.exp(deltaFt * 0.0000368);
}

/**
 * Compute feels-like temperature using heat index (warm) or wind chill (cold).
 */
export function feelsLike(tempF: number, humidity: number, windMph: number): number {
  if (tempF >= 80) {
    // Heat index (Rothfusz regression)
    const hi =
      -42.379 +
      2.04901523 * tempF +
      10.14333127 * humidity -
      0.22475541 * tempF * humidity -
      0.00683783 * tempF * tempF -
      0.05481717 * humidity * humidity +
      0.00122874 * tempF * tempF * humidity +
      0.00085282 * tempF * humidity * humidity -
      0.00000199 * tempF * tempF * humidity * humidity;
    return Math.round(hi * 10) / 10;
  } else if (tempF <= 50 && windMph > 3) {
    // Wind chill (NWS formula)
    const wc =
      35.74 +
      0.6215 * tempF -
      35.75 * Math.pow(windMph, 0.16) +
      0.4275 * tempF * Math.pow(windMph, 0.16);
    return Math.round(wc * 10) / 10;
  }
  return tempF;
}
