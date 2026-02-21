"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const storageService_1 = require("../services/storageService");
const logger_1 = require("../utils/logger");
functions_1.app.http("weatherHistory", {
    methods: ["GET"],
    route: "weather/history",
    authLevel: "anonymous",
    handler: async (req, _ctx) => {
        const resolution = (req.query.get("resolution") ?? "hourly");
        const hours = parseInt(req.query.get("hours") ?? "24", 10);
        if (!["10min", "hourly", "daily"].includes(resolution)) {
            return { status: 400, jsonBody: { error: "Invalid resolution. Use 10min, hourly, or daily." } };
        }
        if (isNaN(hours) || hours < 1 || hours > 8760) {
            return { status: 400, jsonBody: { error: "hours must be 1-8760." } };
        }
        const rows = await (0, storageService_1.queryReadings)(resolution, hours);
        const safeParse = (json) => {
            try {
                return JSON.parse(json);
            }
            catch {
                return null;
            }
        };
        const data = rows.map((row) => ({
            timestamp: row.rowKey,
            aggregated: {
                tempF: row.aggTempF,
                dewPointF: row.aggDewPointF,
                humidity: row.aggHumidity,
                pressureInHg: row.aggPressureInHg,
                windSpeedMph: row.aggWindSpeedMph,
                windDirDeg: row.aggWindDirDeg,
                windGustMph: row.aggWindGustMph,
                precipRateInHr: row.aggPrecipRateInHr,
                precipTodayIn: row.aggPrecipTodayIn,
                solarWm2: row.aggSolarWm2,
                uvIndex: row.aggUvIndex,
                feelsLikeF: row.aggFeelsLikeF,
                frostRisk: row.frostRisk,
            },
            tempest: safeParse(row.tempestJson),
            wunderground: safeParse(row.wundergroundJson),
            usu16: safeParse(row.usu16Json),
            usu1302734: safeParse(row.usu1302734Json),
        }));
        (0, logger_1.log)("info", "weatherHistory served", { resolution, hours, count: data.length });
        return {
            status: 200,
            jsonBody: { resolution, hours, data },
            headers: {
                "Cache-Control": "public, max-age=300",
                "Content-Type": "application/json",
            },
        };
    },
});
//# sourceMappingURL=weatherHistory.js.map