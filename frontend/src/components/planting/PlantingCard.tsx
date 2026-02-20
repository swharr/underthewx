import { format, parseISO, differenceInDays } from "date-fns";
import type { PlantingStatus } from "../../types/planting";

const STATUS_CONFIG: Record<PlantingStatus, { label: string; color: string; bg: string }> = {
  too_early: { label: "Too Early", color: "text-gray-400", bg: "bg-gray-800" },
  plant_now: { label: "PLANT NOW", color: "text-green-300", bg: "bg-green-900/40" },
  last_chance: { label: "Last Chance!", color: "text-yellow-300", bg: "bg-yellow-900/40" },
  too_late: { label: "Too Late", color: "text-gray-600", bg: "bg-gray-900" },
};

interface PlantingCardProps {
  name: string;
  status: PlantingStatus;
  plantBy: string;
  harvestBy?: string;
  plantingMethod: "DS" | "TP";
  indoorStartDate?: string | null;
  successionInfo?: string;
  notes?: string;
}

export function PlantingCard({
  name,
  status,
  plantBy,
  harvestBy,
  plantingMethod,
  indoorStartDate,
  successionInfo,
  notes,
}: PlantingCardProps) {
  const cfg = STATUS_CONFIG[status];
  const daysUntil = differenceInDays(parseISO(plantBy), new Date());

  return (
    <div className={`card-sm ${cfg.bg} ${status === "too_late" ? "opacity-40" : ""}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <p className="font-medium text-gray-200 text-sm">{name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
            <span className="badge bg-gray-800 text-gray-400">
              {plantingMethod === "DS" ? "Direct Seed" : "Transplant"}
            </span>
          </div>
        </div>
        <div className="text-right shrink-0">
          {daysUntil > 0 ? (
            <p className="text-xs text-gray-500">in {daysUntil}d</p>
          ) : daysUntil === 0 ? (
            <p className="text-xs text-green-400">Today!</p>
          ) : (
            <p className="text-xs text-gray-600">{Math.abs(daysUntil)}d ago</p>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-500 space-y-0.5">
        {indoorStartDate && (
          <p>Start indoors: {format(parseISO(indoorStartDate), "MMM d")}</p>
        )}
        <p>
          {plantingMethod === "TP" ? "Transplant" : "Plant"} by:{" "}
          <span className={status === "plant_now" || status === "last_chance" ? "text-gray-300" : ""}>
            {format(parseISO(plantBy), "MMM d")}
          </span>
        </p>
        {harvestBy && (
          <p>Harvest by: {format(parseISO(harvestBy), "MMM d")}</p>
        )}
        {successionInfo && <p className="text-gray-600">{successionInfo}</p>}
        {notes && <p className="text-gray-600 italic">{notes}</p>}
      </div>
    </div>
  );
}
