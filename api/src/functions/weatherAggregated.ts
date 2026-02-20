import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { getLatest } from "../services/storageService";
import { log } from "../utils/logger";
import type { AggregatedReading } from "../models/weatherTypes";
import type { FrostRisk } from "../models/weatherTypes";

app.http("weatherAggregated", {
  methods: ["GET"],
  route: "weather/aggregated",
  authLevel: "anonymous",
  handler: async (_req: HttpRequest, _ctx: InvocationContext): Promise<HttpResponseInit> => {
    const latest = await getLatest();

    if (!latest) {
      return {
        status: 503,
        jsonBody: { error: "No weather data collected yet. Wait for the first collection run." },
      };
    }

    const updatedAt = new Date(latest.updatedAt);
    const dataAgeSeconds = Math.floor((Date.now() - updatedAt.getTime()) / 1000);

    const safeParse = <T>(json: string): T | undefined => {
      try { return JSON.parse(json) as T; } catch { return undefined; }
    };

    const response: AggregatedReading = {
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
        frostRisk: latest.frostRisk as FrostRisk,
      },
      stations: {
        tempest: safeParse(latest.tempestJson),
        wunderground: safeParse(latest.wundergroundJson),
        usu16: safeParse(latest.usu16Json),
        usu1302734: safeParse(latest.usu1302734Json),
      },
    };

    log("info", "weatherAggregated served", { dataAgeSeconds });

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
