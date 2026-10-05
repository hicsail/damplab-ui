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

/**
 * The line under an operation the caller cannot book. Booking follows job
 * membership, so the refusal speaks of the job — never of a per-operation list.
 */
export function operationNotBookableMessage(schedulableCount: number): string {
  return schedulableCount === 0 ? 'Nothing on this operation is booked by the hour.' : 'Only people on this job can book this operation.';
}

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

type BookingStatusLike = { status?: string | null; usageConfirmed?: boolean | null; history?: Array<{ action?: string | null; reason?: string | null }> | null };

/** A decline is stored as a cancellation; the history's last entry says which it was. */
export function declinedReason(b: BookingStatusLike | null | undefined): string | null {
  const last = b?.history?.length ? b.history[b.history.length - 1] : null;
  return b?.status === 'CANCELLED' && last?.action === 'DECLINED' ? last.reason?.trim() || '' : null;
}

/**
 * The word a booking's status chip shows. TENTATIVE is a client's request the lab
 * has not answered yet: it holds the slot but is not a confirmed booking.
 */
export function bookingStatusLabel(b: BookingStatusLike): string {
  if (b.status === 'CANCELLED') return declinedReason(b) !== null ? 'Declined' : 'Cancelled';
  if (b.usageConfirmed) return 'Confirmed';
  switch (b.status) {
    case 'TENTATIVE':
      return 'Awaiting approval';
    case 'RESERVED':
      return 'Reserved';
    case 'IN_USE':
      return 'In use';
    case 'COMPLETED':
      return 'Completed';
    default:
      return String(b.status ?? '');
  }
}

export function bookingStatusColor(b: BookingStatusLike): 'default' | 'warning' | 'success' | 'info' | 'error' {
  if (b.status === 'CANCELLED') return declinedReason(b) !== null ? 'error' : 'default';
  if (b.usageConfirmed || b.status === 'COMPLETED') return 'success';
  if (b.status === 'TENTATIVE') return 'info';
  return 'warning';
}

/** Live bookings still waiting on the lab. */
export const awaitingApproval = <T extends { status?: string | null }>(bookings: T[]): T[] => bookings.filter((b) => b.status === 'TENTATIVE');

/**
 * Why recording usage now is premature, or null when the booked time is over.
 * Staff confirm the hours actually used, so a booking still ahead of them (or
 * still running) normally has nothing to confirm yet. A warning, not a block:
 * the lab may know the outcome early.
 */
export function usageTimingWarning(
  b: { kind?: string | null; startTime?: string | Date | null; endTime?: string | Date | null; usedOn?: string | Date | null } | null | undefined,
  now: Date = new Date()
): string | null {
  if (!b) return null;
  const fmt = (d: Date): string => d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  if (b.kind === 'QUANTITY') {
    const used = b.usedOn ? new Date(b.usedOn) : null;
    return used && used.getTime() > now.getTime() ? `This is booked for ${fmt(used)}, which has not happened yet. Usage is normally confirmed afterwards.` : null;
  }
  const start = b.startTime ? new Date(b.startTime) : null;
  const end = b.endTime ? new Date(b.endTime) : null;
  if (start && start.getTime() > now.getTime()) {
    return `This booking has not started yet (it starts ${fmt(start)}). Hours are normally confirmed only once the time has been used.`;
  }
  if (end && end.getTime() > now.getTime()) {
    return `This booking is still running (it ends ${fmt(end)}). Hours are normally confirmed only once the time has been used.`;
  }
  return null;
}

/** A timed booking whose end has passed. Server twin: BookingService.cancel refuses these for everyone. */
export function isBookingOver(b: { kind?: string | null; endTime?: string | Date | null } | null | undefined, now: Date = new Date()): boolean {
  if (!b || (b.kind && b.kind !== 'TIMED') || !b.endTime) return false;
  return new Date(b.endTime).getTime() <= now.getTime();
}

/** Hours a timed booking reserves, to two decimals. */
export function bookedSlotHours(b: { startTime?: string | Date | null; endTime?: string | Date | null }): number | null {
  if (!b.startTime || !b.endTime) return null;
  const hours = (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 3_600_000;
  return Number.isFinite(hours) ? Math.round(hours * 100) / 100 : null;
}

/**
 * The chip on a booking whose usage staff have recorded: "Confirmed · 2 hrs", or,
 * when that differs from the time booked, "Confirmed · 1.5 hrs / 2 hrs (discrepant)"
 * — recorded first, booked second.
 */
export function confirmedUsageLabel(b: { actualHours?: number | null; startTime?: string | Date | null; endTime?: string | Date | null }): { label: string; discrepant: boolean } {
  if (b.actualHours == null) return { label: 'Confirmed', discrepant: false };
  const booked = bookedSlotHours(b);
  const actual = Math.round(Number(b.actualHours) * 100) / 100;
  if (booked != null && Math.abs(actual - booked) >= 0.01) return { label: `Confirmed · ${actual} hrs / ${booked} hrs (discrepant)`, discrepant: true };
  return { label: `Confirmed · ${actual} hrs`, discrepant: false };
}

export interface BookingHistoryLine {
  at?: string | Date | null;
  action?: string | null;
  bySub?: string | null;
  byName?: string | null;
  reason?: string | null;
  actualHours?: number | null;
  actualQuantity?: number | null;
  [key: string]: unknown;
}

/**
 * A booking's history as the job page shows it. Usage confirmed before the trail
 * recorded it has only the booking's own `usageConfirmedAt/By`, so that becomes
 * the line it would have written.
 */
export function bookingHistoryLines(b: {
  history?: BookingHistoryLine[] | null;
  usageConfirmed?: boolean | null;
  usageConfirmedAt?: string | Date | null;
  usageConfirmedBy?: string | null;
  actualHours?: number | null;
  actualQuantity?: number | null;
}): BookingHistoryLine[] {
  const lines = [...(b.history ?? [])];
  if (b.usageConfirmed && !lines.some((h) => h.action === 'USAGE_CONFIRMED')) {
    lines.push({ at: b.usageConfirmedAt ?? null, action: 'USAGE_CONFIRMED', byName: b.usageConfirmedBy ?? null, actualHours: b.actualHours ?? null, actualQuantity: b.actualQuantity ?? null });
  }
  return lines;
}

/** The latest approval, for the approved marker's tooltip; null when never approved. */
export const lastApproval = (b: { history?: BookingHistoryLine[] | null }): BookingHistoryLine | null =>
  [...(b.history ?? [])].reverse().find((h) => h.action === 'APPROVED') ?? null;
