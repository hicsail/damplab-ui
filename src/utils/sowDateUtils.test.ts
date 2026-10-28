import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sowDateToPickerValue, pickerValueToSowDate, todaySowDate, formatSOWDate, formatSOWInstant, periodOfPerformanceDays, periodDays, periodEndSowDate, durationFromDates, periodEndPatch, periodStartPatch, periodStartEdit, periodEndEdit, type PeriodStartEvent } from './sowDateUtils';

/**
 * A SOW period date is stored as UTC midnight but edited in a local-time date
 * picker, so every assertion here is about a calendar day surviving that
 * crossing. Written for a fixed TZ on purpose: asserted only in local terms,
 * these all pass vacuously on a UTC machine — which is what let the original
 * off-by-one ship.
 */

const ORIGINAL_TZ = process.env.TZ;
afterAll(() => {
  process.env.TZ = ORIGINAL_TZ;
});

// Node re-reads process.env.TZ per Date operation, so flipping it between
// suites is enough; no library or system-clock mocking needed.
describe.each([
  ['America/New_York', 'west of Greenwich'],
  ['Pacific/Auckland', 'east of Greenwich'],
  ['UTC', 'at Greenwich']
])('%s (%s)', (tz) => {
  beforeAll(() => {
    process.env.TZ = tz;
  });

  it('reads a stored UTC-midnight date as that same calendar day', () => {
    const d = sowDateToPickerValue('2026-08-20T00:00:00.000Z');
    expect(d).not.toBeNull();
    expect([d!.getFullYear(), d!.getMonth(), d!.getDate()]).toEqual([2026, 7, 20]);
  });

  it('writes the picker’s local calendar day back as UTC midnight', () => {
    expect(pickerValueToSowDate(new Date(2026, 7, 20))).toBe('2026-08-20T00:00:00.000Z');
  });

  it('round-trips a stored date unchanged', () => {
    const stored = '2026-08-20T00:00:00.000Z';
    expect(pickerValueToSowDate(sowDateToPickerValue(stored)!)).toBe(stored);
  });

  it('normalises a mid-day instant to that day’s UTC midnight', () => {
    // What "Add period" used to store: a wall-clock instant, which drifts to the
    // next or previous UTC day depending on the hour.
    expect(pickerValueToSowDate(new Date(2026, 7, 20, 23, 45))).toBe('2026-08-20T00:00:00.000Z');
  });

  it('formats the stored calendar day, not the local instant', () => {
    expect(formatSOWDate('2026-08-20T00:00:00.000Z')).toBe('August 20, 2026');
  });

  it('reads a date-only string as that day', () => {
    expect(formatSOWDate('2026-01-01')).toBe('January 1, 2026');
  });

  it('gives back today', () => {
    const now = new Date();
    expect(todaySowDate()).toBe(pickerValueToSowDate(now));
    expect(todaySowDate().slice(11)).toBe('00:00:00.000Z');
  });

  it('reads an instant in the lab’s timezone, whatever the viewer’s', () => {
    // 20:30 ET on Aug 19 is already Aug 20 in UTC. A SOW signed then was signed
    // on the 19th as far as the lab is concerned, and must say so everywhere.
    expect(formatSOWInstant('2026-08-20T00:30:00.000Z')).toBe('August 19, 2026');
    expect(formatSOWInstant('2026-08-20T00:30:00.000Z', 'short')).toBe('Aug 19, 2026');
    expect(formatSOWInstant('2026-08-20T00:30:00.000Z', 'compact')).toBe('Aug 19');
    // 00:30 UTC is 8:30 PM the previous day in ET (EDT). Staff versions are
    // distinguished by time-of-day, so the dropdown needs the clock, not just the date.
    expect(formatSOWInstant('2026-08-20T00:30:00.000Z', 'datetime')).toBe('Aug 19, 2026, 8:30 PM ET');
    // EST (UTC−5): 00:30 UTC is 7:30 PM the previous day.
    expect(formatSOWInstant('2026-01-20T00:30:00.000Z', 'datetime')).toBe('Jan 19, 2026, 7:30 PM ET');
  });

  it('does not confuse a calendar day with an instant', () => {
    // The same string means different things in the two roles: a period start
    // is the 20th; an instant at UTC midnight is still the 19th here.
    const stored = '2026-08-20T00:00:00.000Z';
    expect(formatSOWDate(stored)).toBe('August 20, 2026');
    expect(formatSOWInstant(stored)).toBe('August 19, 2026');
  });
});

describe('unparseable input', () => {
  it('returns null rather than an Invalid Date', () => {
    expect(sowDateToPickerValue(null)).toBeNull();
    expect(sowDateToPickerValue('')).toBeNull();
    expect(sowDateToPickerValue('not a date')).toBeNull();
  });

  it('falls back to the raw string when formatting', () => {
    expect(formatSOWDate('not a date')).toBe('not a date');
    expect(formatSOWDate(null)).toBe('');
  });
});


