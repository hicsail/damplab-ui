import { format } from 'date-fns';

/**
 * Date handling for the SOW document.
 *
 * A SOW period date is a *calendar day*, not an instant, and it is stored as
 * that day's UTC midnight (`2026-08-20T00:00:00.000Z`). The backend reads it the
 * same way — `formatDate` passes `timeZone: 'UTC'` and `periodEndDate` walks the
 * day with `setUTCDate` (damplab-backend/src/sow/sow-field-calculator.ts).
 *
 * A date picker, by contrast, works in local time. Crossing between the two by
 * *instant* — `new Date(storedIso)` — lands on the previous day for every reader
 * west of Greenwich. So cross by calendar fields instead, in both directions.
 *
 * Not to be confused with src/utils/localDate.ts, which anchors date-only values
 * at local *noon*. That is a different convention for a different set of dates;
 * do not mix the two.
 */

/**
 * The lab's timezone. Every *instant* in the SOW — when a version was saved,
 * when the customer signed — reads in DAMP Lab local time, so the document says
 * the same thing to a reader in Boston and one in Auckland.
 *
 * Deliberately not applied to period dates: those are calendar days, not
 * instants, and re-reading their UTC anchor in ET would slip them a day.
 */
export const LAB_TIME_ZONE = 'America/New_York';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * An instant, in the lab's timezone — "August 20, 2026" / "Aug 20, 2026" /
 * "Aug 20, 2026, 8:30 PM ET". For calendar days (period starts) use formatSOWDate instead.
 */
export function formatSOWInstant(value: string | Date | null | undefined, style: 'long' | 'short' | 'compact' | 'datetime' = 'long'): string {
  if (value == null || value === '') return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  if (style === 'datetime') {
    const clock = d.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: LAB_TIME_ZONE });
    return `${clock} ET`;
  }
  const month = style === 'long' ? 'long' : 'short';
  return d.toLocaleDateString('en-US', { month, day: 'numeric', ...(style === 'compact' ? {} : { year: 'numeric' }), timeZone: LAB_TIME_ZONE });
}

/** A stored SOW date, as a Date whose *local* calendar day is the stored day. */
export function sowDateToPickerValue(value: string | Date | null | undefined): Date | null {
  if (value == null || value === '') return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** The inverse: whatever local calendar day the picker handed back, as UTC midnight. */
export function pickerValueToSowDate(d: Date): string {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())).toISOString();
}

/** Today's local calendar day, in storage form. */
export function todaySowDate(): string {
  return pickerValueToSowDate(new Date());
}

/**
 * Format a date for display in the SOW.
 * Accepts ISO strings (e.g. from API), YYYY-MM-DD, or Date objects.
 * Returns e.g. "January 27, 2026" or the original string if unparseable.
 */
export function formatSOWDate(value: string | Date | null | undefined): string {
  const d = sowDateToPickerValue(value);
  if (!d) return typeof value === 'string' ? value.slice(0, 10) : '';
  return format(d, 'MMMM d, yyyy');
}

/**
 * Short form for signatures/footer, e.g. "Jan 27, 2026".
 */
export function formatSOWDateShort(value: string | Date | null | undefined): string {
  const d = sowDateToPickerValue(value);
  if (!d) return typeof value === 'string' ? value.slice(0, 10) : '';
  return format(d, 'MMM d, yyyy');
}

/**
 * The overall period of performance, in days — the span from the earliest start
 * date to the latest end date, inclusive of both.
 *
 * Mirrors `periodOfPerformanceSpan` in damplab-backend/src/sow/sow-field-calculator.ts,
 * which is what the Period of Performance section actually says ("estimated to be
 * N days"). Deliberately not the sum of each period's duration: that overcounts
 * gapped periods and undercounts overlapping ones, so it is a different number
 * from the one the document promises.
 *
 * Walks UTC calendar fields, matching how a period date is stored (see the note
 * at the top of this file) — reading the dates as instants would slip a day for
 * every reader west of Greenwich.
 */
