import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

export function usePlantingCalendar(date?: string) {
  return useQuery({
    queryKey: ["planting", "calendar", date ?? "today"],
    queryFn: () => api.planting.calendar(date),
    staleTime: 60 * 60_000,
    refetchInterval: 60 * 60_000,
  });
}

export function useZoneInfo() {
  return useQuery({
    queryKey: ["planting", "zone"],
    queryFn: api.planting.zone,
    staleTime: 24 * 60 * 60_000,
  });
}
