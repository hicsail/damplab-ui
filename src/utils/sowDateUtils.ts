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
