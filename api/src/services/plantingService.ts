import { format, addDays, differenceInDays, parseISO } from "date-fns";

// Planting data is embedded here (mirrors frontend/src/constants/planting-data.ts)
// to avoid requiring a build step for the API to access it.
// Update both files when running import-planting-data.ts

const DEFAULT_SPRING_FROST = process.env.HOME_FROST_DATE_SPRING ?? "04-25";
const DEFAULT_FALL_FROST = process.env.HOME_FROST_DATE_FALL ?? "10-05";

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

interface SuccessionCropDef {
  name: string;
  daysToMaturity: number;
  successionIntervalDays: number;
  maxSuccessions: number;
  plantingMethod: "DS" | "TP";
  notes?: string;
}

interface FallCropDef {
  name: string;
  daysBack: number;
  plantingMethod: "DS" | "TP";
  notes?: string;
}

// Inline default crop data (generated from xlsx; override by re-running import script)
const SUCCESSION_CROPS: SuccessionCropDef[] = [
  { name: "Beans", daysToMaturity: 55, successionIntervalDays: 10, maxSuccessions: 8, plantingMethod: "DS" },
  { name: "Beets", daysToMaturity: 50, successionIntervalDays: 14, maxSuccessions: 6, plantingMethod: "DS" },
  { name: "Cucumbers", daysToMaturity: 60, successionIntervalDays: 21, maxSuccessions: 4, plantingMethod: "DS" },
  { name: "Kale/Collard", daysToMaturity: 60, successionIntervalDays: 21, maxSuccessions: 3, plantingMethod: "DS" },
  { name: "Lettuce, Full-size", daysToMaturity: 55, successionIntervalDays: 14, maxSuccessions: 6, plantingMethod: "DS" },
  { name: "Lettuce, Salad Mix", daysToMaturity: 28, successionIntervalDays: 7, maxSuccessions: 8, plantingMethod: "DS" },
  { name: "Melons", daysToMaturity: 70, successionIntervalDays: 21, maxSuccessions: 2, plantingMethod: "DS" },
  { name: "Radish", daysToMaturity: 26, successionIntervalDays: 7, maxSuccessions: 8, plantingMethod: "DS" },
  { name: "Spinach", daysToMaturity: 40, successionIntervalDays: 7, maxSuccessions: 6, plantingMethod: "DS" },
  { name: "Summer Squash", daysToMaturity: 48, successionIntervalDays: 42, maxSuccessions: 2, plantingMethod: "DS" },
  { name: "Basil, Genovese", daysToMaturity: 68, successionIntervalDays: 14, maxSuccessions: 4, plantingMethod: "DS" },
  { name: "Cilantro, Santo", daysToMaturity: 50, successionIntervalDays: 14, maxSuccessions: 4, plantingMethod: "DS" },
];

const FALL_CROPS: FallCropDef[] = [
  { name: "Beets", daysBack: 73, plantingMethod: "DS" },
  { name: "Broccoli", daysBack: 84, plantingMethod: "TP" },
  { name: "Brussels Sprouts", daysBack: 120, plantingMethod: "TP" },
  { name: "Cabbage, storage", daysBack: 115, plantingMethod: "TP" },
  { name: "Cabbage, fresh eating", daysBack: 90, plantingMethod: "TP" },
  { name: "Cabbage, Chinese", daysBack: 67, plantingMethod: "TP" },
  { name: "Carrots", daysBack: 86, plantingMethod: "DS" },
  { name: "Cauliflower", daysBack: 83, plantingMethod: "TP" },
  { name: "Celery", daysBack: 108, plantingMethod: "TP" },
  { name: "Celeriac", daysBack: 128, plantingMethod: "TP" },
  { name: "Kale", daysBack: 88, plantingMethod: "DS" },
  { name: "Kohlrabi", daysBack: 60, plantingMethod: "DS" },
  { name: "Leeks", daysBack: 115, plantingMethod: "TP" },
  { name: "Lettuce, baby", daysBack: 58, plantingMethod: "DS" },
  { name: "Lettuce, heads", daysBack: 68, plantingMethod: "DS" },
  { name: "Peas", daysBack: 102, plantingMethod: "DS" },
  { name: "Radish, round", daysBack: 36, plantingMethod: "DS" },
  { name: "Radish, Daikon", daysBack: 65, plantingMethod: "DS" },
  { name: "Spinach", daysBack: 54, plantingMethod: "DS" },
  { name: "Swiss chard, bunching", daysBack: 64, plantingMethod: "DS" },
  { name: "Turnips, salad", daysBack: 53, plantingMethod: "DS" },
  { name: "Turnip, purple top", daysBack: 64, plantingMethod: "DS" },
];

