import { useEffect, useState } from "react";
import { useWeatherData } from "../../hooks/useWeatherData";

const BUILD_COMMIT = __BUILD_COMMIT__;
const BUILD_BRANCH = __BUILD_BRANCH__;
const BUILD_TIME = __BUILD_TIME__;

/** Build ID: branch@commit · built YYYY-MM-DD HH:mm UTC */
function buildId(): string {
  const t = new Date(BUILD_TIME);
  const ymd = t.toISOString().slice(0, 10);
  const hm = t.toISOString().slice(11, 16);
  return `${BUILD_BRANCH}@${BUILD_COMMIT} · built ${ymd} ${hm} UTC`;
}

/** Format a Date as HH:mm:ss DD Mon YYYY (24h, Mountain Time) */
function fmtMountain(d: Date): string {
  // Mountain Standard Time is UTC-7; MDT is UTC-6.
  // We use Intl to handle DST automatically.
  return d.toLocaleString("en-US", {
    timeZone: "America/Denver",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Format a Date as HH:mm:ss UTC */
function fmtUtc(d: Date): string {
  const hms = d.toISOString().slice(11, 19);
  return `${hms} UTC`;
}

const DATA_SOURCES: { label: string; url: string }[] = [
  { label: "Tempest KUTLINDO34", url: "https://tempestwx.com/station/189439" },
  { label: "Wunderground KUTLINDO32", url: "https://www.wunderground.com/dashboard/pws/KUTLINDO32" },
  { label: "USU FGNET #16", url: "https://climate.usu.edu/mchd/quickview/quickview.php?network=FGNET&station=16&units=E" },
  { label: "USU FGNET #1302734", url: "https://climate.usu.edu/mchd/quickview/quickview.php?network=FGNET&station=1302734&units=E" },
];

export function Footer() {
  const { data } = useWeatherData();
  const [now, setNow] = useState(new Date());

  // Tick every second for the clock display
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1_000);
    return () => clearInterval(id);
  }, []);

  // Last data poll: derive from timestamp + dataAgeSeconds
  const lastPolled = data
    ? new Date(new Date(data.timestamp).getTime() + data.dataAgeSeconds * 1_000)
    : null;

  // The actual wall-clock time of the last collection run
  const lastCollected = data ? new Date(data.timestamp) : null;

  return (
    <footer className="border-t border-gray-800 bg-gray-950 text-gray-600 text-xs">
      {/* Row 1: data sources */}
      <div className="max-w-7xl mx-auto px-4 pt-3 pb-1 flex flex-wrap items-center gap-x-4 gap-y-1">
        <span className="text-gray-500 font-medium shrink-0">Data sources:</span>
        {DATA_SOURCES.map(({ label, url }) => (
          <a
            key={label}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-sky-400 transition-colors"
          >
            {label}
          </a>
        ))}
        <span className="hidden sm:inline text-gray-800">|</span>
        <a
          href="https://www.wpc.ncep.noaa.gov/lhid/lhid.shtml"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-sky-400 transition-colors"
        >
          USDA Zone 6b-7a
        </a>
        <a
          href="https://climate.usu.edu/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-sky-400 transition-colors"
        >
          USU Climate
        </a>
      </div>

      {/* Row 2: build + time */}
      <div className="max-w-7xl mx-auto px-4 pb-3 flex flex-wrap items-center justify-between gap-y-1">
        {/* Left: build ID */}
        <span className="font-mono text-gray-700">
          Build: {buildId()}
        </span>

        {/* Right: clocks + last poll */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {/* Live GMT clock */}
          <span>
            <span className="text-gray-500">UTC </span>
            {fmtUtc(now)}
          </span>

          {/* Live Mountain clock */}
          <span>
            <span className="text-gray-500">MT </span>
            {fmtMountain(now)}
          </span>

          {/* Last pipeline run */}
          {lastCollected && (
            <span>
              <span className="text-gray-500">Pipeline </span>
              {fmtMountain(lastCollected)}
            </span>
          )}

          {/* Data last polled (by the browser) */}
          {lastPolled && (
            <span className="text-gray-500">
              Data polled:{" "}
              <span className="text-gray-400">
                {lastPolled.toLocaleTimeString("en-US", {
                  timeZone: "America/Denver",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Row 3: site identity */}
      <div className="border-t border-gray-900 text-center py-2 text-gray-700">
        UnderTheWx · Lindon, UT · 40.333°N 111.728°W · 4,623 ft ASL · Zone 6b-7a
      </div>
    </footer>
  );
}
