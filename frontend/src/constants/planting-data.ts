/**
 * planting-data.ts
 * AUTO-GENERATED — do not edit by hand.
 * Source: data_src/succession-planting-spreadsheet.xlsx
 *         data_src/calculator-planting-dates-fall-harvest-crops.xlsx
 * Regenerate: npx ts-node scripts/import-planting-data.ts
 */

export interface SuccessionCrop {
  name: string;
  daysToMaturity: number;
  successionIntervalDays: number;
  maxSuccessions: number;
  plantingMethod: "DS" | "TP";
  notes?: string;
}

export interface FallCrop {
  /** Days before first fall frost to plant/transplant */
  daysBack: number;
  name: string;
  plantingMethod: "DS" | "TP";
  notes?: string;
}

export const SUCCESSION_CROPS: SuccessionCrop[] = [
  {
    "name": "Beans",
    "daysToMaturity": 55,
    "successionIntervalDays": 10,
    "maxSuccessions": 8,
    "plantingMethod": "DS"
  },
  {
    "name": "Beets",
    "daysToMaturity": 50,
    "successionIntervalDays": 14,
    "maxSuccessions": 8,
    "plantingMethod": "DS"
  },
  {
    "name": "Cucumbers",
    "daysToMaturity": 60,
    "successionIntervalDays": 21,
    "maxSuccessions": 8,
    "plantingMethod": "DS"
  },
  {
    "name": "Kale/Collard",
    "daysToMaturity": 60,
    "successionIntervalDays": 21,
    "maxSuccessions": 8,
    "plantingMethod": "DS"
  },
  {
    "name": "Lettuce, Full-size",
    "daysToMaturity": 55,
    "successionIntervalDays": 14,
    "maxSuccessions": 8,
    "plantingMethod": "DS"
  },
  {
    "name": "Lettuce, Salad Mix",
    "daysToMaturity": 28,
    "successionIntervalDays": 7,
    "maxSuccessions": 8,
    "plantingMethod": "DS"
  },
  {
    "name": "Melons",
    "daysToMaturity": 70,
    "successionIntervalDays": 21,
    "maxSuccessions": 8,
    "plantingMethod": "DS"
  },
  {
    "name": "Radish",
    "daysToMaturity": 26,
    "successionIntervalDays": 7,
    "maxSuccessions": 8,
    "plantingMethod": "DS"
  },
  {
    "name": "Spinach",
    "daysToMaturity": 40,
    "successionIntervalDays": 7,
    "maxSuccessions": 8,
    "plantingMethod": "DS"
  },
  {
    "name": "Summer Squash",
    "daysToMaturity": 48,
    "successionIntervalDays": 42,
    "maxSuccessions": 8,
    "plantingMethod": "DS"
  },
  {
    "name": "Basil, Genovese",
    "daysToMaturity": 68,
    "successionIntervalDays": 14,
    "maxSuccessions": 8,
    "plantingMethod": "DS"
  },
  {
    "name": "Cilantro, Santo",
    "daysToMaturity": 50,
    "successionIntervalDays": 14,
    "maxSuccessions": 8,
    "plantingMethod": "DS"
  },
  {
    "name": "Frosted Explosion",
    "daysToMaturity": 84,
    "successionIntervalDays": 21,
    "maxSuccessions": 8,
    "plantingMethod": "TP"
  },
  {
    "name": "Zinnia, Benary’s Giant",
    "daysToMaturity": 75,
    "successionIntervalDays": 21,
    "maxSuccessions": 8,
    "plantingMethod": "TP"
  }
];

export const FALL_CROPS: FallCrop[] = [
  {
    "name": "Beets (DS)",
    "daysBack": 73,
    "plantingMethod": "DS"
  },
  {
    "name": "Broccoli (TP)",
    "daysBack": 84,
    "plantingMethod": "TP"
  },
  {
    "name": "Brussels Sprouts (TP)***",
    "daysBack": 120,
    "plantingMethod": "TP"
  },
  {
    "name": "Cabbage, storage (TP)",
    "daysBack": 115,
    "plantingMethod": "TP"
  },
  {
    "name": "Cabbage, fresh eating (TP)",
    "daysBack": 90,
    "plantingMethod": "TP"
  },
  {
    "name": "Cabbage, Chinese (TP)",
    "daysBack": 67,
    "plantingMethod": "TP"
  },
  {
    "name": "Carrots (DS)",
    "daysBack": 86,
    "plantingMethod": "DS"
  },
  {
    "name": "Cauliflower (TP)",
    "daysBack": 83,
    "plantingMethod": "TP"
  },
  {
    "name": "Celery (TP)",
    "daysBack": 108,
    "plantingMethod": "TP"
  },
  {
    "name": "Celeriac (TP)",
    "daysBack": 128,
    "plantingMethod": "TP"
  },
  {
    "name": "Collards (TP)",
    "daysBack": 88,
    "plantingMethod": "TP"
  },
  {
    "name": "Chicory - Endive, Escarole (TP)",
    "daysBack": 60,
    "plantingMethod": "TP"
  },
  {
    "name": "Chicory - Radicchio (TP)",
    "daysBack": 80,
    "plantingMethod": "TP"
  },
  {
    "name": "Fennel (DS)",
    "daysBack": 108,
    "plantingMethod": "DS"
  },
  {
    "name": "Greens, Asian, full size (DS)",
    "daysBack": 68,
    "plantingMethod": "DS"
  },
  {
    "name": "Kale (DS)",
    "daysBack": 88,
    "plantingMethod": "DS"
  },
  {
    "name": "Kohlrabi (DS)",
    "daysBack": 60,
    "plantingMethod": "TP"
  },
  {
    "name": "Leeks (TP)",
    "daysBack": 115,
    "plantingMethod": "TP"
  },
  {
    "name": "Lettuce, baby (DS)",
    "daysBack": 58,
    "plantingMethod": "DS"
  },
  {
    "name": "Lettuce, heads (DS)",
    "daysBack": 68,
    "plantingMethod": "DS"
  },
  {
    "name": "Onions (DS)",
    "daysBack": 80,
    "plantingMethod": "DS"
  },
  {
    "name": "Parsnips (DS)",
    "daysBack": 135,
    "plantingMethod": "DS"
  },
  {
    "name": "Radish, round (DS)",
    "daysBack": 36,
    "plantingMethod": "DS"
  },
  {
    "name": "Radish, Daikon (DS)",
    "daysBack": 65,
    "plantingMethod": "DS"
  },
  {
    "name": "Rutabaga (DS)",
    "daysBack": 90,
    "plantingMethod": "DS"
  },
  {
    "name": "Spinach (DS)",
    "daysBack": 54,
    "plantingMethod": "DS"
  },
  {
    "name": "Swiss chard, bunching (DS)",
    "daysBack": 64,
    "plantingMethod": "DS"
  },
  {
    "name": "Turnips, salad (DS)",
    "daysBack": 53,
    "plantingMethod": "DS"
  },
  {
    "name": "Turnip, purple top (DS)",
    "daysBack": 64,
    "plantingMethod": "DS"
  }
];
