import { usePlantingCalendar } from "../../hooks/usePlantingCalendar";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { ErrorCard } from "../shared/ErrorCard";
import { PlantingCard } from "./PlantingCard";
import type { PlantingStatus } from "../../types/planting";

const STATUS_ORDER: PlantingStatus[] = ["plant_now", "last_chance", "too_early", "too_late"];

export function FallCropsView() {
  const { data, isLoading, isError, error } = usePlantingCalendar();

  if (isLoading) return <LoadingSpinner />;
  if (isError) return <ErrorCard message={error instanceof Error ? error.message : "Failed to load"} />;
  if (!data) return null;

  const sorted = [...data.fallCrops].sort(
    (a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status)
  );

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
        Fall Harvest Crops ({sorted.filter((c) => c.status !== "too_late").length} actionable)
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {sorted.map((crop) => (
          <PlantingCard
            key={crop.name}
            name={crop.name}
            status={crop.status}
            plantBy={crop.plantBy}
            plantingMethod={crop.plantingMethod}
            notes={crop.notes}
          />
        ))}
      </div>
    </div>
  );
}
