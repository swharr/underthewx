import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function useWeatherData() {
  return useQuery({
    queryKey: ["weather", "aggregated"],
    queryFn: api.weather.aggregated,
    refetchInterval: 60_000,
    staleTime: 55_000,
  });
}
