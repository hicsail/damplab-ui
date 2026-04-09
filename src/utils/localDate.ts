import { parse } from 'date-fns';

/**
 * Utilities for working with "date-only" strings (`YYYY-MM-DD`) as *local* calendar dates.
 *
 * Why:
 * - JavaScript's `new Date('YYYY-MM-DD')` is treated as UTC midnight in many runtimes.
 * - Converting that to local time (America/New_York) can display as the previous day.
 *
 * Approach:
 * - Treat date-only values as a local calendar date for UI.
 * - When persisting to an ISO timestamp, anchor at local noon to avoid DST/offset edge cases.
 */

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function coerceDateOnlyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!DATE_ONLY_RE.test(v)) return null;
  return v;
}

export function dateOnlyStringToLocalDate(value: string): Date {
  // Parse as local calendar date (midnight local), not UTC.
  return parse(value, 'yyyy-MM-dd', new Date());
}

export function dateOnlyStringToStableISOString(value: string): string {
  // Persist date-only as an ISO timestamp anchored at local noon.
  // Noon avoids DST/offset crossings that can shift the calendar day when round-tripping.
  const m = value.match(DATE_ONLY_RE);
  if (!m) return new Date(value).toISOString();
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Date(y, mo - 1, d, 12, 0, 0, 0).toISOString();
}

export function isoToDateOnlyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const v = value.trim();
  if (!v) return null;

  // If it's already date-only, keep it.
  const asDateOnly = coerceDateOnlyString(v);
  if (asDateOnly) return asDateOnly;

  // If it's ISO-like, prefer the YYYY-MM-DD prefix to avoid timezone shifts.
  if (v.length >= 10 && DATE_ONLY_RE.test(v.slice(0, 10))) return v.slice(0, 10);

  return null;
}

