import { Thermometer } from "lucide-react";
import type { StationReading } from "../../types/weather";
import type { StationKey } from "../../constants/stations";
import { STATIONS } from "../../constants/stations";
import { relativeTime, windDirection } from "../../lib/dateUtils";

interface StationCardProps {
  stationKey: StationKey;
  reading?: StationReading;
}

export function StationCard({ stationKey, reading }: StationCardProps) {
  const meta = STATIONS[stationKey];

  if (!reading) {
    return (
      <div className="card-sm opacity-50">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-2 w-2 rounded-full bg-gray-600" />
          <p className="text-sm font-medium text-gray-400">{meta.label}</p>
        </div>
        <p className="text-xs text-gray-600">No data</p>
      </div>
    );
  }

  return (
    <div className={`card-sm ${reading.stale ? "opacity-60" : ""}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: reading.stale ? "#6b7280" : meta.color }}
          />
          <p className="text-sm font-medium text-gray-300">{meta.label}</p>
        </div>
        <span className="text-xs text-gray-600">{meta.elevationFt.toLocaleString()} ft</span>
      </div>

      <div className="flex items-baseline gap-2">
        <p className="text-3xl font-bold" style={{ color: reading.stale ? "#6b7280" : meta.color }}>
          {reading.tempF.toFixed(1)}°
        </p>
        <p className="text-xs text-gray-500">
          {reading.stale ? "stale" : relativeTime(reading.timestamp)}
        </p>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1 text-xs text-gray-500">
        <span>RH: {reading.humidity}%</span>
        <span>DP: {reading.dewPointF.toFixed(1)}°</span>
        <span>Wind: {reading.windSpeedMph.toFixed(1)} {windDirection(reading.windDirDeg)}</span>
        <span>Precip: {reading.precipTodayIn.toFixed(2)}"</span>
      </div>
    </div>
  );
}
