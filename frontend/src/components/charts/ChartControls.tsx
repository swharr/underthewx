import type { HistoryResolution } from "../../types/weather";

interface ChartControlsProps {
  resolution: HistoryResolution;
  hours: number;
  onResolutionChange: (r: HistoryResolution) => void;
  onHoursChange: (h: number) => void;
}

const RESOLUTIONS: { id: HistoryResolution; label: string }[] = [
  { id: "10min", label: "10-min" },
  { id: "hourly", label: "Hourly" },
  { id: "daily", label: "Daily" },
];

const HOUR_OPTIONS = [
  { label: "24h", value: 24 },
  { label: "48h", value: 48 },
  { label: "7d", value: 168 },
  { label: "30d", value: 720 },
];

export function ChartControls({ resolution, hours, onResolutionChange, onHoursChange }: ChartControlsProps) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <div className="flex rounded-lg overflow-hidden border border-gray-700">
        {RESOLUTIONS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => onResolutionChange(id)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              resolution === id
                ? "bg-sky-700 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex rounded-lg overflow-hidden border border-gray-700">
        {HOUR_OPTIONS.map(({ label, value }) => (
          <button
            key={value}
            onClick={() => onHoursChange(value)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors ${
              hours === value
                ? "bg-gray-600 text-white"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
