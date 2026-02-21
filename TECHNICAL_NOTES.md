# UnderTheWx — Technical Notes

> For the meteorologically curious, the statistically inclined, and anyone who wants to
> understand exactly why the soil temperature widget says what it says.
>
> **Site:** Lindon, UT · 40.33307°N, 111.72761°W · 4,623 ft ASL · USDA Zone 6b–7a

---

## Table of Contents

1. [System Architecture](#1-system-architecture)
2. [Data Sources](#2-data-sources)
3. [Elevation Normalization](#3-elevation-normalization)
4. [Weighted Aggregation Algorithm](#4-weighted-aggregation-algorithm)
5. [Staleness Handling](#5-staleness-handling)
6. [Soil Temperature & Moisture Estimation](#6-soil-temperature--moisture-estimation)
7. [Frost Risk Classification](#7-frost-risk-classification)
8. [Last Spring Frost Probability Model](#8-last-spring-frost-probability-model)
9. [Feels-Like Temperature](#9-feels-like-temperature)
10. [Data Persistence & Partitioning](#10-data-persistence--partitioning)
11. [Key Assumptions & Limitations](#11-key-assumptions--limitations)
12. [References](#12-references)

---

## 1. System Architecture

```
Every 10 minutes (Azure Functions Timer Trigger):
  ┌─────────────────────────────────────────────────────┐
  │  collectWeather                                     │
  │   ├─ fetchTempest()    → Tempest REST API           │
  │   ├─ fetchWunderground() → Weather Underground API  │
  │   ├─ fetchUsu("usu16")  → USU FGNET JSON API        │
  │   └─ fetchUsu("usu1302734") → USU FGNET JSON API    │
  │                  (Promise.allSettled — one bad       │
  │                   station never kills the run)       │
  │        ↓                                            │
  │  elevationService   (normalize to 4,623 ft)         │
  │        ↓                                            │
  │  aggregatorService  (weighted avg + soil est.)       │
  │        ↓                                            │
  │  storageService     (Azure Table Storage)           │
  │   ├─ WeatherLatest  → upsert sentinel row            │
  │   └─ WeatherReadings → append 10-min row            │
  └─────────────────────────────────────────────────────┘

Every 60 seconds (browser polling):
  GET /api/weather/aggregated
    → reads WeatherLatest sentinel from Table Storage
    → returns JSON to React SPA

On chart tab open:
  GET /api/weather/history?resolution=10min|hourly|daily&hours=N
    → reads WeatherReadings partition
    → returns array for Recharts
```

The frontend is a **React 18 / Vite / TailwindCSS / Recharts** SPA hosted on Azure Static Web Apps.
The backend is **Azure Functions v4** (Node.js/TypeScript) — both share the same SWA deployment.

All four station fetches run concurrently via `Promise.allSettled`. If a station is unreachable,
the aggregator simply treats it as having weight 0 for that cycle; no error is thrown.

---

## 2. Data Sources

### 2.1 Tempest Station 189439 (KUTLINDO34)

- **Type:** WeatherFlow Tempest personal weather station
- **API:** `https://swd.weatherflow.com/swd/rest/observations/station/189439?token=TOKEN`
- **Auth:** Personal Access Token (PAT) in Authorization header
- **Elevation:** ~4,600 ft (located at the home site)
- **Weight:** 0.40 (highest — it's *our* hardware, known calibration)
- **Update frequency:** ~1 min internally; our poller reads on 10-min timer
- **Notable fields:** All standard fields; no soil sensors

The Tempest uses a haptic rain sensor and a capacitive wind sensor — no moving parts. This makes
it more reliable in winter but means rain measurements can disagree with tipping-bucket gauges.

### 2.2 Weather Underground KUTLINDO32

- **Type:** Ambient Weather WS-2902 (neighbor's station, ~300 m away, same elevation band)
- **API:** `https://api.weather.com/v2/pws/observations/current?stationId=KUTLINDO32&format=json&units=e&apiKey=KEY`
- **Auth:** API key as URL parameter
- **Elevation:** ~4,600 ft
- **Weight:** 0.30
- **Update frequency:** 5 minutes upstream; we read on 10-min timer
- **Cache TTL:** 10 minutes in-process

**WU API field layout quirk:** Several fields that you might expect to be inside the `imperial{}`
block are actually top-level on the observation object:

```
observation = {
  humidity: 41,          // % — TOP LEVEL
  winddir: 22,           // degrees — TOP LEVEL
  solarRadiation: null,  // W/m² — TOP LEVEL (null when no pyranometer)
  uv: 1.0,               // index — TOP LEVEL
  imperial: {
    windSpeed: 0,        // mph — imperial block (camelCase)
    windGust: 1,         // mph — imperial block (camelCase)
    temp: 37.4,
    dewpt: 22.1,
    pressure: 29.41,
    precipRate: 0.00,
    precipTotal: 0.12,
  }
}
```

This station does not have a solar radiation sensor, so `solarRadiation` is `null` in winter.
The aggregator's `skipZero=true` flag on solar and UV prevents these nulls (mapped to 0) from
dragging down the weighted average.

### 2.3 USU FGNET Station #16 (Orem / Upper Bench)

- **Type:** Utah State University Farm & Garden Network ag station
- **Elevation:** 4,745 ft (122 ft above home)
- **Weight:** 0.25
- **Unique data:** Soil temperature and moisture at 10-inch depth; leaf wetness

### 2.4 USU FGNET Station #1302734 (East Bench / Foothills)

- **Type:** USU FGNET ag station
- **Elevation:** 5,475 ft (852 ft above home)
- **Weight:** 0.05 (lowest — furthest away in elevation)
- **Unique data:** Soil temperature and moisture at 10-inch depth; leaf wetness

**USU API discovery note:** The USU quickview pages load their data via an AJAX call to an
undocumented but stable internal JSON API. The endpoint is:

```
GET https://climate.usu.edu/mchd/dashboard/mchdServices.php
  ?query_id=5          ← 5=current, 6=hourly, 7=daily
  &network=FGNET
  &station_id={id}
  &units=E             ← E=imperial/English
```

The server checks the `Referer` header; requests without it return an error. We send:
```
Referer: https://climate.usu.edu/mchd/quickview/quickview.php?network=FGNET&station={id}&units=E
```

The timestamp in the response (`date_time`) is Mountain Standard Time (UTC−7), not local time.
We convert to UTC by appending `−07:00` before parsing — this means during MDT (summer) our
timestamps will be off by one hour. This is a known limitation; a future fix would use a proper
timezone database (`Intl.DateTimeFormat` or `date-fns-tz`) to handle DST.

USU stations do not report pressure. The `pressureInHg` field is set to `0` and the aggregator's
`skipZero=true` option excludes them from the pressure average.

---

## 3. Elevation Normalization

All station readings are adjusted to the home elevation of **4,623 ft ASL** before aggregation.
This produces an "as-if measured at home" value for each station.

### 3.1 Temperature (Atmospheric Lapse Rate)

```
T_home = T_station + (elevation_station − 4623) / 1000 × 3.5
```

The constant **3.5 °F per 1,000 ft** is the average environmental lapse rate for the lower
troposphere in inland mountain regions. (The dry adiabatic lapse rate is 5.5 °F/1,000 ft;
the moist adiabatic rate is ~3.0 °F/1,000 ft; 3.5 is a practical middle ground for Utah's
semi-arid intermountain climate.)

**Example:** USU-16 reads 35.0°F at 4,745 ft.
```
T_home = 35.0 + (4745 − 4623) / 1000 × 3.5
       = 35.0 + 0.122 × 3.5
       = 35.0 + 0.427
       = 35.4°F
```

Dew point is corrected identically — it also decreases with altitude at roughly the same rate
in the lower atmosphere.

### 3.2 Pressure (Barometric / Hypsometric Formula)

```
P_home = P_station × exp((4623 − elevation_station) × 0.0000368)
```

This is a simplified form of the barometric formula. The constant **0.0000368 per foot** is
derived from the full hypsometric formula:

```
Full formula: P(h) = P_0 × exp(−M×g×Δh / R×T)
  M = 0.0289644 kg/mol (molar mass of air)
  g = 9.80665 m/s²
  R = 8.31446 J/(mol·K)
  T ≈ 288.15 K (15°C standard atmosphere)

Per-foot constant: Mg/(RT) × 0.3048 m/ft ≈ 0.0000368 ft⁻¹
```

**Example:** USU-16 reports 29.10 inHg at 4,745 ft.
```
P_home = 29.10 × exp((4623 − 4745) × 0.0000368)
       = 29.10 × exp(−122 × 0.0000368)
       = 29.10 × exp(−0.004490)
       = 29.10 × 0.99552
       = 28.97 inHg
```

(A station *above* home has lower pressure; we correct *upward*.)

### 3.3 What Is Not Normalized

- **Wind speed / direction** — orographic effects are station-specific and cannot be corrected
  with a simple formula. Wind readings are used as-is.
- **Precipitation** — local topography, rain shadows, and cold-air pooling make elevation
  correction of precip unreliable. Used raw.
- **Solar radiation** — elevation does affect insolation slightly (~1%/1,000 ft) but this
  is within sensor noise. Used raw.
- **Humidity** — normalized indirectly: once T and Td are corrected, RH could be recomputed,
  but we currently use the station-reported RH value directly.

---

## 4. Weighted Aggregation Algorithm

After normalization, we compute a weighted average for each scalar field:

```
step 1: For each station, determine isLive = reading exists AND age < 20 min
step 2: totalBaseWeight = Σ baseWeight for live stations only
step 3: effectiveWeight[i] = baseWeight[i] / totalBaseWeight   (live only, else 0)
step 4: For each field F:
          contributors = live stations where F is not undefined/null/NaN
                         AND (if skipZero) F ≠ 0
          reNorm = Σ effectiveWeight[j] for contributors
          result[F] = Σ (value[j][F] × effectiveWeight[j] / reNorm)
```

The re-normalization in step 4 ensures that if only 2 of 4 stations report solar radiation,
those 2 stations still sum to a total weight of 1.0 — rather than 0.65 (which would bias the
average low).

### Base weights

| Station | Base weight | Rationale |
|---------|-------------|-----------|
| Tempest | 0.40 | Owner-maintained hardware, known location |
| WU | 0.30 | Calibrated consumer station, second opinion |
| USU-16 | 0.25 | Professional ag station, 122 ft above home |
| USU-1302734 | 0.05 | 852 ft above home; primarily used for soil data |

### Fields with `skipZero=true`

`pressureInHg`, `uvIndex` — these are genuinely zero only in degenerate conditions. USU
stations report 0 for pressure (not measured) and 0 for UV (not measured). Using skipZero
prevents those zeros from contaminating the weighted average.

`solarWm2` does **not** use skipZero — zero solar at night is valid data.

---

## 5. Staleness Handling

A reading is **stale** if its timestamp is more than 20 minutes old. Stale readings are
excluded from weighted averages entirely — their base weight is redistributed proportionally
to live stations.

**Why 20 minutes:** Our timer runs every 10 minutes. A station might miss one cycle (network
glitch, API timeout) and come back on the next. 20 minutes gives one missed cycle of grace.
A station missing two consecutive cycles is genuinely unavailable.

**Soil data** uses a separate 2-hour staleness threshold (see §6).

The `stale: boolean` flag is passed through to the API response and displayed in the station
cards so you can see which stations contributed to the current reading.

---

## 6. Soil Temperature & Moisture Estimation

The home site does not have a soil sensor. We estimate 10-inch soil conditions by interpolating
from the two USU stations, both of which have calibrated soil sensors at that depth.

### 6.1 Elevation Adjustment (Soil Lapse Rate)

Air temperature lapse rates do not apply to soil. Soil temperature responds much more slowly
to atmospheric forcing, and the vertical gradient near the surface is primarily controlled by
solar heating, which is roughly proportional to the cosine of the solar zenith angle — nearly
equal at all elevations in our ~850 ft range.

We use a **soil lapse rate of 1 °F per 500 ft** (0.002 °F/ft):

```
T_soil_home = T_soil_station + (elevation_station − 4623) × 0.002
```

This is intentionally conservative. The literature suggests soil temperature lapse rates of
0.5–2 °F/500 ft depending on season, soil type, and cover. The ±2.5° uncertainty shown in
the UI covers this range.

**Example (typical February values):**
- USU-16 at 4,745 ft: soil temp = 36.5°F
  - Adjustment: (4745 − 4623) × 0.002 = 0.244°F
  - Adjusted: 36.5 + 0.244 = **36.74°F**
- USU-1302734 at 5,475 ft: soil temp = 38.0°F
  - Adjustment: (5475 − 4623) × 0.002 = 1.704°F
  - Adjusted: 38.0 + 1.704 = **39.70°F**

### 6.2 Inverse-Distance Elevation Weighting

Stations closer in elevation to the home site contribute more to the estimate:

```
weight[i] = 1 / (|elevation[i] − 4623| + 1)
```

The `+1` prevents division by zero if a station is at exactly the home elevation.

| Station | |Δelev| | weight |
|---------|---------|--------|
| USU-16 | 122 ft | 1/123 ≈ 0.00813 |
| USU-1302734 | 852 ft | 1/853 ≈ 0.00117 |

USU-16 gets ~87% of the total weight; USU-1302734 gets ~13%.

Final estimate:
```
T_soil_home = (36.74 × 0.00813 + 39.70 × 0.00117) / (0.00813 + 0.00117)
            = (0.2985 + 0.04643) / 0.00930
            = 37.07°F  (displayed as 37.1°F)
```

### 6.3 Soil Moisture

Volumetric water content (VWC, %) does not have a meaningful elevation correction — it depends
on soil type, irrigation history, and local drainage, not altitude. The raw station values are
used directly, with the same inverse-distance weighting.

### 6.4 Staleness (2-Hour Threshold)

Soil temperature at 10-inch depth changes on a timescale of hours, not minutes. Using the
standard 20-minute air-temperature staleness threshold would incorrectly discard valid soil data
when a USU station misses one or two 10-minute cycles. We allow soil readings up to 2 hours old.

This means a soil temperature estimate can lag real conditions by up to 2 hours. Given the slow
response of deep soil, this is acceptable for gardening decisions.

### 6.5 Uncertainty

The **±2.5°** displayed in the UI is a rough combined uncertainty budget:
- Soil lapse rate model error: ±1.5°
- Sensor calibration drift (manufacturer spec): ±1.0°
- Total RSS: √(1.5² + 1.0²) ≈ ±1.8° → rounded to ±2.5° for conservatism

For planting decisions (germination thresholds, transplant timing), differences under 3°F rarely
change the practical conclusion.

---

## 7. Frost Risk Classification

Five levels, computed from the aggregated home-location values:

```
imminent  — tempF ≤ 28  OR  (tempF ≤ 32  OR  dewPointF ≤ 32)
high      — tempF ≤ 34
moderate  — tempF ≤ 38  OR  dewPointF ≤ 34  OR  radiative frost conditions
low       — tempF ≤ 42  OR  dewPointF ≤ 36
none      — otherwise
```

Conditions are evaluated top-to-bottom; first match wins.

### 7.1 Radiative Frost Detection

The `moderate` level includes a special case for **radiative frost** — frost that forms even
when air temperature is above freezing, caused by surfaces radiating heat to a clear night sky:

```
radiativeFrost = solarWm2 < 5 AND windSpeedMph < 3 AND tempF ≤ 36
```

Conditions:
- **solarWm2 < 5**: Effectively zero incoming solar → nighttime or heavily overcast
- **windSpeedMph < 3**: Calm air allows a cold boundary layer to develop near the surface
- **tempF ≤ 36**: Air temperature close enough to freezing that surface radiative cooling
  can drop leaf/soil surfaces below 32°F

Under radiative frost conditions, exposed plant tissue (leaves, flower petals) can reach
temperatures 2–6°F below the measured air temperature.

### 7.2 Dew Point Thresholds

Dew point approaching 32°F matters because:
- When the dew point is ≤ 32°F, frost can deposit directly on cold surfaces via deposition
  (vapor → ice, skipping the liquid phase), even if the air temperature is above 32°F
- The `dewPointF ≤ 32` condition in `imminent` catches exactly this scenario

---

## 8. Last Spring Frost Probability Model

### 8.1 Historical Baseline

The average last spring frost date for Lindon, UT (Zone 6b–7a, 4,623 ft) is approximately
**April 25**, based on 30-year NOAA climatological normals for the Utah County region.

This is a *mean* date, not a guarantee. Actual last frost dates vary considerably year to year.

### 8.2 Model

We model the last-frost date as a **normal distribution**:

```
X ~ N(μ = April 25, σ = 10 days)
```

The **probability that a frost-risk night still lies ahead** of today is:

```
P(frost still ahead) = 1 − Φ((today − μ) / σ)
```

where Φ is the standard normal cumulative distribution function.

- Before April 25: `today − μ` is negative → Φ is small → P is high
- On April 25: z = 0 → Φ = 0.5 → P = 50%
- Two weeks after April 25: z = 14/10 = 1.4 → Φ ≈ 0.919 → P ≈ 8%

### 8.3 CDF Implementation

The standard normal CDF is approximated using the rational polynomial from
**Abramowitz & Stegun, §26.2.17** (1964):

```typescript
function normalCDF(z: number): number {
  const t = 1 / (1 + 0.2316419 * |z|);
  const poly = t*(0.319381530 + t*(-0.356563782 + t*(1.781477937
             + t*(-1.821255978 + t*1.330274429))));
  const p = 1 − (1/√(2π)) × exp(−z²/2) × poly;
  return z >= 0 ? p : 1 − p;
}
```

Maximum absolute error: |ε| < 7.5 × 10⁻⁸. More than sufficient for a gardening probability.

### 8.4 Display Color Coding

| P value | Color | Interpretation |
|---------|-------|----------------|
| > 60% | Red | Significant frost risk remains; protect tender plants |
| 30–60% | Yellow | Transitional period; watch forecasts closely |
| < 30% | Green | Past the high-risk window; most years are safe |

### 8.5 Limitations

- The σ = 10 days parameter is an estimate. NOAA data for Utah County suggests a standard
  deviation of 8–14 days depending on the exact measurement location and elevation.
- This is a **climatological** probability, not a **meteorological** forecast. It tells you
  what *typically* happens at this time of year, not what *will* happen tonight.
- The model resets to the next year's April 25 on January 1 — fall frost probability is
  not modeled (different distribution centered on ~October 5).
- The computation runs entirely in the browser (no API call) and is recalculated on every render.

---

## 9. Feels-Like Temperature

Two separate formulas are used depending on temperature range:

### 9.1 Heat Index (T ≥ 80°F)

The **Rothfusz regression** (NWS standard):

```
HI = −42.379
   + 2.04901523·T
   + 10.14333127·RH
   − 0.22475541·T·RH
   − 0.00683783·T²
   − 0.05481717·RH²
   + 0.00122874·T²·RH
   + 0.00085282·T·RH²
   − 0.00000199·T²·RH²
```

where T is in °F and RH is in % (0–100). Valid for T ≥ 80°F and RH ≥ 40%.

### 9.2 Wind Chill (T ≤ 50°F, wind > 3 mph)

The **NWS Wind Chill formula** (2001 revision):

```
WC = 35.74 + 0.6215·T − 35.75·V^0.16 + 0.4275·T·V^0.16
```

where T is in °F and V is wind speed in mph. The exponent 0.16 approximates the effect of
wind in reducing the insulating boundary layer of air against the skin.

### 9.3 In-Between Conditions

For T between 51°F and 79°F, feels-like = actual temperature. Neither heat index nor wind
chill is physically meaningful in this comfort range.

---

## 10. Data Persistence & Partitioning

We use **Azure Table Storage** — a NoSQL key-value store that charges ~$0.045/GB/month and
~$0.00036/10,000 operations. For our data volumes, this is effectively free.

### Tables

**`WeatherLatest`** — single sentinel row:
- PartitionKey: `"latest"`, RowKey: `"current"`
- Upserted every 10 minutes by `collectWeather`
- The `GET /api/weather/aggregated` endpoint reads *only* this row (O(1) point lookup)
- Contains all aggregated fields plus JSON-stringified raw station readings

**`WeatherReadings`** — time-series archive:
- PartitionKey strategy: `readings-10min-YYYY-MM` / `readings-hourly-YYYY` / `readings-daily`
- RowKey: ISO 8601 timestamp (sortable lexicographically = chronological order)
- The 10-min partition rotates monthly; history queries can target a single partition

### Retention Policy (recommended)

| Resolution | Retention | Rows/year |
|------------|-----------|-----------|
| 10-minute | 7 days | ~1,008/week |
| Hourly | 90 days | ~8,760/year |
| Daily | 5 years | ~1,825/5yr |

Table Storage rows are capped at 252 properties and 1 MB. Our rows use ~20 numeric fields plus
4 JSON blobs (one per station) — comfortably under the limits.

### In-Process Cache

Each Azure Function instance maintains a short-lived in-memory cache:
- WU and USU readings: **10-minute TTL** (matches our poll interval)
- Tempest: fetched fresh each timer invocation (no cache — it has its own backend buffer)

This prevents hammering upstream APIs if the timer fires slightly early or multiple Function
instances are alive simultaneously. The cache is instance-local; in a scaled-out scenario,
each instance fetches independently.

---

## 11. Key Assumptions & Limitations

### Elevation data

| Station | Reported elevation | Source |
|---------|-------------------|--------|
| Home | 4,623 ft | GPS + USGS DEM cross-check |
| Tempest | ~4,600 ft | Station metadata |
| WU KUTLINDO32 | ~4,600 ft | WU station registration |
| USU-16 | 4,745 ft | USU FGNET station metadata |
| USU-1302734 | 5,475 ft | USU FGNET station metadata |

Small errors in station elevation (±50 ft) produce temperature normalization errors of ±0.18°F —
negligible for our purposes.

### Temperature lapse rate

We use a fixed 3.5°F/1,000 ft rate. The actual lapse rate varies:
- Summer afternoon (dry, convective): ~5.0°F/1,000 ft
- Winter inversion: can be **negative** (temperature *increases* with altitude)

During strong temperature inversions (common in Utah valleys in winter), the normalized readings
from USU-16 and USU-1302734 could be *overcorrected* — making them appear warmer than they
actually are at home. This is the most significant systematic error in the model.

### USU stations are agricultural stations

USU FGNET stations are sited, calibrated, and maintained for agricultural monitoring, not
consumer weather reporting. Sensor placement (open fields, away from buildings, turf reference)
tends to produce readings that are slightly cooler and windier than a residential backyard.

### Wind readings are not normalized

Wind is highly site-specific. The Tempest on our roof, the WU neighbor's backyard station, and
the open-field USU stations all have very different wind exposure. We average them, but the
result should be interpreted as a general neighborhood indicator, not a precise point estimate.

### The USU API is undocumented

`mchdServices.php` is an internal API discovered by inspecting network requests in the browser
devtools. It is not publicly documented and could change without notice. The `query_id`,
`network`, and `units` parameters are empirically determined. If USU updates their web app,
this integration may break silently.

### This is not a weather forecast

Everything in this system is **observational** — it tells you what is happening now, not what
will happen next. The frost risk level is based on current conditions. The spring frost
probability is a climatological model, not a numerical weather prediction.

---

## 12. References

- NOAA National Weather Service — Heat Index and Wind Chill formulas:
  https://www.weather.gov/safety/heat-index
- Abramowitz, M. & Stegun, I.A. (1964). *Handbook of Mathematical Functions*, §26.2.17.
  Rational approximation to the normal CDF.
- Rothfusz, L.P. (1990). "The Heat Index Equation." NWS Technical Attachment SR/SSD 90-23.
- Wallace, J.M. & Hobbs, P.V. (2006). *Atmospheric Science: An Introductory Survey* (2nd ed.).
  Barometric formula derivation, Chapter 1.
- USU Climate Center — FGNET (Farm & Garden NETwork):
  https://climate.usu.edu/
- WeatherFlow Tempest API documentation:
  https://weatherflow.github.io/SmartWeather/api/
- Weather Underground PWS API:
  https://docs.google.com/document/d/1eKCnKXI9xnoMGRRzOL1xPCBihNV2rOet08qpE_gArAY

---

*Generated by UnderTheWx. For questions about the math, consult a meteorologist.
For questions about the code, consult the source.*