/**
 * Mirrors periodOfPerformanceSpan on the backend (sow-field-calculator.ts): the
 * calendar span the Period of Performance section actually promises, which is
 * not the sum of each period's duration. A single period cannot tell the two
 * apart — every case below therefore uses gapped or overlapping periods.
 */
describe('periodOfPerformanceDays', () => {
  it('spans from the earliest start to the latest end, gaps included', () => {
    // Aug 1–7, then Aug 20–24: 14 days of work, but a 24-day span.
    const periods = [
      { startDate: '2026-08-01T00:00:00.000Z', durationDays: 7 },
      { startDate: '2026-08-20T00:00:00.000Z', durationDays: 5 }
    ];
    expect(periodOfPerformanceDays(periods)).toBe(24);
  });

  it('does not double-count overlapping periods', () => {
    const periods = [
      { startDate: '2026-08-01T00:00:00.000Z', durationDays: 10 },
      { startDate: '2026-08-05T00:00:00.000Z', durationDays: 10 }
    ];
    expect(periodOfPerformanceDays(periods)).toBe(14);
  });

  it('counts a single-day period as one day, not zero', () => {
    expect(periodOfPerformanceDays([{ startDate: '2026-08-01T00:00:00.000Z', durationDays: 1 }])).toBe(1);
  });

  it('reads the stored dates as calendar days, so the answer does not shift by timezone', () => {
    const periods = [{ startDate: '2026-08-01T00:00:00.000Z', durationDays: 14 }];
    process.env.TZ = 'America/New_York';
    expect(periodOfPerformanceDays(periods)).toBe(14);
    process.env.TZ = 'Pacific/Auckland';
    expect(periodOfPerformanceDays(periods)).toBe(14);
    process.env.TZ = ORIGINAL_TZ;
  });

  it('is zero when there is nothing scheduled', () => {
    expect(periodOfPerformanceDays([])).toBe(0);
    expect(periodOfPerformanceDays(null)).toBe(0);
    expect(periodOfPerformanceDays(undefined)).toBe(0);
  });
});

/**
 * The period row's End picker is a view over the stored day count (design
 * behaviours 2–5, 7). Run in three timezones because the picker crosses from
 * local calendar days to UTC midnight, and a UTC-only run hides off-by-ones.
 */
describe.each([['America/New_York'], ['Pacific/Auckland'], ['UTC']])('period end/day arithmetic in %s', (tz) => {
  beforeAll(() => {
    process.env.TZ = tz;
  });
  afterAll(() => {
    process.env.TZ = ORIGINAL_TZ;
  });

  const NOV_2 = '2026-11-02T00:00:00.000Z';

  it('counts days inclusively: same day is 1, Nov 2 to Nov 15 is 14 (7)', () => {
    expect(durationFromDates(NOV_2, NOV_2)).toBe(1);
    expect(durationFromDates(NOV_2, '2026-11-15T00:00:00.000Z')).toBe(14);
  });

  it('crosses a DST change without slipping a day', () => {
    // US DST ends Nov 1 2026; NZ DST starts Sep 27 2026.
    expect(durationFromDates('2026-10-30T00:00:00.000Z', '2026-11-02T00:00:00.000Z')).toBe(4);
    expect(durationFromDates('2026-09-25T00:00:00.000Z', '2026-09-28T00:00:00.000Z')).toBe(4);
  });

  it('shows End as start + days − 1 (2)', () => {
    expect(periodEndSowDate(NOV_2, 14)).toBe('2026-11-15T00:00:00.000Z');
    expect(periodEndSowDate(NOV_2, 1)).toBe(NOV_2);
  });

  it('shows a legacy 0-day (or nonsense) period as End = Start, one day (2)', () => {
    expect(periodEndSowDate(NOV_2, 0)).toBe(NOV_2);
    expect(periodDays(0)).toBe(1);
    expect(periodDays(-4)).toBe(1);
    expect(periodDays(undefined)).toBe(1);
    expect(periodDays(Number.NaN)).toBe(1);
    expect(periodDays(14)).toBe(14);
  });

  it('round-trips through the picker: picking the shown End changes nothing (2, 3)', () => {
    const picked = pickerValueToSowDate(sowDateToPickerValue(periodEndSowDate(NOV_2, 14))!);
    expect(periodEndPatch({ startDate: NOV_2 }, picked)).toEqual({ durationDays: 14 });
  });

  it('turns a picked End into the inclusive day count (3)', () => {
    const picked = pickerValueToSowDate(new Date(2026, 10, 20));
    expect(periodEndPatch({ startDate: NOV_2 }, picked)).toEqual({ durationDays: 19 });
    expect(periodEndPatch({ startDate: NOV_2 }, NOV_2)).toEqual({ durationDays: 1 });
  });

  it('refuses an End before Start: no patch, so the period does not change (4)', () => {
    expect(periodEndPatch({ startDate: NOV_2 }, '2026-11-01T00:00:00.000Z')).toBeNull();
  });

  it('keeps End fixed when Start moves to on or before it (5)', () => {
    const period = { startDate: NOV_2, durationDays: 14 }; // ends Nov 15
    expect(periodStartPatch(period, '2026-10-30T00:00:00.000Z')).toEqual({ startDate: '2026-10-30T00:00:00.000Z', durationDays: 17 });
    expect(periodStartPatch(period, '2026-11-10T00:00:00.000Z')).toEqual({ startDate: '2026-11-10T00:00:00.000Z', durationDays: 6 });
    expect(periodStartPatch(period, '2026-11-15T00:00:00.000Z')).toEqual({ startDate: '2026-11-15T00:00:00.000Z', durationDays: 1 });
  });

  it('moves End to the new Start when Start passes it, one day (5)', () => {
    expect(periodStartPatch({ startDate: NOV_2, durationDays: 14 }, '2026-11-20T00:00:00.000Z')).toEqual({ startDate: '2026-11-20T00:00:00.000Z', durationDays: 1 });
  });

  it('keeps a legacy 0-day period’s End (= its Start) fixed when Start moves earlier (2, 5)', () => {
    expect(periodStartPatch({ startDate: NOV_2, durationDays: 0 }, '2026-10-31T00:00:00.000Z')).toEqual({ startDate: '2026-10-31T00:00:00.000Z', durationDays: 3 });
  });
});

