import type React from "react";
import { Droplets, Wind, CloudRain, Sun, Thermometer } from "lucide-react";
import { windDirection } from "../../lib/dateUtils";
import type { HomeLocation } from "../../types/weather";

interface AggregatedCardProps {
  data: HomeLocation;
}

/**
 * Compute a last-spring-frost prediction for Lindon, UT (Zone 6b-7a, 4,623 ft).
 *
 * Historical average last spring frost: April 25.
 * Model: normal distribution with μ = Apr 25, σ = 10 days.
 * P(frost still ahead) = 1 - Φ((today - μ) / σ)
 */
function lastFrostPrediction(today: Date): {
  avgDate: string;
  daysUntilAvg: number;
  pFrostAfterToday: number;
  label: string;
} {
  const year = today.getFullYear();
  const avgFrost = new Date(year, 3, 25); // April 25, 0-indexed month
  const daysUntilAvg = Math.round((avgFrost.getTime() - today.getTime()) / 86_400_000);

  // Rational approximation of the normal CDF (Abramowitz & Stegun 26.2.17)
  function normalCDF(z: number): number {
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const poly =
      t * (0.319381530 +
        t * (-0.356563782 +
          t * (1.781477937 +
            t * (-1.821255978 +
              t * 1.330274429))));
    const p = 1 - (1 / Math.sqrt(2 * Math.PI)) * Math.exp(-0.5 * z * z) * poly;
    return z >= 0 ? p : 1 - p;
  }

  const SIGMA = 10;
  const daysPast = -daysUntilAvg; // positive after avg date
  const pOccurred = normalCDF(daysPast / SIGMA);
  const pFrostAfterToday = 1 - pOccurred;

  const avgDateStr = avgFrost.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  let label: string;
  if (daysUntilAvg > 30) {
    label = `~${daysUntilAvg}d until avg last frost`;
  } else if (daysUntilAvg > 0) {
    label = `${daysUntilAvg}d until avg last frost`;
  } else if (daysUntilAvg >= -14) {
    label = `${Math.abs(daysUntilAvg)}d past avg last frost`;
  } else {
    label = `${Math.abs(daysUntilAvg)}d past avg — likely safe`;
  }

  return { avgDate: avgDateStr, daysUntilAvg, pFrostAfterToday, label };
}

export function AggregatedCard({ data }: AggregatedCardProps) {
  const frost = lastFrostPrediction(new Date());
  const pPct = Math.round(frost.pFrostAfterToday * 100);

  return (
    <div className="card">
      {/* ── Temperature header ── */}
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Home · 4,623 ft ASL · Lindon, UT</p>
          <p className="text-6xl font-bold text-white mt-1">{data.tempF.toFixed(1)}°</p>
          <p className="text-gray-400 text-sm mt-1">Feels like {data.feelsLikeF.toFixed(1)}°F</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Dew Point</p>
          <p className="text-2xl font-semibold text-sky-300">{data.dewPointF.toFixed(1)}°</p>
        </div>
      </div>

      {/* ── Main weather grid ── */}
      <div className="grid grid-cols-2 gap-3">
        <Stat icon={Droplets} label="Humidity" value={`${data.humidity}%`} />
        <Stat icon={Wind} label="Wind" value={`${data.windSpeedMph.toFixed(1)} mph ${windDirection(data.windDirDeg)}`} />
        <Stat icon={CloudRain} label="Precip Today" value={`${data.precipTodayIn.toFixed(2)}"`} />
        <Stat icon={Sun} label="Solar" value={`${data.solarWm2} W/m²`} />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-gray-500">
        <span>Pressure: {data.pressureInHg.toFixed(2)} inHg</span>
        <span>UV: {data.uvIndex.toFixed(1)}</span>
        <span>Gusts: {data.windGustMph.toFixed(1)} mph</span>
      </div>

      {/* ── Soil estimates from USU stations ── */}
      {(data.estSoilTempF !== undefined || data.estSoilMoisturePct !== undefined) && (
        <div className="mt-3 pt-3 border-t border-gray-800">
          <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
            Est. Soil Conditions · 10″ depth
          </p>
          <div className="grid grid-cols-2 gap-3">
            {data.estSoilTempF !== undefined && (
              <div className="bg-gray-800/40 rounded-lg p-2.5 flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-amber-500/80 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Soil Temp</p>
                  <p className="text-sm font-medium text-amber-400">
                    {data.estSoilTempF.toFixed(1)}°F
                    <span className="text-xs text-gray-600 ml-1">±2.5°</span>
                  </p>
                </div>
              </div>
            )}
            {data.estSoilMoisturePct !== undefined && (
              <div className="bg-gray-800/40 rounded-lg p-2.5 flex items-center gap-2">
                <Droplets className="h-4 w-4 text-blue-400/70 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Soil Moisture</p>
                  <p className="text-sm font-medium text-blue-300">
                    {data.estSoilMoisturePct.toFixed(1)}%
                    <span className="text-xs text-gray-600 ml-1">VWC</span>
                  </p>
                </div>
              </div>
            )}
          </div>
          <p className="text-xs text-gray-700 mt-1.5">
            Interpolated from USU FGNET stations at 4,745 ft &amp; 5,475 ft
          </p>
        </div>
      )}

      {/* ── Last frost prediction ── */}
      <div className="mt-3 pt-3 border-t border-gray-800">
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">
          Last Spring Frost · avg {frost.avgDate}
        </p>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm text-gray-300">{frost.label}</span>
          <span
            className={`text-sm font-bold tabular-nums ${
              pPct > 60 ? "text-red-400" : pPct > 30 ? "text-yellow-400" : "text-green-400"
            }`}
          >
            p = {pPct}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-gray-800 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              pPct > 60 ? "bg-red-500" : pPct > 30 ? "bg-yellow-500" : "bg-green-500"
            }`}
            style={{ width: `${Math.max(pPct, 2)}%` }}
          />
        </div>
        <p className="text-xs text-gray-700 mt-1">
          P(frost-risk night still ahead) · 𝒩(Apr 25, σ=10d)
        </p>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.FC<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-gray-800/50 rounded-lg p-2.5 flex items-center gap-2">
      <Icon className="h-4 w-4 text-gray-500 shrink-0" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-sm font-medium text-gray-200">{value}</p>
      </div>
    </div>
  );
}
