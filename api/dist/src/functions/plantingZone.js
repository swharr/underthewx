"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const storageService_1 = require("../services/storageService");
const logger_1 = require("../utils/logger");
const DEFAULT_ZONE = "6b-7a";
functions_1.app.http("plantingZoneGet", {
    methods: ["GET"],
    route: "planting/zone",
    authLevel: "anonymous",
    handler: async (_req, _ctx) => {
        const config = await (0, storageService_1.getPlantingConfig)("zone");
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
            (0, logger_1.log)("warn", "USDA zone annual check is due", {
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
functions_1.app.http("plantingZoneRefresh", {
    methods: ["POST"],
    route: "planting/zone/refresh",
    authLevel: "function",
    handler: async (req, _ctx) => {
        const body = await req.json();
        if (!body.zone) {
            return { status: 400, jsonBody: { error: "Body must include { zone, verifiedDate }" } };
        }
        await (0, storageService_1.upsertPlantingConfig)("zone", {
            zone: body.zone,
            verifiedDate: body.verifiedDate ?? new Date().toISOString().slice(0, 10),
        });
        (0, logger_1.log)("info", "Zone updated", body);
        return { status: 200, jsonBody: { ok: true, zone: body.zone } };
    },
});
//# sourceMappingURL=plantingZone.js.map