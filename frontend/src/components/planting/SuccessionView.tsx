import { usePlantingCalendar } from "../../hooks/usePlantingCalendar";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { ErrorCard } from "../shared/ErrorCard";
import { PlantingCard } from "./PlantingCard";
import type { PlantingStatus } from "../../types/planting";

const STATUS_ORDER: PlantingStatus[] = ["plant_now", "last_chance", "too_early", "too_late"];

export function SuccessionView() {
  const { data, isLoading, isError, error } = usePlantingCalendar();

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorCard message={error instanceof Error ? error.message : "Failed to load"} />;
  if (!data) return null;

  const sorted = [...data.successionCrops].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );

  const actionable = sorted.filter((c) => c.status !== "too_late");
  const done = sorted.filter((c) => c.status === "too_late");

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
        Succession Planting ({actionable.length} active)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {actionable.map((crop) => {
          const window = crop.windows.find((w) => {
            const daysDiff = new Date(w.plantBy).getTime() - Date.now();
            return daysDiff > -7 * 86400000;
          });
          return (
            <PlantingCard
              key={crop.name}
              name={crop.name}
              status={crop.status}
              plantBy={window?.plantBy ?? crop.outdoorTransplantDate ?? ""}
              harvestBy={window?.harvestBy}
              plantingMethod={crop.plantingMethod}
              indoorStartDate={crop.indoorStartDate}
              successionInfo={
                crop.maxSuccessions > 1
                  ? `${crop.successionIntervalDays}-day successions (${crop.windows.length} windows)`
                  : undefined
              }
            />
          );
        })}
      </div>
      {done.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-500">
            {done.length} crop(s) past season
          </summary>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
            {done.map((crop) => (
              <PlantingCard
                key={crop.name}
                name={crop.name}
                status={crop.status}
                plantBy={crop.outdoorTransplantDate ?? ""}
                plantingMethod={crop.plantingMethod}
              />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
