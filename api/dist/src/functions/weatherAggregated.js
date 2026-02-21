"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const storageService_1 = require("../services/storageService");
const logger_1 = require("../utils/logger");
functions_1.app.http("weatherAggregated", {
    methods: ["GET"],
    route: "weather/aggregated",
    authLevel: "anonymous",
    handler: async (_req, _ctx) => {
        const latest = await (0, storageService_1.getLatest)();
        if (!latest) {
            return {
                status: 503,
                jsonBody: { error: "No weather data collected yet. Wait for the first collection run." },
            };
        }
        const updatedAt = new Date(latest.updatedAt);
        const dataAgeSeconds = Math.floor((Date.now() - updatedAt.getTime()) / 1000);
        const safeParse = (json) => {
            try {
                return JSON.parse(json);
            }
            catch {
                return undefined;
            }
        };
        const response = {
            timestamp: latest.updatedAt,
            dataAgeSeconds,
            homeLocation: {
                tempF: latest.aggTempF,
                dewPointF: latest.aggDewPointF,
                humidity: latest.aggHumidity,
                pressureInHg: latest.aggPressureInHg,
                windSpeedMph: latest.aggWindSpeedMph,
                windDirDeg: latest.aggWindDirDeg,
                windGustMph: latest.aggWindGustMph,
                precipRateInHr: latest.aggPrecipRateInHr,
                precipTodayIn: latest.aggPrecipTodayIn,
                solarWm2: latest.aggSolarWm2,
                uvIndex: latest.aggUvIndex,
                feelsLikeF: latest.aggFeelsLikeF,
                frostRisk: latest.frostRisk,
                ...(latest.estSoilTempF !== undefined && { estSoilTempF: latest.estSoilTempF }),
                ...(latest.estSoilMoisturePct !== undefined && { estSoilMoisturePct: latest.estSoilMoisturePct }),
            },
            stations: {
                tempest: safeParse(latest.tempestJson),
                wunderground: safeParse(latest.wundergroundJson),
                usu16: safeParse(latest.usu16Json),
                usu1302734: safeParse(latest.usu1302734Json),
            },
        };
        (0, logger_1.log)("info", "weatherAggregated served", { dataAgeSeconds });
        return {
            status: 200,
            jsonBody: response,
            headers: {
                "Cache-Control": "no-cache",
                "Content-Type": "application/json",
            },
        };
    },
});
//# sourceMappingURL=weatherAggregated.js.map