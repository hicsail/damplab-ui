import { format, parseISO, isValid } from 'date-fns';

function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  try {
    // If the modal/API provides a date-only string (YYYY-MM-DD), interpret it as a
    // *local* calendar date (midnight local time). This avoids timezone shifts
    // where UTC midnight renders as the previous day locally.
    const dateOnly = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (dateOnly) {
      const y = Number(dateOnly[1]);
      const m = Number(dateOnly[2]);
      const d = Number(dateOnly[3]);
      return new Date(y, m - 1, d);
    }

    // IMPORTANT:
    // - ISO strings with a time ("...T...") should be parsed as ISO.
    // - Date-only strings ("YYYY-MM-DD") should also be parsed with parseISO, NOT new Date(value).
    //   JS Date parses "YYYY-MM-DD" as UTC midnight, which can render as the *previous day* in local time.
    return parseISO(value);
  } catch {
    return new Date(value);
  }
}

/**
 * Format a date for display in the SOW PDF.
 * Accepts ISO strings (e.g. from API), YYYY-MM-DD, or Date objects.
 * Returns e.g. "January 27, 2026" or the original string if unparseable.
 */
export function formatSOWDate(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '';
  const d = toDate(value as string | Date);
  if (!isValid(d)) return typeof value === 'string' ? value.slice(0, 10) : '';
  return format(d, 'MMMM d, yyyy');
}

/**
 * Short form for signatures/footer, e.g. "Jan 27, 2026".
 */
export function formatSOWDateShort(value: string | Date | null | undefined): string {
  if (value == null || value === '') return '';
  const d = toDate(value as string | Date);
  if (!isValid(d)) return typeof value === 'string' ? value.slice(0, 10) : '';
  return format(d, 'MMM d, yyyy');
}
