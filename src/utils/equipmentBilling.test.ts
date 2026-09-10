import { describe, expect, it } from 'vitest';
import {
  balanceHeading,
  balanceRailLabel,
  buildStatementTotals,
  confirmedUsageSuffix,
  depositDropNote,
  dueDateLabel,
  equipmentEstimateNote,
  formatMoney,
  invoiceKindLabel,
  invoiceKindOf,
  isLegacyInvoice,
  paymentsCountLabel
} from './equipmentBilling';

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

  it('reads a statement as STATEMENT and anything unrecognised as SOW', () => {
    expect(invoiceKindOf({ kind: 'STATEMENT' })).toBe('STATEMENT');
    expect(invoiceKindOf({ kind: 'EQUIPMENT' })).toBe('EQUIPMENT');
    expect(invoiceKindOf({})).toBe('SOW');
  });
});

describe('isLegacyInvoice', () => {
  it('is true for every document written before statements', () => {
    expect(isLegacyInvoice({ kind: 'SOW' })).toBe(true);
    expect(isLegacyInvoice({ kind: 'EQUIPMENT' })).toBe(true);
    expect(isLegacyInvoice({})).toBe(true);
    expect(isLegacyInvoice({ kind: 'STATEMENT' })).toBe(false);
  });
});

describe('buildStatementTotals', () => {
  it('states charges, payments and the balance, with the payment line negative', () => {
    expect(buildStatementTotals({ subtotal: 500, paymentsToDate: 200, balanceDue: 300 })).toEqual([
      { label: 'Charges to date', amount: '$500.00' },
      { label: 'Payments to date', amount: '-$200.00' },
      { label: 'Balance due', amount: '$300.00' }
    ]);
  });

  it('says "Credit balance" in words rather than printing a minus total', () => {
    const rows = buildStatementTotals({ subtotal: 100, paymentsToDate: 130, balanceDue: -30 });
    expect(rows[2]).toEqual({ label: 'Credit balance', amount: '$30.00' });
  });
});

describe('dueDateLabel', () => {
  it('words a due date, and says nothing for a legacy document that has none', () => {
    expect(dueDateLabel('2026-04-09T12:00:00.000Z')).toBe('Due 04/09/2026');
    expect(dueDateLabel(null)).toBe('');
  });
});

describe('depositDropNote', () => {
  it('explains the drop-off only when it has happened', () => {
    expect(depositDropNote({ depositsDropped: true })).toBe(
      'Deposits have dropped off now that services are released; the payment against them carries forward.'
    );
    expect(depositDropNote({ depositsDropped: false })).toBe('');
  });
});

describe('equipmentEstimateNote', () => {
  it('marks an equipment-use line, and leaves an ordinary one alone', () => {
    expect(equipmentEstimateNote('Plate reader — 10 hrs/wk x 4 wks (estimate; billed on actual hours)')).toBe(
      'Estimated · billed at actual booked hours'
    );
    expect(equipmentEstimateNote('Amplification')).toBe('');
  });
});

describe('invoiceKindLabel', () => {
  it('names the chip on each row', () => {
    expect(invoiceKindLabel({ kind: 'EQUIPMENT' })).toBe('Equipment');
    expect(invoiceKindLabel({ kind: 'STATEMENT' })).toBe('Statement');
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
