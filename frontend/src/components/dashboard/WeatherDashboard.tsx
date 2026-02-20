import { useWeatherData } from "../../hooks/useWeatherData";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { ErrorCard } from "../shared/ErrorCard";
import { AggregatedCard } from "./AggregatedCard";
import { StationCard } from "./StationCard";
import { FrostAlertBanner } from "./FrostAlertBanner";
import type { StationKey } from "../../constants/stations";

const STATION_KEYS: StationKey[] = ["tempest", "wunderground", "usu16", "usu1302734"];

export function WeatherDashboard() {
  const { data, isLoading, isError, error } = useWeatherData();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return <ErrorCard message={error instanceof Error ? error.message : "Failed to load weather data"} />;
  }

  if (!data) return null;

  return (
    <div className="space-y-4">
      {data.homeLocation.frostRisk !== "none" && (
        <FrostAlertBanner
          frostRisk={data.homeLocation.frostRisk}
          tempF={data.homeLocation.tempF}
          solarWm2={data.homeLocation.solarWm2}
          windSpeedMph={data.homeLocation.windSpeedMph}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <AggregatedCard data={data.homeLocation} />
        </div>
        <div className="lg:col-span-2 grid grid-cols-2 gap-3">
          {STATION_KEYS.map((key) => (
            <StationCard key={key} stationKey={key} reading={data.stations[key]} />
          ))}
        </div>
      </div>
    </div>
  );
}
