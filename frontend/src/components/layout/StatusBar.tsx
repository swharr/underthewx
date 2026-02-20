import { useWeatherData } from "../../hooks/useWeatherData";
import { formatAge } from "../../lib/dateUtils";
import { STATIONS } from "../../constants/stations";
import type { StationKey } from "../../constants/stations";

export function StatusBar() {
  const { data, isError, isFetching } = useWeatherData();

  const stationKeys: StationKey[] = ["tempest", "wunderground", "usu16", "usu1302734"];

  return (
    <div className="flex items-center gap-4 px-4 py-1.5 bg-gray-900/80 border-b border-gray-800 text-xs text-gray-400">
      <span className="flex items-center gap-1.5">
        <span
          className={`h-2 w-2 rounded-full ${
            isFetching ? "bg-yellow-400 animate-pulse" : isError ? "bg-red-500" : "bg-green-500"
          }`}
        />
        {isError
          ? "Connection error"
          : data
          ? `Updated ${formatAge(data.dataAgeSeconds)}`
          : "Connecting…"}
      </span>
      <span className="text-gray-700">|</span>
      <div className="flex items-center gap-3">
        {stationKeys.map((key) => {
          const station = STATIONS[key];
          const reading = data?.stations[key];
          const isStale = reading?.stale ?? true;
          return (
            <span key={key} className="flex items-center gap-1">
              <span
                className={`h-1.5 w-1.5 rounded-full`}
                style={{ backgroundColor: isStale ? "#6b7280" : station.color }}
              />
              <span style={{ color: isStale ? "#6b7280" : station.color }}>
                {station.label.split(" ")[0]}
              </span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
