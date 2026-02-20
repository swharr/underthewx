import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { HistoryResolution } from "../types/weather";

export function useHistoricalData(resolution: HistoryResolution, hours: number) {
  return useQuery({
    queryKey: ["weather", "history", resolution, hours],
    queryFn: () => api.weather.history(resolution, hours),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
  });
}
