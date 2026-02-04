import { format, parseISO, isValid } from 'date-fns';

function toDate(value: string | Date): Date {
  if (value instanceof Date) return value;
  try {
    return value.includes('T') ? parseISO(value) : new Date(value);
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
