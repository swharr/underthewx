/**
 * import-planting-data.ts
 * Converts the two xlsx files in data_src/ into a TypeScript constants file.
 * Run once: npx ts-node scripts/import-planting-data.ts
 * Output: frontend/src/constants/planting-data.ts
 */
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.resolve(__dirname, "../data_src");
const OUT_FILE = path.resolve(
  __dirname,
  "../frontend/src/constants/planting-data.ts"
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface SuccessionCrop {
  name: string;
  daysToMaturity: number;
  successionIntervalDays: number;
  maxSuccessions: number;
  plantingMethod: "DS" | "TP";
  notes?: string;
}

interface FallCrop {
  name: string;
  daysBack: number; // days before first fall frost to plant/transplant
  plantingMethod: "DS" | "TP";
  notes?: string;
}

// ── Excel serial date helper ──────────────────────────────────────────────────

function excelSerialToDate(serial: number): Date {
  // Excel epoch: Dec 30, 1899. JS epoch: Jan 1, 1970
  const msPerDay = 86400000;
  return new Date(Date.UTC(1899, 11, 30) + serial * msPerDay);
}

// ── Parse succession planting spreadsheet ────────────────────────────────────

function parseSuccessionSheet(): SuccessionCrop[] {
  const wb = XLSX.readFile(
    path.join(DATA_DIR, "succession-planting-spreadsheet.xlsx")
  );
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true });

  const crops: SuccessionCrop[] = [];

  // Actual layout (0-indexed columns):
  //   col 0: blank
  //   col 1: Variety
  //   col 2: Days to Maturity
  //   col 3: Interval Between Successions (days)
  //   col 4-11: 1st–8th Planting (Excel serials)
  //   col 12: Final Planting Date
  // Row 0: title, Row 1: frost date input, Row 2: header, Row 3+: data
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[1] || typeof row[1] !== "string") continue;

    const name = String(row[1]).trim();
    const daysToMaturity = parseInt(row[2], 10) || 0;
    const successionIntervalDays = parseInt(row[3], 10) || 0;

    if (!name || daysToMaturity === 0) continue;

    // Count how many succession columns have values (columns 4-11)
    let maxSuccessions = 0;
    for (let j = 4; j <= 11; j++) {
      if (row[j] != null && row[j] !== "") maxSuccessions++;
    }

    // Most succession crops are direct-seeded; flowers/herbs are flagged
    const tp_crops = ["Frosted Explosion", "Zinnia"];
    const plantingMethod: "DS" | "TP" = tp_crops.some((c) =>
      name.includes(c)
    )
      ? "TP"
      : "DS";

    crops.push({
      name,
      daysToMaturity,
      successionIntervalDays,
      maxSuccessions: maxSuccessions || 1,
      plantingMethod,
    });
  }

  return crops;
}

// ── Parse fall harvest crops spreadsheet ─────────────────────────────────────

function parseFallCropsSheet(): FallCrop[] {
  const wb = XLSX.readFile(
    path.join(DATA_DIR, "calculator-planting-dates-fall-harvest-crops.xlsx")
  );
  const sheetName = wb.SheetNames[0];
  const ws = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1, raw: true });

  const crops: FallCrop[] = [];

  // The first row contains the frost date input cell; crop data starts at row 2
  // Columns: [Crop, PlantingDateFormula (serial), Formula Notes column, Notes]
  // We need to extract the "days back" from the formula rather than the absolute date
  // because the spreadsheet was filled with a sample frost date (Oct 1, 2023 = serial 45200)

  const SAMPLE_FROST_DATE_SERIAL = 45200; // Oct 1, 2023 in Excel serial

  // Known crop to planting method mapping (from spreadsheet analysis)
  const tpCrops = [
    "Broccoli",
    "Brussels Sprouts",
    "Cabbage",
    "Cauliflower",
    "Celery",
    "Celeriac",
    "Collards",
    "Chicory",
    "Leeks",
    "Kohlrabi",
  ];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || !row[0] || typeof row[0] !== "string") continue;

    const name = String(row[0]).trim();
    if (!name || name.toLowerCase().includes("frost") || name.length < 2)
      continue;

    // Column B contains the calculated planting date as Excel serial
    const plantingSerial = row[1];
    if (typeof plantingSerial !== "number") continue;

    const daysBack = SAMPLE_FROST_DATE_SERIAL - plantingSerial;
    if (daysBack <= 0 || daysBack > 200) continue;

    const plantingMethod: "DS" | "TP" = tpCrops.some((c) =>
      name.toLowerCase().includes(c.toLowerCase())
    )
      ? "TP"
      : "DS";

    // Extract notes from column D if present
    const notes =
      row[3] && typeof row[3] === "string" ? row[3].trim() : undefined;

    crops.push({
      name,
      daysBack,
      plantingMethod,
      notes: notes || undefined,
    });
  }

  return crops;
}

// ── Write output ─────────────────────────────────────────────────────────────

function main() {
  console.log("Parsing succession planting spreadsheet...");
  const successionCrops = parseSuccessionSheet();
  console.log(`  Found ${successionCrops.length} succession crops`);

  console.log("Parsing fall harvest crops spreadsheet...");
  const fallCrops = parseFallCropsSheet();
  console.log(`  Found ${fallCrops.length} fall crops`);

  const output = `/**
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

export const SUCCESSION_CROPS: SuccessionCrop[] = ${JSON.stringify(successionCrops, null, 2)};

export const FALL_CROPS: FallCrop[] = ${JSON.stringify(fallCrops, null, 2)};
`;

  fs.writeFileSync(OUT_FILE, output, "utf-8");
  console.log(`\nWrote ${OUT_FILE}`);
  console.log("Done.");
}

main();
