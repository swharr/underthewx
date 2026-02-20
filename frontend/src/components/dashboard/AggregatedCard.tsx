import type React from "react";
import { Droplets, Wind, CloudRain, Sun } from "lucide-react";
import { windDirection } from "../../lib/dateUtils";
import type { HomeLocation } from "../../types/weather";

interface AggregatedCardProps {
  data: HomeLocation;
}

export function AggregatedCard({ data }: AggregatedCardProps) {
  return (
    <div className="card">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <p className="text-xs text-gray-500 uppercase tracking-wider">Home · 4,623 ft ASL</p>
          <p className="text-6xl font-bold text-white mt-1">{data.tempF.toFixed(1)}°</p>
          <p className="text-gray-400 text-sm mt-1">Feels like {data.feelsLikeF.toFixed(1)}°F</p>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-500">Dew Point</p>
          <p className="text-2xl font-semibold text-sky-300">{data.dewPointF.toFixed(1)}°</p>
        </div>
      </div>

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
