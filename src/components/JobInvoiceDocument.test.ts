import { describe, expect, it } from 'vitest';
import { buildInvoicePricingNote } from './JobInvoiceDocument';

/**
 * The invoice has to state the same pricing basis the SOW's Fee Schedule does.
 * buildFeeSchedule (damplab-backend/src/sow/sow-field-calculator.ts) prints
 * "$50.00 x 4 = $200.00" from unitCost/multiplier/cost; these assert this side
 * of that agreement, including the case where there is no breakdown to state.
 */
describe('buildInvoicePricingNote', () => {
  it('words the breakdown exactly as the Fee Schedule does', () => {
    expect(buildInvoicePricingNote({ unitCost: 50, multiplier: 4, cost: 200 })).toBe('$50.00 x 4 = $200.00');
  });

  it('names the run count when that is what multiplied the line', () => {
    expect(buildInvoicePricingNote({ unitCost: 50, multiplier: 4, runCount: 4, cost: 200 })).toBe('$50.00 x 4 = $200.00\nNumber of runs: 4');
  });

  it.each([
    ['a legacy line with no unit price', { cost: 200 }],
    ['an explicitly absent unit price', { unitCost: null, multiplier: 4, cost: 200 }],
    ['a line that was not multiplied', { unitCost: 200, multiplier: 1, cost: 200 }],
    ['a non-numeric multiplier', { unitCost: 50, multiplier: 'four', cost: 200 }]
  ])('says nothing rather than inventing a figure for %s', (_label, row) => {
    expect(buildInvoicePricingNote(row)).toBe('');
  });

  it('keeps a zero unit price, which is a real price and not an absent one', () => {
    // The distinction the null guard exists for: `== null` rather than falsy.
    expect(buildInvoicePricingNote({ unitCost: 0, multiplier: 3, cost: 0 })).toBe('$0.00 x 3 = $0.00');
  });

  it('does not print trailing zeros on a fractional multiplier', () => {
    expect(buildInvoicePricingNote({ unitCost: 10, multiplier: 2.5, cost: 25 })).toBe('$10.00 x 2.5 = $25.00');
  });
});

describe('buildInvoicePricingNote: parameter-priced lines', () => {
  const details = [
    { label: 'Instrument: Bioanalyzer', quantity: 1, unitPrice: 100, total: 100 },
    { label: 'Hours in use', quantity: 3, unitPrice: 40, total: 120 }
  ];

  it('itemises the selections on a line with no multiplier to describe', () => {
    // The gap this closes: multiplier 1 suppressed the "x N =" form, so the
    // customer saw a bare $220.00 and no indication of what drove it.
    expect(buildInvoicePricingNote({ cost: 220, unitCost: 220, multiplier: 1, pricingDetails: details })).toBe(
      'Instrument: Bioanalyzer — 1 x $100.00 = $100.00\nHours in use — 3 x $40.00 = $120.00'
    );
  });

  it('shows the itemisation above the multiplier when a line has both', () => {
    const note = buildInvoicePricingNote({ cost: 440, unitCost: 220, multiplier: 2, pricingDetails: details });
    expect(note.split('\n')).toEqual([
      'Instrument: Bioanalyzer — 1 x $100.00 = $100.00',
      'Hours in use — 3 x $40.00 = $120.00',
      '$220.00 x 2 = $440.00'
    ]);
  });

  it('says nothing at all for a line with neither, exactly as before', () => {
    expect(buildInvoicePricingNote({ cost: 350, unitCost: 350, multiplier: 1 })).toBe('');
    expect(buildInvoicePricingNote({ cost: 350, unitCost: 350, multiplier: 1, pricingDetails: [] })).toBe('');
  });

  it('skips a row with no label rather than printing a dangling dash', () => {
    expect(buildInvoicePricingNote({ cost: 10, multiplier: 1, pricingDetails: [{ label: '  ', quantity: 1, unitPrice: 10, total: 10 }] })).toBe('');
  });
});