/**
 * FINDINGS F3. MUI X fires onChange (and, in 8.29.3, onAccept) for every valid
 * intermediate date while a date is typed section by section. Applied one by
 * one, an intermediate Start later than End moves End (behaviour 5), and the
 * End staff set is lost. The Start field therefore holds what is typed as a
 * draft and commits it on blur, or at once when the calendar accepts a pick.
 */
describe.each([['America/New_York'], ['Pacific/Auckland'], ['UTC']])('Start field draft and commit in %s (F3)', (tz) => {
  beforeAll(() => {
    process.env.TZ = tz;
  });
  afterAll(() => {
    process.env.TZ = ORIGINAL_TZ;
  });

  const NOV_2 = '2026-11-02T00:00:00.000Z';
  const period = { startDate: NOV_2, durationDays: 14 }; // ends Nov 15
  /** A picker value: the local calendar day, as MUI X hands it back. */
  const local = (month: number, day: number, year = 2026): Date => new Date(year, month, day);

  /** Feed events through periodStartEdit as the period row does, collecting its patches. */
  function run(events: PeriodStartEvent[], p = period): { draft: Date | null | undefined; patches: Array<{ startDate: string; durationDays: number }> } {
    let draft: Date | null | undefined;
    const patches: Array<{ startDate: string; durationDays: number }> = [];
    for (const event of events) {
      const step = periodStartEdit(p, draft, event);
      draft = step.draft;
      if (step.patch) patches.push(step.patch);
    }
    return { draft, patches };
  }

  it('typing a Start through a later intermediate date does not move End', () => {
    // Oct 30 – Nov 15, retyped as Nov 5 by keyboard. Typing the month "11"
    // first gives Nov 30, which is after End. The day "05" then gives Nov 5.
    // MUI fires change and accept for each valid date along the way.
    const oct30 = { startDate: '2026-10-30T00:00:00.000Z', durationDays: 17 }; // ends Nov 15
    const { patches } = run(
      [
        { type: 'change', value: local(10, 30) },
        { type: 'accept', value: local(10, 30), source: 'unknown' },
        { type: 'change', value: local(10, 5) },
        { type: 'accept', value: local(10, 5), source: 'unknown' },
        { type: 'blur' }
      ],
      oct30
    );

    expect(patches).toEqual([{ startDate: '2026-11-05T00:00:00.000Z', durationDays: 11 }]); // Nov 5 – Nov 15
    // The bug this replaces: applying each intermediate value carries End to
    // Nov 30, so the period becomes Nov 5 – Nov 30.
    expect(periodStartPatch(periodStartPatch(oct30, '2026-11-30T00:00:00.000Z'), '2026-11-05T00:00:00.000Z').durationDays).toBe(26);
  });

  it('holds typed values as a draft until the field loses focus', () => {
    const { draft, patches } = run([{ type: 'change', value: local(10, 12) }]);
    expect(patches).toEqual([]);
    expect(draft).toEqual(local(10, 12));
  });

  it('commits a calendar pick at once', () => {
    const { draft, patches } = run([
      { type: 'change', value: local(10, 5) },
      { type: 'accept', value: local(10, 5), source: 'view' }
    ]);
    expect(patches).toEqual([{ startDate: '2026-11-05T00:00:00.000Z', durationDays: 11 }]);
    expect(draft).toBeUndefined();
  });

  it('does not commit a year chosen in the calendar before the day is accepted', () => {
    expect(run([{ type: 'change', value: local(10, 2, 2027) }]).patches).toEqual([]);
  });

  it('still carries End along when a committed Start passes it (5)', () => {
    expect(run([{ type: 'change', value: local(10, 20) }, { type: 'blur' }]).patches).toEqual([{ startDate: '2026-11-20T00:00:00.000Z', durationDays: 1 }]);
  });

  it('discards an unfinished or cleared entry on blur, so the field falls back to the stored Start', () => {
    for (const value of [new Date(Number.NaN), null]) {
      const { draft, patches } = run([{ type: 'change', value }, { type: 'blur' }]);
      expect(patches).toEqual([]);
      expect(draft).toBeUndefined();
    }
    expect(run([{ type: 'blur' }]).patches).toEqual([]);
  });

  it('commits nothing when the typed date is the current Start', () => {
    expect(run([{ type: 'change', value: local(10, 2) }, { type: 'blur' }]).patches).toEqual([]);
  });
});

