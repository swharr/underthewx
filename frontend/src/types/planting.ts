export type PlantingStatus = "too_early" | "plant_now" | "last_chance" | "too_late";

export interface PlantingWindow {
  plantBy: string;
  harvestBy: string;
  succession: number;
}

export interface SuccessionCropResult {
  name: string;
  daysToMaturity: number;
  successionIntervalDays: number;
  maxSuccessions: number;
  plantingMethod: "DS" | "TP";
  status: PlantingStatus;
  windows: PlantingWindow[];
  indoorStartDate: string | null;
  outdoorTransplantDate: string | null;
}

export interface FallCropResult {
  name: string;
  plantingMethod: "DS" | "TP";
  plantBy: string;
  daysUntilPlant: number;
  status: PlantingStatus;
  notes?: string;
}

export interface PlantingCalendarResponse {
  asOf: string;
  frostDates: {
    lastSpringFrost: string;
    firstFallFrost: string;
  };
  successionCrops: SuccessionCropResult[];
  fallCrops: FallCropResult[];
}

export interface ZoneInfo {
  zone: string;
  lastChecked: string;
  annualCheckDue: boolean;
  location: { lat: number; lon: number; elevationFt: number };
  source: string;
}
