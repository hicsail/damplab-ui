import { describe, expect, it } from 'vitest';
import { dueRows, equipmentFormula, paymentLineLabel, pricingDetailLines, serviceFormula, shortDate, signedMoney } from './equipmentBilling';

/** How the invoice in the page words each line. */

const noon = (day: string): string => new Date(`${day}T12:00:00`).toISOString();

describe('equipmentFormula', () => {
  it('states hours, rate and amount', () => {
    expect(equipmentFormula({ actualHours: 2, rate: 3, cost: 6 })).toBe('2 hrs x $3.00/hr = $6.00');
  });

  it('says "hr" for one hour, and trims trailing zeros', () => {
    expect(equipmentFormula({ actualHours: 1, rate: 40, cost: 40 })).toBe('1 hr x $40.00/hr = $40.00');
    expect(equipmentFormula({ actualHours: 1.5, rate: 40, cost: 60 })).toBe('1.5 hrs x $40.00/hr = $60.00');
  });

  it('states the stored amount, never hours x rate recomputed', () => {
    expect(equipmentFormula({ actualHours: 2, rate: 40, cost: 75 })).toBe('2 hrs x $40.00/hr = $75.00');
  });

  it('falls back to the amount alone when the hours or the rate are missing', () => {
    expect(equipmentFormula({ cost: 80 })).toBe('$80.00');
    expect(equipmentFormula({ actualHours: 2, cost: 80 })).toBe('$80.00');
  });
});

describe('serviceFormula', () => {
  it('words a multiplied line as the Fee Schedule does', () => {
    expect(serviceFormula({ unitCost: 50, multiplier: 4, cost: 200 })).toBe('$50.00 x 4 = $200.00');
  });

  it('is the amount for a line that was not multiplied or has no unit price', () => {
    expect(serviceFormula({ unitCost: 200, multiplier: 1, cost: 200 })).toBe('$200.00');
    expect(serviceFormula({ cost: 200 })).toBe('$200.00');
  });

  it('keeps a zero unit price, which is a real price', () => {
    expect(serviceFormula({ unitCost: 0, multiplier: 3, cost: 0 })).toBe('$0.00 x 3 = $0.00');
  });
});

describe('pricingDetailLines', () => {
  it('itemises each labelled selection', () => {
    expect(pricingDetailLines({ pricingDetails: [{ label: 'Hours in use', quantity: 3, unitPrice: 40, total: 120 }, { label: ' ', quantity: 1, unitPrice: 1, total: 1 }] })).toEqual([
      'Hours in use — 3 x $40.00 = $120.00'
    ]);
  });
});

describe('paymentLineLabel', () => {
  it('names the date and the reference', () => {
    expect(paymentLineLabel({ receivedOn: noon('2026-09-10'), reference: 'Check #1042' })).toBe('Payment received 09/10/2026 · Check #1042');
    expect(paymentLineLabel({ receivedOn: noon('2026-09-10') })).toBe('Payment received 09/10/2026');
  });
});

describe('dueRows', () => {
  it('lists the outstanding deposit and each due date, earliest first', () => {
    const rows = dueRows({
      deposit: { label: 'Deposit', outstanding: 100, dueDate: noon('2026-09-20') },
      dueSchedule: [
        { amount: 150, dueDate: noon('2026-11-01') },
        { amount: 100, dueDate: noon('2026-10-01') }
      ]
    });
    expect(rows.map((r) => [r.label, r.amount, shortDate(r.dueDate)])).toEqual([
      ['Deposit', 100, '09/20/2026'],
      ['', 100, '10/01/2026'],
      ['', 150, '11/01/2026']
    ]);
  });

  it('leaves out a deposit the payments covered', () => {
    expect(dueRows({ deposit: { outstanding: 0, dueDate: noon('2026-09-20') }, dueSchedule: [] })).toEqual([]);
  });

  it('reads a version from before due dates were split as one date for the balance less the deposit', () => {
    const rows = dueRows({ deposit: { outstanding: 100, dueDate: noon('2026-09-20') }, dueDate: noon('2026-10-10'), balanceDue: 350 });
    expect(rows.map((r) => [r.amount, shortDate(r.dueDate)])).toEqual([
      [100, '09/20/2026'],
      [250, '10/10/2026']
    ]);
  });
});

describe('signedMoney', () => {
  it('puts the sign before the dollar', () => {
    expect(signedMoney(-50)).toBe('-$50.00');
    expect(signedMoney(50)).toBe('$50.00');
  });
});