/**
 * Walkthrough fix 1. MUI X 8.29.3 re-syncs a controlled field to its value when
 * a typed intermediate date is refused, so the later digits landed in the
 * stored End. End is therefore drafted and committed like Start.
 */
describe.each([['America/New_York'], ['Pacific/Auckland'], ['UTC']])('End field draft and commit in %s', (tz) => {
  beforeAll(() => {
    process.env.TZ = tz;
  });
  afterAll(() => {
    process.env.TZ = ORIGINAL_TZ;
  });

  const period = { startDate: '2026-11-02T00:00:00.000Z', durationDays: 14 }; // ends Nov 15
  const local = (month: number, day: number, year = 2026): Date => new Date(year, month, day);

  function run(events: PeriodStartEvent[]): { draft: Date | null | undefined; patches: Array<{ durationDays: number }> } {
    let draft: Date | null | undefined;
    const patches: Array<{ durationDays: number }> = [];
    for (const event of events) {
      const step = periodEndEdit(period, draft, event);
      draft = step.draft;
      if (step.patch) patches.push(step.patch);
    }
    return { draft, patches };
  }

  it('typing an End before Start (month first) then leaving the field changes nothing', () => {
    const { draft, patches } = run([
      { type: 'change', value: local(0, 15) },
      { type: 'change', value: local(9, 15) },
      { type: 'accept', value: local(9, 15), source: 'unknown' },
      { type: 'change', value: local(9, 30) },
      { type: 'accept', value: local(9, 30), source: 'unknown' },
      { type: 'blur' }
    ]);
    expect(patches).toEqual([]);
    expect(draft).toBeUndefined();
  });

  it('holds typed values as a draft with no patch until blur', () => {
    const { draft, patches } = run([{ type: 'change', value: local(10, 20) }]);
    expect(patches).toEqual([]);
    expect(draft).toEqual(local(10, 20));
  });

  it('a later valid typed End then blur gives the right durationDays', () => {
    const { draft, patches } = run([
      { type: 'change', value: local(10, 30) },
      { type: 'accept', value: local(10, 30), source: 'unknown' },
      { type: 'blur' }
    ]);
    expect(patches).toEqual([{ durationDays: 29 }]);
    expect(draft).toBeUndefined();
  });

  it('a calendar pick commits at once', () => {
    const { draft, patches } = run([{ type: 'accept', value: local(10, 20), source: 'view' }]);
    expect(patches).toEqual([{ durationDays: 19 }]);
    expect(draft).toBeUndefined();
  });

  it('a calendar pick before Start is refused and clears the draft', () => {
    const { draft, patches } = run([{ type: 'accept', value: local(10, 1), source: 'view' }]);
    expect(patches).toEqual([]);
    expect(draft).toBeUndefined();
  });

  it('clearing then blur gives no patch', () => {
    const { draft, patches } = run([{ type: 'change', value: null }, { type: 'blur' }]);
    expect(patches).toEqual([]);
    expect(draft).toBeUndefined();
  });

  it('typing the current End gives no patch', () => {
    const { patches } = run([{ type: 'change', value: local(10, 15) }, { type: 'blur' }]);
    expect(patches).toEqual([]);
  });

  it('blur with no edit in progress does nothing', () => {
    expect(run([{ type: 'blur' }])).toEqual({ draft: undefined, patches: [] });
  });
});
