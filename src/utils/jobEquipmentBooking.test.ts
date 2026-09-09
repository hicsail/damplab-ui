import { describe, expect, it } from 'vitest';
import { blockedMessage, bookingsForWeek, bookedHours, defaultSlotFor, formatBookingWindow, isOutsideWindow, LOCKED_MESSAGES, spansForDays, spansForWeek } from './jobEquipmentBooking';

describe('formatBookingWindow', () => {
  it('prints a closed window as a range', () => {
    expect(formatBookingWindow({ start: '2026-01-01', end: '2026-01-29', openEnd: false })).toBe('Jan 1 → Jan 29');
  });

  it('prints an open-ended window from its start', () => {
    expect(formatBookingWindow({ start: '2026-01-01', end: '2026-01-29', openEnd: true })).toBe('from Jan 1, open-ended');
  });

  it('says so when there is no window at all', () => {
    expect(formatBookingWindow({})).toBe('No estimated window');
    expect(formatBookingWindow(null)).toBe('No estimated window');
  });

  it('never shifts the date by a timezone', () => {
    // Parsed from the string's own parts, not through Date, so this is stable
    // wherever it runs.
    expect(formatBookingWindow({ start: '2026-03-01', end: '2026-03-01' })).toBe('Mar 1 → Mar 1');
  });
});

describe('isOutsideWindow', () => {
  const window = { start: '2026-01-05', end: '2026-01-09', openEnd: false };
  const at = (iso: string): Date => new Date(iso);

  it('is false inside the window, including all of the end date', () => {
    expect(isOutsideWindow(window, at('2026-01-06T10:00:00Z'), at('2026-01-06T12:00:00Z'))).toBe(false);
    expect(isOutsideWindow(window, at('2026-01-09T22:00:00Z'), at('2026-01-09T23:30:00Z'))).toBe(false);
  });

  it('is true before the start and after the day following the end', () => {
    expect(isOutsideWindow(window, at('2026-01-04T23:00:00Z'), at('2026-01-05T01:00:00Z'))).toBe(true);
    expect(isOutsideWindow(window, at('2026-01-10T09:00:00Z'), at('2026-01-10T10:00:00Z'))).toBe(true);
  });

  it('ignores the end when the window is open-ended, and is never outside no window', () => {
    expect(isOutsideWindow({ ...window, openEnd: true }, at('2026-06-01T09:00:00Z'), at('2026-06-01T10:00:00Z'))).toBe(false);
    expect(isOutsideWindow({}, at('1999-01-01T00:00:00Z'), at('1999-01-01T01:00:00Z'))).toBe(false);
  });
});

describe('locked-state copy', () => {
  it('matches the sentences the design pinned', () => {
    expect(LOCKED_MESSAGES.SOW_NOT_SIGNED).toBe('Booking opens once the Statement of Work is signed by both parties.');
    expect(LOCKED_MESSAGES.NOT_ELIGIBLE).toBe('Ask the lab for equipment-user access to book.');
    expect(blockedMessage('unpaid invoice')).toBe('Booking on this job is paused by the lab: unpaid invoice.');
  });

  it('still reads as a sentence when the lab gave no reason', () => {
    expect(blockedMessage(undefined)).toBe('Booking on this job is paused by the lab.');
  });
});

describe('bookingsForWeek', () => {
  it('buckets by local calendar day and sorts within a day', () => {
    const weekStart = new Date(2026, 0, 5); // Monday, local
    const later = { startTime: new Date(2026, 0, 6, 14).toISOString() };
    const earlier = { startTime: new Date(2026, 0, 6, 9).toISOString() };
    const outside = { startTime: new Date(2026, 0, 20, 9).toISOString() };
    const map = bookingsForWeek([later, earlier, outside], weekStart);
    expect(map.get('2026-01-06')).toEqual([earlier, later]);
    expect(map.has('2026-01-20')).toBe(false);
  });
});

describe('spansForWeek', () => {
  const week = new Date(2026, 0, 5); // Monday 5 Jan 2026, local time
  const range = (r: { s: string; e: string }) => ({ start: r.s, end: r.e });

  it('clips a multi-day range into one segment per day it covers', () => {
    const map = spansForWeek([{ s: '2026-01-06T22:00:00', e: '2026-01-08T03:00:00' }], week, range);
    expect([...map.keys()].sort()).toEqual(['2026-01-06', '2026-01-07', '2026-01-08']);
    const tue = map.get('2026-01-06')![0];
    expect(tue.start).toEqual(new Date(2026, 0, 6, 22));
    expect(tue.end).toEqual(new Date(2026, 0, 7));
    expect(tue.continuesBefore).toBe(false);
    expect(tue.continuesAfter).toBe(true);
    const wed = map.get('2026-01-07')![0];
    expect(wed.start).toEqual(new Date(2026, 0, 7));
    expect(wed.continuesBefore).toBe(true);
    expect(wed.continuesAfter).toBe(true);
    const thu = map.get('2026-01-08')![0];
    expect(thu.end).toEqual(new Date(2026, 0, 8, 3));
    expect(thu.continuesAfter).toBe(false);
  });

  it('drops ranges outside the week and ranges without both bounds', () => {
    const map = spansForWeek([{ s: '2025-12-30T10:00:00', e: '2025-12-30T11:00:00' }, { s: '', e: '2026-01-06T11:00:00' }], week, range);
    expect(map.size).toBe(0);
  });

  it('sorts a day’s segments by start', () => {
    const map = spansForWeek(
      [
        { s: '2026-01-06T14:00:00', e: '2026-01-06T15:00:00' },
        { s: '2026-01-06T09:00:00', e: '2026-01-06T10:00:00' }
      ],
      week,
      range
    );
    expect(map.get('2026-01-06')!.map((x) => x.start.getHours())).toEqual([9, 14]);
  });
});

describe('defaultSlotFor', () => {
  it('starts at 9:00 on a future day and lasts an hour', () => {
    const { start, end } = defaultSlotFor(new Date(2030, 5, 10), new Date(2026, 0, 1, 12));
    expect(start).toEqual(new Date(2030, 5, 10, 9));
    expect(end).toEqual(new Date(2030, 5, 10, 10));
  });

  it('starts at the next full hour when the day is today and 9:00 has passed', () => {
    const now = new Date(2026, 0, 6, 13, 20);
    const { start, end } = defaultSlotFor(new Date(2026, 0, 6), now);
    expect(start).toEqual(new Date(2026, 0, 6, 14));
    expect(end).toEqual(new Date(2026, 0, 6, 15));
  });
});

describe('spansForDays', () => {
  it('covers a run longer than a week', () => {
    const map = spansForDays([{ s: '2026-01-20T10:00:00', e: '2026-01-20T11:00:00' }], new Date(2026, 0, 5), 42, (r) => ({ start: r.s, end: r.e }));
    expect([...map.keys()]).toEqual(['2026-01-20']);
  });
});

describe('bookedHours', () => {
  it('sums live timed bookings and ignores cancelled or quantity ones', () => {
    expect(
      bookedHours([
        { kind: 'TIMED', status: 'RESERVED', startTime: '2026-01-06T10:00:00Z', endTime: '2026-01-06T12:30:00Z' },
        { kind: 'TIMED', status: 'CANCELLED', startTime: '2026-01-06T10:00:00Z', endTime: '2026-01-06T20:00:00Z' },
        { kind: 'QUANTITY', status: 'RESERVED', startTime: null, endTime: null }
      ])
    ).toBe(2.5);
  });
});
