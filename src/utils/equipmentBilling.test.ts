import { describe, expect, it } from 'vitest';
import { balanceHeading, balanceRailLabel, confirmedUsageSuffix, formatMoney, invoiceKindLabel, invoiceKindOf, paymentsCountLabel } from './equipmentBilling';

describe('invoiceKindOf', () => {
  it('reads an equipment invoice as EQUIPMENT', () => {
    expect(invoiceKindOf({ kind: 'EQUIPMENT' })).toBe('EQUIPMENT');
  });

  it.each([
    ['an explicit SOW invoice', { kind: 'SOW' }],
    ['a legacy invoice with no kind', {}],
    ['a null kind', { kind: null }],
    ['an unrecognised kind', { kind: 'USAGE' }],
    ['nothing', null]
  ])('reads %s as SOW — the same fallback the server applies', (_label, invoice) => {
    expect(invoiceKindOf(invoice as any)).toBe('SOW');
  });
});

describe('invoiceKindLabel', () => {
  it('names the chip on each row', () => {
    expect(invoiceKindLabel({ kind: 'EQUIPMENT' })).toBe('Equipment');
    expect(invoiceKindLabel({})).toBe('SOW');
  });
});

describe('formatMoney', () => {
  it.each([
    [120, '$120.00'],
    [0, '$0.00'],
    [10.005, '$10.01'],
    [null, '$0.00'],
    [undefined, '$0.00']
  ])('formats %p as %s', (input, expected) => {
    expect(formatMoney(input as any)).toBe(expected);
  });
});

describe('balanceRailLabel', () => {
  it('says what is due', () => {
    expect(balanceRailLabel(120)).toBe('$120.00 due');
  });

  it('says credit rather than a negative amount, so the rail never reads "$-30.00 due"', () => {
    expect(balanceRailLabel(-30)).toBe('$30.00 credit');
  });

  it('reads as settled at zero', () => {
    expect(balanceRailLabel(0)).toBe('$0.00 due');
  });

  it('treats a missing balance as nothing owed', () => {
    expect(balanceRailLabel(null)).toBe('$0.00 due');
  });
});

describe('balanceHeading', () => {
  it('names the total on the statement', () => {
    expect(balanceHeading(120)).toBe('Balance due');
    expect(balanceHeading(0)).toBe('Balance due');
    expect(balanceHeading(-30)).toBe('Credit balance');
  });
});

describe('paymentsCountLabel', () => {
  it.each([
    [0, 'No payments'],
    [1, '1 payment'],
    [3, '3 payments']
  ])('names %p as %s', (count, expected) => {
    expect(paymentsCountLabel(count)).toBe(expected);
  });
});

describe('confirmedUsageSuffix', () => {
  it('appends the confirmed hours and the charge to the booking card’s status line', () => {
    expect(confirmedUsageSuffix({ confirmedHours: 3.5, chargesToDate: 140 })).toBe(' · 3.5 hrs confirmed · $140.00');
  });

  it('says nothing when no usage has been confirmed', () => {
    expect(confirmedUsageSuffix({ confirmedHours: 0, chargesToDate: 0 })).toBe('');
  });

  it('still reports hours confirmed at a zero rate — free time is confirmed usage', () => {
    expect(confirmedUsageSuffix({ confirmedHours: 2, chargesToDate: 0 })).toBe(' · 2 hrs confirmed · $0.00');
  });

  it('says nothing when the balance has not loaded', () => {
    expect(confirmedUsageSuffix(null)).toBe('');
  });

  it('drops trailing zeros so two hours does not read as "2.00 hrs"', () => {
    expect(confirmedUsageSuffix({ confirmedHours: 2.0, chargesToDate: 80 })).toBe(' · 2 hrs confirmed · $80.00');
  });
});
