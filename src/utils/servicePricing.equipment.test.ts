import { describe, it, expect } from 'vitest';
import {
  EQUIPMENT_BOOKERS_PARAM_ID,
  EQUIPMENT_END_PARAM_ID,
  EQUIPMENT_HOURS_PER_WEEK_PARAM_ID,
  EQUIPMENT_OPEN_END_PARAM_ID,
  EQUIPMENT_START_PARAM_ID,
  RUN_COUNT_PARAM_ID,
  calculateServiceCost,
  equipmentFactor,
  equipmentWeeks,
  resolveParameterName
} from './servicePricing';

/**
 * THE shared table. damplab-backend/src/pricing/service-pricing.util.spec.ts holds a
 * byte-identical copy; the two implementations must agree case for case.
 */
const EQUIPMENT_FACTOR_CASES: Array<[string, string | undefined, string | undefined, unknown, number | undefined]> = [
  ['28 days is 4 weeks', '2026-01-01', '2026-01-29', 10, 40],
  ['29 days rounds up to 5 weeks', '2026-01-01', '2026-01-30', 10, 50],
  ['a same-day window is one week', '2026-01-01', '2026-01-01', 10, 10],
  ['7 days is exactly one week', '2026-01-01', '2026-01-08', 1, 1],
  ['8 days rounds up to 2 weeks', '2026-01-01', '2026-01-09', 2, 4],
  ['a missing end date has no factor', '2026-01-01', undefined, 10, undefined],
  ['a missing start date has no factor', undefined, '2026-01-29', 10, undefined],
  ['an end before the start has no factor', '2026-01-29', '2026-01-01', 10, undefined],
  ['a malformed date has no factor', '2026-01-01', 'next tuesday', 10, undefined],
  ['zero hours per week has no factor', '2026-01-01', '2026-01-29', 0, undefined],
  ['non-numeric hours per week has no factor', '2026-01-01', '2026-01-29', 'abc', undefined],
  ['hours per week sent as a string still counts', '2026-01-01', '2026-01-29', '10', 40]
];

const equipmentFormData = (start?: string, end?: string, hours?: unknown) => [
  ...(start === undefined ? [] : [{ id: EQUIPMENT_START_PARAM_ID, value: start }]),
  ...(end === undefined ? [] : [{ id: EQUIPMENT_END_PARAM_ID, value: end }]),
  ...(hours === undefined ? [] : [{ id: EQUIPMENT_HOURS_PER_WEEK_PARAM_ID, value: hours }]),
  { id: EQUIPMENT_OPEN_END_PARAM_ID, value: false },
  { id: EQUIPMENT_BOOKERS_PARAM_ID, value: [] }
];

describe('equipmentWeeks', () => {
  it('counts whole weeks, rounding any partial week up, with one week as the floor', () => {
    expect(equipmentWeeks('2026-01-01', '2026-01-29')).toBe(4);
    expect(equipmentWeeks('2026-01-01', '2026-01-30')).toBe(5);
    expect(equipmentWeeks('2026-01-01', '2026-01-01')).toBe(1);
  });

  it('is undefined rather than throwing on a window it cannot read', () => {
    expect(equipmentWeeks(undefined, '2026-01-29')).toBeUndefined();
    expect(equipmentWeeks('2026-01-29', '2026-01-01')).toBeUndefined();
    expect(equipmentWeeks('2026-01-01', '')).toBeUndefined();
  });

  it('does not shift across a DST boundary', () => {
    expect(equipmentWeeks('2026-02-22', '2026-03-22')).toBe(4);
  });
});

describe('equipmentFactor', () => {
  it.each(EQUIPMENT_FACTOR_CASES)('%s', (_label, start, end, hours, expected) => {
    expect(equipmentFactor(equipmentFormData(start, end, hours))).toBe(expected);
  });

  it('is undefined when none of the reserved entries are present', () => {
    expect(equipmentFactor([{ id: 'vol', value: 5 }])).toBeUndefined();
    expect(equipmentFactor(undefined)).toBeUndefined();
  });
});

describe('calculateServiceCost — equipment estimate', () => {
  const service = { pricingMode: 'SERVICE', price: 40, parameters: [] };

  it('prices 10 hrs/wk at $40/hr over 28 days as $1,600', () => {
    expect(calculateServiceCost(service, equipmentFormData('2026-01-01', '2026-01-29', 10))).toBe(1600);
  });

  it('stacks the run count on top of the equipment factor', () => {
    const formData = [...equipmentFormData('2026-01-01', '2026-01-29', 10), { id: RUN_COUNT_PARAM_ID, value: 2 }];
    expect(calculateServiceCost(service, formData)).toBe(3200);
  });

  it('leaves the price alone rather than throwing when the window is unusable', () => {
    expect(calculateServiceCost(service, equipmentFormData('2026-01-01', undefined, 10))).toBe(40);
    expect(calculateServiceCost(service, equipmentFormData('2026-01-29', '2026-01-01', 10))).toBe(40);
  });
});

describe('resolveParameterName', () => {
  it('knows the reserved labels, which a submitted job no longer carries', () => {
    // Submitted formData is stored as {id, value} only, and the five are never in
    // service.parameters — so without this fallback the job PDF prints "__equipStart".
    expect(resolveParameterName({ id: EQUIPMENT_START_PARAM_ID })).toBe('Start Date');
    expect(resolveParameterName({ id: EQUIPMENT_END_PARAM_ID })).toBe('End Date');
    expect(resolveParameterName({ id: EQUIPMENT_OPEN_END_PARAM_ID })).toBe('Open End Date?');
    expect(resolveParameterName({ id: EQUIPMENT_HOURS_PER_WEEK_PARAM_ID })).toBe('Projected Hours per Week');
    expect(resolveParameterName({ id: EQUIPMENT_BOOKERS_PARAM_ID })).toBe('Authorized booker emails');
  });

  it('still prefers a name the entry carries for itself', () => {
    expect(resolveParameterName({ id: EQUIPMENT_START_PARAM_ID, name: 'Kickoff' })).toBe('Kickoff');
  });
});
