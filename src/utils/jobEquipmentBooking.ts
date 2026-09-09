import { addDays, format, startOfDay } from 'date-fns';

/** The estimated window as the server sends it: two date-only strings and a flag. */
export interface BookingWindow {
  start?: string | null;
  end?: string | null;
  openEnd?: boolean | null;
}

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_MS = 86_400_000;

/**
 * `YYYY-MM-DD` as UTC midnight in ms. Twin of `dateOnlyToUtcMs` in
 * damplab-backend/src/pricing/service-pricing.util.ts — UTC on both sides so the
 * amber "outside the estimated window" warning the browser draws and the one the
 * server would compute never disagree by a day.
 */
const dateOnlyToUtcMs = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined;
  const m = DATE_ONLY_RE.exec(value.trim());
  if (!m) return undefined;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isFinite(ms) ? ms : undefined;
};

/**
 * "Jan 1" from the string's own digits. Deliberately not `format(new Date(s))`:
 * `new Date('2026-01-01')` is UTC midnight, which in any negative-offset timezone
 * renders as Dec 31.
 */
const formatDateOnly = (value: unknown): string | undefined => {
  if (typeof value !== 'string') return undefined;
  const m = DATE_ONLY_RE.exec(value.trim());
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}` : undefined;
};

export function formatBookingWindow(window: BookingWindow | null | undefined): string {
  const start = formatDateOnly(window?.start);
  const end = formatDateOnly(window?.end);
  if (!start) return 'No estimated window';
  if (window?.openEnd) return `from ${start}, open-ended`;
  if (!end) return `from ${start}`;
  return `${start} → ${end}`;
}

/**
 * Whether a slot falls outside the operation's estimate. The end date is
 * INCLUSIVE, so the window closes at midnight following it. Twin of
 * `isOutsideWindow` in damplab-backend/src/booking/equipment-window.ts.
 *
 * This only drives a warning — the server allows the save either way, so a
 * reschedule the estimate did not anticipate is visible rather than blocked.
 */
export function isOutsideWindow(window: BookingWindow | null | undefined, start: Date, end: Date): boolean {
  const startMs = dateOnlyToUtcMs(window?.start);
  if (startMs !== undefined && start.getTime() < startMs) return true;
  if (window?.openEnd) return false;
  const endMs = dateOnlyToUtcMs(window?.end);
  if (endMs !== undefined && end.getTime() > endMs + DAY_MS) return true;
  return false;
}

/** The one sentence a locked panel shows instead of the grid. */
export const LOCKED_MESSAGES = {
  SOW_NOT_SIGNED: 'Booking opens once the Statement of Work is signed by both parties.',
  NOT_ELIGIBLE: 'Ask the lab for equipment-user access to book.'
} as const;

export function blockedMessage(reason?: string | null): string {
  const trimmed = reason?.trim();
  return trimmed ? `Booking on this job is paused by the lab: ${trimmed}.` : 'Booking on this job is paused by the lab.';
}

/**
 * This job's bookings bucketed by `yyyy-MM-dd`, for the seven columns of the week
 * grid. Local calendar days, because the grid's column headings are local.
 */
export function bookingsForWeek<T extends { startTime?: string | null }>(bookings: T[], weekStart: Date): Map<string, T[]> {
  const from = startOfDay(weekStart).getTime();
  const to = addDays(startOfDay(weekStart), 7).getTime();
  const map = new Map<string, T[]>();
  for (const booking of bookings) {
    if (!booking.startTime) continue;
    const at = new Date(booking.startTime);
    const ms = at.getTime();
    if (!Number.isFinite(ms) || ms < from || ms >= to) continue;
    const key = format(at, 'yyyy-MM-dd');
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(booking);
  }
  for (const list of map.values()) {
    list.sort((a, b) => new Date(a.startTime as string).getTime() - new Date(b.startTime as string).getTime());
  }
  return map;
}

/** One piece of a time range, clipped to a single calendar day. */
export interface DaySpan<T> {
  item: T;
  start: Date;
  end: Date;
  /** The range began on an earlier day. */
  continuesBefore: boolean;
  /** The range runs on past this day. */
  continuesAfter: boolean;
}

/**
 * Bucket time ranges into the seven days of a week, clipping each to the days it
 * covers — unlike `bookingsForWeek`, a range that spans several days appears on
 * every one of them. That is what makes a multi-day hold visible: a grid that
 * pinned it to its start day alone would show a free-looking day the server
 * refuses to book.
 */
export function spansForWeek<T>(
  items: T[],
  weekStart: Date,
  range: (item: T) => { start?: string | Date | null; end?: string | Date | null }
): Map<string, DaySpan<T>[]> {
  return spansForDays(items, weekStart, 7, range);
}

/** `spansForWeek` over any run of days — a month grid is six weeks of them. */
export function spansForDays<T>(
  items: T[],
  firstDay: Date,
  dayCount: number,
  range: (item: T) => { start?: string | Date | null; end?: string | Date | null }
): Map<string, DaySpan<T>[]> {
  const map = new Map<string, DaySpan<T>[]>();
  const first = startOfDay(firstDay);
  for (const item of items) {
    const r = range(item);
    if (!r.start || !r.end) continue;
    const s = new Date(r.start).getTime();
    const e = new Date(r.end).getTime();
    if (!Number.isFinite(s) || !Number.isFinite(e) || e <= s) continue;
    for (let i = 0; i < dayCount; i++) {
      const dayStart = addDays(first, i);
      const dayEnd = addDays(first, i + 1);
      const from = Math.max(s, dayStart.getTime());
      const to = Math.min(e, dayEnd.getTime());
      if (to <= from) continue;
      const key = format(dayStart, 'yyyy-MM-dd');
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push({ item, start: new Date(from), end: new Date(to), continuesBefore: s < dayStart.getTime(), continuesAfter: e > dayEnd.getTime() });
    }
  }
  for (const list of map.values()) list.sort((a, b) => a.start.getTime() - b.start.getTime());
  return map;
}

/**
 * The slot a click on a day card proposes: nine o'clock for a future day, the
 * next full hour when the day is today and nine has passed, one hour long.
 */
export function defaultSlotFor(day: Date, now: Date = new Date()): { start: Date; end: Date } {
  const nine = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 9);
  let start = nine;
  if (startOfDay(day).getTime() === startOfDay(now).getTime() && now.getTime() >= nine.getTime()) {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours() + 1);
  }
  return { start, end: new Date(start.getTime() + 3_600_000) };
}

/** Hours reserved across a job's live timed bookings — what the customer card reports. */
export function bookedHours(bookings: Array<{ kind?: string | null; status?: string | null; startTime?: string | null; endTime?: string | null }>): number {
  let ms = 0;
  for (const b of bookings) {
    if (b.status === 'CANCELLED' || !b.startTime || !b.endTime) continue;
    if (b.kind && b.kind !== 'TIMED') continue;
    const span = new Date(b.endTime).getTime() - new Date(b.startTime).getTime();
    if (Number.isFinite(span) && span > 0) ms += span;
  }
  return Math.round((ms / 3_600_000) * 100) / 100;
}
