const MIN_INTERVAL_MS = 15_000;
const lastSync = new Map<string, number>();

/** Simple per-isolate throttle so many visitors don't spam the provider. */
export function shouldSync(key: string): boolean {
  const now = Date.now();
  const prev = lastSync.get(key) ?? 0;
  if (now - prev < MIN_INTERVAL_MS) return false;
  lastSync.set(key, now);
  return true;
}
