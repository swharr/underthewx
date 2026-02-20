import type { FrostRisk } from "../types/weather";

export function computeFrostRisk(
  tempF: number,
  dewPointF: number,
  solarWm2: number,
  windSpeedMph: number
): FrostRisk {
  if (tempF <= 28 || dewPointF <= 32) return "imminent";
  if (tempF <= 34) return "high";
  const radiativeFrost = solarWm2 < 5 && windSpeedMph < 3 && tempF <= 36;
  if (tempF <= 38 || dewPointF <= 34 || radiativeFrost) return "moderate";
  if (tempF <= 42 || dewPointF <= 36) return "low";
  return "none";
}

export const FROST_RISK_CONFIG: Record<FrostRisk, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  description: string;
}> = {
  none: {
    label: "No Frost Risk",
    color: "text-green-400",
    bgColor: "bg-green-950",
    borderColor: "border-green-800",
    description: "Temperature is well above freezing",
  },
  low: {
    label: "Low Frost Risk",
    color: "text-blue-300",
    bgColor: "bg-blue-950",
    borderColor: "border-blue-800",
    description: "Temperature approaching frost range",
  },
  moderate: {
    label: "Moderate Frost Risk",
    color: "text-yellow-300",
    bgColor: "bg-yellow-950",
    borderColor: "border-yellow-800",
    description: "Frost possible — protect sensitive plants",
  },
  high: {
    label: "High Frost Risk",
    color: "text-orange-300",
    bgColor: "bg-orange-950",
    borderColor: "border-orange-800",
    description: "Frost likely — cover or bring in plants",
  },
  imminent: {
    label: "FROST IMMINENT",
    color: "text-red-300",
    bgColor: "bg-red-950",
    borderColor: "border-red-700",
    description: "At or below freezing — act now",
  },
};
