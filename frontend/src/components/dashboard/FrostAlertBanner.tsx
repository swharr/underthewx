import { useState, useEffect } from "react";
import { AlertTriangle, X, Snowflake } from "lucide-react";
import { FROST_RISK_CONFIG } from "../../lib/frostDetection";
import type { FrostRisk } from "../../types/weather";

const DISMISS_KEY = "frost-alert-dismissed";
const DISMISS_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

interface FrostAlertBannerProps {
  frostRisk: FrostRisk;
  tempF: number;
  solarWm2: number;
  windSpeedMph: number;
}

export function FrostAlertBanner({ frostRisk, tempF, solarWm2, windSpeedMph }: FrostAlertBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(DISMISS_KEY);
    if (stored) {
      const { until, risk } = JSON.parse(stored);
      if (Date.now() < until && risk === frostRisk) {
        setDismissed(true);
      }
    }
  }, [frostRisk]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(
      DISMISS_KEY,
      JSON.stringify({ until: Date.now() + DISMISS_TTL_MS, risk: frostRisk })
    );
  };

  if (frostRisk === "none" || dismissed) return null;

  const cfg = FROST_RISK_CONFIG[frostRisk];
  const isNight = solarWm2 < 5;
  const isCalm = windSpeedMph < 3;

  return (
    <div className={`flex items-start gap-3 rounded-xl border p-4 ${cfg.bgColor} ${cfg.borderColor}`}>
      {frostRisk === "imminent" ? (
        <Snowflake className={`h-5 w-5 shrink-0 mt-0.5 ${cfg.color} animate-bounce`} />
      ) : (
        <AlertTriangle className={`h-5 w-5 shrink-0 mt-0.5 ${cfg.color}`} />
      )}
      <div className="flex-1">
        <p className={`font-semibold ${cfg.color}`}>{cfg.label}</p>
        <p className="text-sm text-gray-300 mt-0.5">
          {tempF.toFixed(1)}°F
          {isNight && isCalm && " · Clear sky + calm wind (radiative frost risk)"}
          {" · "}{cfg.description}
        </p>
      </div>
      <button
        onClick={handleDismiss}
        className="text-gray-500 hover:text-gray-300 transition-colors"
        aria-label="Dismiss for 4 hours"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