function getFrostDates(year: number): { spring: Date; fall: Date } {
  return {
    spring: parseISO(`${year}-${DEFAULT_SPRING_FROST}`),
    fall: parseISO(`${year}-${DEFAULT_FALL_FROST}`),
  };
}

function classifyStatus(daysUntil: number, windowDays: number): PlantingStatus {
  if (daysUntil > windowDays + 14) return "too_early";
  if (daysUntil > 0) return "plant_now";
  if (daysUntil > -7) return "last_chance";
  return "too_late";
}

export function computeCalendar(asOf: Date): {
  frostDates: { lastSpringFrost: string; firstFallFrost: string };
  successionCrops: SuccessionCropResult[];
  fallCrops: FallCropResult[];
} {
  const year = asOf.getFullYear();
  const { spring: springFrost, fall: fallFrost } = getFrostDates(year);

  const successionCrops: SuccessionCropResult[] = SUCCESSION_CROPS.map((crop) => {
    // First planting = after last spring frost + 7 day safety buffer
    const firstPlanting = addDays(springFrost, 7);
    // Last possible planting = fall frost - days to maturity - 14 day safety buffer
    const lastPlanting = addDays(fallFrost, -(crop.daysToMaturity + 14));

    const windows: PlantingWindow[] = [];
    for (let i = 0; i < crop.maxSuccessions; i++) {
      const plantBy = addDays(firstPlanting, i * crop.successionIntervalDays);
      if (plantBy > lastPlanting) break;
      windows.push({
        plantBy: format(plantBy, "yyyy-MM-dd"),
        harvestBy: format(addDays(plantBy, crop.daysToMaturity), "yyyy-MM-dd"),
        succession: i + 1,
      });
    }

    // Status: find first upcoming window
    const upcomingWindow = windows.find((w) => differenceInDays(parseISO(w.plantBy), asOf) >= -7);
    const daysUntil = upcomingWindow
      ? differenceInDays(parseISO(upcomingWindow.plantBy), asOf)
      : -999;

    const status: PlantingStatus =
      windows.length === 0
        ? "too_late"
        : daysUntil > 14
        ? "too_early"
        : daysUntil >= -7
        ? daysUntil >= 0 ? "plant_now" : "last_chance"
        : "too_late";

    // Transplants need ~6-8 weeks indoor start before outdoor date
    const indoorStartDate =
      crop.plantingMethod === "TP" && windows.length > 0
        ? format(addDays(parseISO(windows[0].plantBy), -42), "yyyy-MM-dd")
        : null;

    return {
      name: crop.name,
      daysToMaturity: crop.daysToMaturity,
      successionIntervalDays: crop.successionIntervalDays,
      maxSuccessions: crop.maxSuccessions,
      plantingMethod: crop.plantingMethod,
      status,
      windows,
      indoorStartDate,
      outdoorTransplantDate: windows.length > 0 ? windows[0].plantBy : null,
    };
  });

  const fallCropsResult: FallCropResult[] = FALL_CROPS.map((crop) => {
    const plantBy = addDays(fallFrost, -crop.daysBack);
    const daysUntilPlant = differenceInDays(plantBy, asOf);

    let status: PlantingStatus;
    if (daysUntilPlant > 30) status = "too_early";
    else if (daysUntilPlant >= 0) status = "plant_now";
    else if (daysUntilPlant >= -7) status = "last_chance";
    else status = "too_late";

    return {
      name: crop.name,
      plantingMethod: crop.plantingMethod,
      plantBy: format(plantBy, "yyyy-MM-dd"),
      daysUntilPlant,
      status,
      notes: crop.notes,
    };
  });

  return {
    frostDates: {
      lastSpringFrost: format(springFrost, "yyyy-MM-dd"),
      firstFallFrost: format(fallFrost, "yyyy-MM-dd"),
    },
    successionCrops,
    fallCrops: fallCropsResult,
  };
}
