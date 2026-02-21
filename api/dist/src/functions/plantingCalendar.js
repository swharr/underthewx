"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const functions_1 = require("@azure/functions");
const plantingService_1 = require("../services/plantingService");
const logger_1 = require("../utils/logger");
functions_1.app.http("plantingCalendar", {
    methods: ["GET"],
    route: "planting/calendar",
    authLevel: "anonymous",
    handler: async (req, _ctx) => {
        const dateParam = req.query.get("date");
        const asOf = dateParam ? new Date(dateParam) : new Date();
        if (isNaN(asOf.getTime())) {
            return { status: 400, jsonBody: { error: "Invalid date parameter." } };
        }
        const calendar = (0, plantingService_1.computeCalendar)(asOf);
        (0, logger_1.log)("info", "plantingCalendar served", { asOf: asOf.toISOString() });
        return {
            status: 200,
            jsonBody: { asOf: asOf.toISOString().slice(0, 10), ...calendar },
            headers: {
                "Cache-Control": "public, max-age=3600",
                "Content-Type": "application/json",
            },
        };
    },
});
//# sourceMappingURL=plantingCalendar.js.map