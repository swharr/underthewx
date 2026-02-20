export function log(level: "info" | "warn" | "error", msg: string, data?: unknown): void {
  const entry = {
    level,
    timestamp: new Date().toISOString(),
    msg,
    ...(data !== undefined ? { data } : {}),
  };
  if (level === "error") {
    console.error(JSON.stringify(entry));
  } else if (level === "warn") {
    console.warn(JSON.stringify(entry));
  } else {
    console.log(JSON.stringify(entry));
  }
}
