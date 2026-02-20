import { useState } from "react";
import { ZoneInfo } from "./ZoneInfo";
import { SuccessionView } from "./SuccessionView";
import { FallCropsView } from "./FallCropsView";

type PlantingTab = "succession" | "fall";

export function PlantingCalendar() {
  const [tab, setTab] = useState<PlantingTab>("succession");

  return (
    <div className="space-y-4">
      <ZoneInfo />

      <div className="flex gap-2">
        {[
          { id: "succession" as PlantingTab, label: "Succession Planting" },
          { id: "fall" as PlantingTab, label: "Fall Harvest" },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === id
                ? "bg-green-900/60 text-green-300 border border-green-800"
                : "text-gray-400 hover:text-gray-200 border border-transparent"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "succession" && <SuccessionView />}
      {tab === "fall" && <FallCropsView />}
    </div>
  );
}
