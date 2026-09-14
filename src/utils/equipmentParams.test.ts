import { describe, it, expect } from 'vitest';
import {
  EQUIPMENT_BOOKERS_PARAM_ID,
  EQUIPMENT_END_PARAM_ID,
  EQUIPMENT_HOURS_PER_WEEK_PARAM_ID,
  EQUIPMENT_OPEN_END_PARAM_ID,
  EQUIPMENT_PARAM_IDS,
  EQUIPMENT_START_PARAM_ID
} from './servicePricing';
import { hasEquipmentParams, invalidBookerEmails, normalizeBookerEmails, orderEquipmentFirst, validateEquipmentValues } from './equipmentParams';

const values = (over: Record<string, any> = {}) => ({
  [EQUIPMENT_START_PARAM_ID]: '2026-01-01',
  [EQUIPMENT_END_PARAM_ID]: '2026-01-29',
  [EQUIPMENT_OPEN_END_PARAM_ID]: false,
  [EQUIPMENT_HOURS_PER_WEEK_PARAM_ID]: 10,
  [EQUIPMENT_BOOKERS_PARAM_ID]: [],
  ...over
});

describe('normalizeBookerEmails', () => {
  it('trims, lowercases, drops blanks and deduplicates', () => {
    expect(normalizeBookerEmails([' A@B.com ', 'a@b.com', '', '  ', 'c@d.org'])).toEqual(['a@b.com', 'c@d.org']);
  });

  it('accepts a single string and anything unusable as empty', () => {
    expect(normalizeBookerEmails('A@B.com')).toEqual(['a@b.com']);
    expect(normalizeBookerEmails(undefined)).toEqual([]);
    expect(normalizeBookerEmails(null)).toEqual([]);
    expect(normalizeBookerEmails(7)).toEqual([]);
  });
});

describe('invalidBookerEmails', () => {
  it('names only the entries that are not addresses', () => {
    expect(invalidBookerEmails(['a@b.com', 'nope', 'x@y'])).toEqual(['nope', 'x@y']);
    expect(invalidBookerEmails(['a@b.com'])).toEqual([]);
    expect(invalidBookerEmails([])).toEqual([]);
  });
});

describe('validateEquipmentValues', () => {
  it('passes a complete window', () => {
    expect(validateEquipmentValues(values())).toEqual({});
  });

  it('says nothing at all about a node with no equipment parameters', () => {
    expect(validateEquipmentValues({ vol: '' })).toEqual({});
  });

  it('requires the start date, the end date and the hours', () => {
    expect(validateEquipmentValues(values({ [EQUIPMENT_START_PARAM_ID]: '' }))[EQUIPMENT_START_PARAM_ID]).toBe('Required');
    expect(validateEquipmentValues(values({ [EQUIPMENT_END_PARAM_ID]: '' }))[EQUIPMENT_END_PARAM_ID]).toBe('Required');
    expect(validateEquipmentValues(values({ [EQUIPMENT_HOURS_PER_WEEK_PARAM_ID]: '' }))[EQUIPMENT_HOURS_PER_WEEK_PARAM_ID]).toBe('Required');
  });

  it('refuses an end date before the start date', () => {
    const errors = validateEquipmentValues(values({ [EQUIPMENT_END_PARAM_ID]: '2025-12-31' }));
    expect(errors[EQUIPMENT_END_PARAM_ID]).toBe('End Date must be on or after Start Date.');
  });

  it('accepts an end date equal to the start date', () => {
    expect(validateEquipmentValues(values({ [EQUIPMENT_END_PARAM_ID]: '2026-01-01' }))).toEqual({});
  });

  it('requires hours per week to be a whole number of 1 or more', () => {
    const msg = 'Projected Hours per Week must be a whole number of 1 or more.';
    expect(validateEquipmentValues(values({ [EQUIPMENT_HOURS_PER_WEEK_PARAM_ID]: 0 }))[EQUIPMENT_HOURS_PER_WEEK_PARAM_ID]).toBe(msg);
    expect(validateEquipmentValues(values({ [EQUIPMENT_HOURS_PER_WEEK_PARAM_ID]: 2.5 }))[EQUIPMENT_HOURS_PER_WEEK_PARAM_ID]).toBe(msg);
    expect(validateEquipmentValues(values({ [EQUIPMENT_HOURS_PER_WEEK_PARAM_ID]: 'ten' }))[EQUIPMENT_HOURS_PER_WEEK_PARAM_ID]).toBe(msg);
    expect(validateEquipmentValues(values({ [EQUIPMENT_HOURS_PER_WEEK_PARAM_ID]: '10' }))).toEqual({});
  });

  it('leaves the open-end checkbox and an empty booker list alone', () => {
    expect(validateEquipmentValues(values({ [EQUIPMENT_OPEN_END_PARAM_ID]: true }))).toEqual({});
    expect(validateEquipmentValues(values({ [EQUIPMENT_BOOKERS_PARAM_ID]: [] }))).toEqual({});
  });

  it('names every malformed booker email', () => {
    const errors = validateEquipmentValues(values({ [EQUIPMENT_BOOKERS_PARAM_ID]: ['a@b.com', 'nope'] }));
    expect(errors[EQUIPMENT_BOOKERS_PARAM_ID]).toBe('Not a valid email address: nope');
  });

  it('refuses a malformed date outright', () => {
    expect(validateEquipmentValues(values({ [EQUIPMENT_START_PARAM_ID]: '01/01/2026' }))[EQUIPMENT_START_PARAM_ID]).toBe('Use a date in YYYY-MM-DD form.');
  });
});

describe('orderEquipmentFirst', () => {
  it('pulls the five to the front in their pinned order and keeps the rest as they were', () => {
    const entries = [{ id: 'vol' }, { id: EQUIPMENT_HOURS_PER_WEEK_PARAM_ID }, { id: 'buf' }, { id: EQUIPMENT_START_PARAM_ID }];
    expect(orderEquipmentFirst(entries).map((e) => e.id)).toEqual([
      EQUIPMENT_START_PARAM_ID,
      EQUIPMENT_HOURS_PER_WEEK_PARAM_ID,
      'vol',
      'buf'
    ]);
  });

  it('leaves a list with none of them untouched', () => {
    const entries = [{ id: 'vol' }, { id: 'buf' }];
    expect(orderEquipmentFirst(entries)).toEqual(entries);
  });
});

describe('hasEquipmentParams', () => {
  it('is true only when a reserved id is present', () => {
    expect(hasEquipmentParams([{ id: 'vol' }])).toBe(false);
    expect(hasEquipmentParams([{ id: 'vol' }, { id: EQUIPMENT_PARAM_IDS[0] }])).toBe(true);
    expect(hasEquipmentParams(undefined)).toBe(false);
  });
});
