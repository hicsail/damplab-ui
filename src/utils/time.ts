export function isRecentIso(iso: string, windowMs: number, nowMs: number = Date.now()): boolean {
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return false;
  return nowMs - t < windowMs;
}

