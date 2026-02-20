import type { AggregatedReading, HistoricalPoint, HistoryResolution } from "../types/weather";
import type { PlantingCalendarResponse, ZoneInfo } from "../types/planting";

const BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API ${res.status}: ${err}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  weather: {
    aggregated: (): Promise<AggregatedReading> =>
      get<AggregatedReading>("/weather/aggregated"),

    history: (resolution: HistoryResolution, hours: number): Promise<{ data: HistoricalPoint[] }> =>
      get<{ data: HistoricalPoint[] }>(`/weather/history?resolution=${resolution}&hours=${hours}`),
  },
  planting: {
    calendar: (date?: string): Promise<PlantingCalendarResponse> =>
      get<PlantingCalendarResponse>(`/planting/calendar${date ? `?date=${date}` : ""}`),

    zone: (): Promise<ZoneInfo> =>
      get<ZoneInfo>("/planting/zone"),
  },
};
