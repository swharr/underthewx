import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getPlantingConfig, upsertPlantingConfig } from "../services/storageService";
import { log } from "../utils/logger";

const DEFAULT_ZONE = "6b-7a";

app.http("plantingZoneGet", {
  methods: ["GET"],
  route: "planting/zone",
  authLevel: "anonymous",
  handler: async (_req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    const config = await getPlantingConfig("zone");
    const currentYear = new Date().getFullYear();

    let zone = DEFAULT_ZONE;
    let lastChecked = "never";

    if (config) {
      const parsed = JSON.parse(config.value);
      zone = parsed.zone ?? DEFAULT_ZONE;
      lastChecked = parsed.verifiedDate ?? config.lastUpdated ?? "unknown";
    }

    const lastCheckedYear = lastChecked !== "never" ? new Date(lastChecked).getFullYear() : 0;
    const annualCheckDue = lastCheckedYear < currentYear;

    if (annualCheckDue) {
      log("warn", "USDA zone annual check is due", {
        lastChecked,
        note: "POST /api/planting/zone/refresh with function key to update",
      });
    }

    return {
      status: 200,
      jsonBody: {
        zone,
        lastChecked,
        annualCheckDue,
        location: { lat: 40.33307, lon: -111.72761, elevationFt: 4623 },
        source: "manual_verified",
      },
    };
  },
});

app.http("plantingZoneRefresh", {
  methods: ["POST"],
  route: "planting/zone/refresh",
  authLevel: "function",
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    const body = await req.json() as { zone?: string; verifiedDate?: string };
    if (!body.zone) {
      return { status: 400, jsonBody: { error: "Body must include { zone, verifiedDate }" } };
    }
    await upsertPlantingConfig("zone", {
      zone: body.zone,
      verifiedDate: body.verifiedDate ?? new Date().toISOString().slice(0, 10),
    });
    log("info", "Zone updated", body);
    return { status: 200, jsonBody: { ok: true, zone: body.zone } };
  },
});
