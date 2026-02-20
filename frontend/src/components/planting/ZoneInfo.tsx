import { useZoneInfo } from "../../hooks/usePlantingCalendar";
import { formatDate } from "../../lib/dateUtils";
import { AlertCircle, CheckCircle } from "lucide-react";
import { SPRING_FROST_MMDD, FALL_FROST_MMDD } from "../../constants/zone";

export function ZoneInfo() {
  const { data } = useZoneInfo();

  const currentYear = new Date().getFullYear();
  const springFrost = `${currentYear}-${SPRING_FROST_MMDD}`;
  const fallFrost = `${currentYear}-${FALL_FROST_MMDD}`;

  return (
    <div className="card flex flex-wrap items-center gap-4 text-sm">
      <div>
        <span className="text-gray-500">USDA Zone: </span>
        <span className="font-semibold text-green-400">{data?.zone ?? "6b-7a"}</span>
      </div>
      <div>
        <span className="text-gray-500">Last Spring Frost: </span>
        <span className="text-sky-300">~{formatDate(springFrost, "MMM d")}</span>
      </div>
      <div>
        <span className="text-gray-500">First Fall Frost: </span>
        <span className="text-orange-300">~{formatDate(fallFrost, "MMM d")}</span>
      </div>
      {data?.annualCheckDue && (
        <div className="flex items-center gap-1 text-yellow-400 text-xs">
          <AlertCircle className="h-3.5 w-3.5" />
          Annual USDA zone check due
        </div>
      )}
      {data && !data.annualCheckDue && (
        <div className="flex items-center gap-1 text-green-500 text-xs">
          <CheckCircle className="h-3.5 w-3.5" />
          Zone verified {formatDate(data.lastChecked)}
        </div>
      )}
    </div>
  );
}
