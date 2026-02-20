/**
 * verify-stations.ts
 * Tests connectivity to all 4 weather data sources.
 * Run: npx ts-node scripts/verify-stations.ts
 *
 * Requires TEMPEST_API_TOKEN and WU_API_KEY in environment.
 */

import * as dotenv from "dotenv";
dotenv.config({ path: "../.env" });

const TEMPEST_TOKEN = process.env.TEMPEST_API_TOKEN ?? "";
const TEMPEST_STATION_ID = process.env.TEMPEST_STATION_ID ?? "189439";
const WU_API_KEY = process.env.WU_API_KEY ?? "";
const WU_STATION_ID = process.env.WU_STATION_ID ?? "KUTLINDO32";

async function checkTempest(): Promise<void> {
  if (!TEMPEST_TOKEN) {
    console.log("  SKIP Tempest (no TEMPEST_API_TOKEN set)");
    return;
  }
  const url = `https://swd.weatherflow.com/swd/rest/observations/station/${TEMPEST_STATION_ID}?token=${TEMPEST_TOKEN}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json() as { obs?: unknown[] };
  if (!data.obs || data.obs.length === 0) throw new Error("No observations returned");
  console.log(`  ✓ Tempest station ${TEMPEST_STATION_ID} OK`);
}

async function checkWunderground(): Promise<void> {
  if (!WU_API_KEY) {
    console.log("  SKIP WU (no WU_API_KEY set)");
    return;
  }
  const url = `https://api.weather.com/v2/pws/observations/current?stationId=${WU_STATION_ID}&format=json&units=e&apiKey=${WU_API_KEY}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json() as { observations?: unknown[] };
  if (!data.observations || data.observations.length === 0) throw new Error("No observations returned");
  console.log(`  ✓ WU station ${WU_STATION_ID} OK`);
}

async function checkUsu(stationId: string, label: string): Promise<void> {
  const url = `https://climate.usu.edu/mchd/quickview/quickview.php?network=FGNET&station=${stationId}&units=E`;
  const res = await fetch(url, {
    headers: {
      "User-Agent": "UnderTheWx/1.0 (Garden Weather Aggregator)",
      Accept: "text/html",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const html = await res.text();
  if (html.length < 100) throw new Error("Response too short (possible error page)");
  console.log(`  ✓ USU ${label} (station ${stationId}) OK — ${html.length} bytes`);
}

async function main() {
  console.log("Verifying all 4 weather stations...\n");

  const checks: Array<{ label: string; fn: () => Promise<void> }> = [
    { label: "Tempest", fn: checkTempest },
    { label: "Weather Underground", fn: checkWunderground },
    { label: "USU FGNET #16", fn: () => checkUsu("16", "FGNET #16") },
    { label: "USU FGNET #1302734", fn: () => checkUsu("1302734", "FGNET #1302734") },
  ];

  let passed = 0;
  let failed = 0;

  for (const { label, fn } of checks) {
    try {
      await fn();
      passed++;
    } catch (err: unknown) {
      const e = err as { message?: string };
      console.log(`  ✗ ${label} FAILED: ${e?.message ?? String(err)}`);
      failed++;
    }
    // Polite delay between requests
    await new Promise((r) => setTimeout(r, 1500));
  }

  console.log(`\nResult: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
