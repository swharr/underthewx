import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { computeCalendar } from "../services/plantingService";
import { log } from "../utils/logger";

app.http("plantingCalendar", {
  methods: ["GET"],
  route: "planting/calendar",
  authLevel: "anonymous",
  handler: async (req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    const dateParam = req.query.get("date");
    const asOf = dateParam ? new Date(dateParam) : new Date();

    if (isNaN(asOf.getTime())) {
      return { status: 400, jsonBody: { error: "Invalid date parameter." } };
    }

    const calendar = computeCalendar(asOf);
    log("info", "plantingCalendar served", { asOf: asOf.toISOString() });

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
