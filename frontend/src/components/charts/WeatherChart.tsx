import { useState } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";
import { useHistoricalData } from "../../hooks/useHistoricalData";
import { ChartControls } from "./ChartControls";
import { LoadingSpinner } from "../shared/LoadingSpinner";
import { ErrorCard } from "../shared/ErrorCard";
import { STATIONS } from "../../constants/stations";
import type { HistoryResolution } from "../../types/weather";

type ChartField = "tempF" | "humidity" | "precipTodayIn" | "windSpeedMph" | "solarWm2";

const CHART_TABS: { id: ChartField; label: string }[] = [
  { id: "tempF", label: "Temperature °F" },
  { id: "humidity", label: "Humidity %" },
  { id: "precipTodayIn", label: "Precip (in)" },
  { id: "windSpeedMph", label: "Wind (mph)" },
  { id: "solarWm2", label: "Solar (W/m²)" },
];

const PRECIP_FIELDS: ChartField[] = ["precipTodayIn"];

export function WeatherChart() {
  const [resolution, setResolution] = useState<HistoryResolution>("hourly");
  const [hours, setHours] = useState(48);
  const [field, setField] = useState<ChartField>("tempF");

  const { data, isLoading, isError, error } = useHistoricalData(resolution, hours);

  const isBar = PRECIP_FIELDS.includes(field);

  const chartData = (data?.data ?? []).map((pt) => ({
    time: format(
      parseISO(pt.timestamp),
      resolution === "daily" ? "MMM d" : resolution === "hourly" ? "M/d HH:mm" : "HH:mm"
    ),
    aggregated: (pt.aggregated as Record<string, number>)[field] ?? null,
    tempest: pt.tempest ? (pt.tempest as Record<string, number>)[field] ?? null : null,
    wunderground: pt.wunderground ? (pt.wunderground as Record<string, number>)[field] ?? null : null,
    usu16: pt.usu16 ? (pt.usu16 as Record<string, number>)[field] ?? null : null,
    usu1302734: pt.usu1302734 ? (pt.usu1302734 as Record<string, number>)[field] ?? null : null,
  }));

  return (
    <div className="space-y-4">
      <ChartControls
        resolution={resolution}
        hours={hours}
        onResolutionChange={setResolution}
        onHoursChange={setHours}
      />

      <div className="flex gap-2 flex-wrap">
        {CHART_TABS.map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setField(id)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
              field === id
                ? "border-sky-500 text-sky-300 bg-sky-900/40"
                : "border-gray-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {isLoading && (
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner />
        </div>
      )}

      {isError && (
        <ErrorCard message={error instanceof Error ? error.message : "Failed to load chart data"} />
      )}

      {!isLoading && !isError && (
        <div className="card">
          <ResponsiveContainer width="100%" height={300}>
            {isBar ? (
              <BarChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#e5e7eb" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="aggregated" name="Home (aggregated)" fill="#0ea5e9" />
              </BarChart>
            ) : (
              <LineChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="time" tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: 8 }}
                  labelStyle={{ color: "#e5e7eb" }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line dataKey="aggregated" name="Home" stroke="#0ea5e9" dot={false} strokeWidth={2} />
                <Line dataKey="tempest" name={STATIONS.tempest.label} stroke={STATIONS.tempest.color} dot={false} strokeWidth={1} strokeOpacity={0.7} />
                <Line dataKey="wunderground" name={STATIONS.wunderground.label} stroke={STATIONS.wunderground.color} dot={false} strokeWidth={1} strokeOpacity={0.7} />
                <Line dataKey="usu16" name={STATIONS.usu16.label} stroke={STATIONS.usu16.color} dot={false} strokeWidth={1} strokeOpacity={0.7} />
                <Line dataKey="usu1302734" name={STATIONS.usu1302734.label} stroke={STATIONS.usu1302734.color} dot={false} strokeWidth={1} strokeOpacity={0.7} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