export function periodOfPerformanceDays(periods: { startDate: string | Date; durationDays: number }[] | null | undefined): number {
  const list = (periods ?? []).filter((p) => p && p.startDate);
  if (list.length === 0) return 0;

  const bounds = list.map((p) => {
    const d = p.startDate instanceof Date ? p.startDate : new Date(p.startDate);
    const start = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    // A 1-day period starts and ends the same day, so advance by duration - 1.
    const duration = Number.isFinite(Number(p.durationDays)) ? Number(p.durationDays) : 0;
    const end = start + Math.max(0, duration - 1) * MS_PER_DAY;
    return { start, end };
  });

  const start = Math.min(...bounds.map((b) => b.start));
  const end = Math.max(...bounds.map((b) => b.end));
  return Math.round((end - start) / MS_PER_DAY) + 1;
}

/** A stored calendar day as its UTC-midnight milliseconds — by calendar fields, never by local instant. */
function utcDayMs(value: string | Date): number {
  const d = value instanceof Date ? value : new Date(value);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * The day count the period editor shows. Never below one: a period always
 * covers at least its start day, and a legacy stored 0 means a single day — the
 * generated prose already reads anything ≤ 1 as "a single day".
 */
export function periodDays(durationDays: number | null | undefined): number {
  const n = Math.floor(Number(durationDays));
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/**
 * A period's last day, inclusive: start + durationDays − 1, in storage form.
 * The editor's End picker is a view over the stored day count — the backend
 * keeps `durationDays` and computes the same end in `periodEndDate`.
 */
export function periodEndSowDate(startDate: string | Date, durationDays: number): string {
  return new Date(utcDayMs(startDate) + (periodDays(durationDays) - 1) * MS_PER_DAY).toISOString();
}

/** Inclusive day count from start to end: the same day is 1. Zero or less means end is before start. */
export function durationFromDates(start: string | Date, end: string | Date): number {
  return Math.round((utcDayMs(end) - utcDayMs(start)) / MS_PER_DAY) + 1;
}

/** What picking an End writes, or null when that End is before Start — refused, the period stays as it was. */
export function periodEndPatch(period: { startDate: string }, end: string): { durationDays: number } | null {
  const durationDays = durationFromDates(period.startDate, end);
  return durationDays >= 1 ? { durationDays } : null;
}

/**
 * What picking a Start writes. The End date the staff member sees stays put
 * while the new Start is on or before it; past it, End follows Start and the
 * period becomes one day.
 */
export function periodStartPatch(period: { startDate: string; durationDays: number }, start: string): { startDate: string; durationDays: number } {
  const end = periodEndSowDate(period.startDate, period.durationDays);
  const durationDays = durationFromDates(start, end);
  return { startDate: start, durationDays: durationDays >= 1 ? durationDays : 1 };
}

/** What the period row's Start picker reports: each change, each accept (and where it came from), and losing focus. */
export type PeriodStartEvent = { type: 'change'; value: Date | null } | { type: 'accept'; value: Date | null; source: 'field' | 'view' | 'unknown' } | { type: 'blur' };

/**
 * One step of editing a period's Start (FINDINGS F3).
 *
 * MUI X reports every valid intermediate date while a date is typed section
 * by section. Applying each one would let an intermediate Start later than End
 * drag End along (behaviour 5), and the End staff set would be lost. So typing
 * is held as a draft and committed when the field loses focus. A calendar pick
 * commits at once, through `onAccept` from the view. `onAccept` from the field
 * is ignored, because MUI X 8.29.3 fires it for each typed date too.
 *
 * `draft` is undefined when no edit is in progress. The row shows the draft
 * while there is one, and otherwise the stored Start.
 */
export function periodStartEdit(
  period: { startDate: string; durationDays: number },
  draft: Date | null | undefined,
  event: PeriodStartEvent
): { draft: Date | null | undefined; patch: { startDate: string; durationDays: number } | null } {
  const commit = (value: Date | null | undefined): { draft: undefined; patch: { startDate: string; durationDays: number } | null } => {
    // Unfinished, cleared or unchanged: drop the draft, and the field shows the stored Start again.
    if (!value || Number.isNaN(value.getTime())) return { draft: undefined, patch: null };
    const start = pickerValueToSowDate(value);
    if (durationFromDates(period.startDate, start) === 1) return { draft: undefined, patch: null };
    return { draft: undefined, patch: periodStartPatch(period, start) };
  };
  switch (event.type) {
    case 'change':
      return { draft: event.value, patch: null };
    case 'accept':
      return event.source === 'view' ? commit(event.value) : { draft, patch: null };
    case 'blur':
      return commit(draft);
  }
}
