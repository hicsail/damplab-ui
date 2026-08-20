import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { sowDateToPickerValue, pickerValueToSowDate, todaySowDate, formatSOWDate, formatSOWInstant } from './sowDateUtils';

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
