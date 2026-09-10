import { describe, expect, it } from 'vitest';
import {
  balanceHeading,
  balanceRailLabel,
  buildStatementTotals,
  confirmedUsageSuffix,
  currentInvoice,
  depositSummary,
  dueDateLabel,
  equipmentEstimateNote,
  formatMoney,
  invoiceKindLabel,
  invoiceKindOf,
  invoiceStatusChipColor,
  invoiceStatusLabel,
  invoiceStatusOf,
  invoiceTitle,
  invoiceVersionOf,
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

  it('reads a statement as STATEMENT', () => {
    expect(invoiceKindOf({ kind: 'STATEMENT' })).toBe('STATEMENT');
  });
});

describe('isLegacyInvoice', () => {
  it('is true for every document written before versioned invoices', () => {
    expect(isLegacyInvoice({ kind: 'SOW' })).toBe(true);
    expect(isLegacyInvoice({ kind: 'EQUIPMENT' })).toBe(true);
    expect(isLegacyInvoice({})).toBe(true);
    expect(isLegacyInvoice({ kind: 'STATEMENT' })).toBe(false);
  });
});

describe('invoiceStatusOf', () => {
  it('takes the server’s status', () => {
    expect(invoiceStatusOf({ status: 'PAID' })).toBe('PAID');
    expect(invoiceStatusOf({ status: 'ISSUED' })).toBe('ISSUED');
    expect(invoiceStatusOf({ status: 'SUPERSEDED' })).toBe('SUPERSEDED');
  });

  it('falls back to the void and superseded fields for an older cache entry', () => {
    expect(invoiceStatusOf({ voidedAt: '2026-09-01' })).toBe('VOID');
    expect(invoiceStatusOf({ supersededAt: '2026-09-01' })).toBe('SUPERSEDED');
    expect(invoiceStatusOf({})).toBe('ISSUED');
  });

  it('never lets a stale PAID outrank a void', () => {
    expect(invoiceStatusOf({ status: 'PAID', voidedAt: '2026-09-01' })).toBe('VOID');
  });
});

describe('invoice status wording', () => {
  it('labels and colours each status', () => {
    expect(['ISSUED', 'PAID', 'SUPERSEDED', 'VOID'].map((s) => invoiceStatusLabel(s as any))).toEqual(['Issued', 'Paid', 'Superseded', 'Void']);
    expect(['ISSUED', 'PAID', 'SUPERSEDED', 'VOID'].map((s) => invoiceStatusChipColor(s as any))).toEqual(['info', 'success', 'default', 'error']);
  });
});

describe('invoiceVersionOf and invoiceTitle', () => {
  it('names a version by the job and its number', () => {
    expect(invoiceTitle({ jobDisplayId: '00005', versionNumber: 2, invoiceNumber: '00005-002' })).toBe('Invoice 00005 · v2');
  });

  it('reads a pre-versioning invoice off its number', () => {
    expect(invoiceVersionOf({ invoiceNumber: '00005-001' })).toBe(1);
    expect(invoiceTitle({ invoiceNumber: '00005-001' })).toBe('Invoice 00005 · v1');
  });

  it('falls back to the bare number when there is no version to state', () => {
    expect(invoiceTitle({ invoiceNumber: 'INV' })).toBe('Invoice INV');
    expect(invoiceTitle(null)).toBe('');
  });
});

describe('currentInvoice', () => {
  it('is the newest invoice that is neither void nor superseded', () => {
    const rows = [
      { id: 'v3', status: 'VOID', createdAt: '2026-09-03' },
      { id: 'v2', status: 'PAID', createdAt: '2026-09-02' },
      { id: 'v1', status: 'SUPERSEDED', createdAt: '2026-09-01' }
    ];
    expect(currentInvoice(rows)?.id).toBe('v2');
  });

  it('is null when nothing stands', () => {
    expect(currentInvoice([{ status: 'VOID' }, { status: 'SUPERSEDED' }])).toBeNull();
    expect(currentInvoice([])).toBeNull();
  });

  it('picks the newest of several legacy invoices still standing', () => {
    expect(currentInvoice([{ id: 'old', invoiceDate: '2026-01-01' }, { id: 'new', invoiceDate: '2026-02-01' }])?.id).toBe('new');
  });
});

describe('depositSummary', () => {
  it('states the deposit, its date, and what is still owed', () => {
    expect(depositSummary({ label: 'Deposit', amount: 500, dueDate: '2026-10-01T12:00:00Z', outstanding: 200 })).toBe('Deposit $500.00 · Due 10/01/2026 · $200.00 outstanding');
  });

  it('says so once payments cover it', () => {
    expect(depositSummary({ label: 'Deposit', amount: 500, dueDate: null, outstanding: 0 })).toBe('Deposit $500.00 · covered by payments');
  });

  it('says nothing when there is no deposit', () => {
    expect(depositSummary(null)).toBe('');
    expect(depositSummary({ amount: null })).toBe('');
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

describe('equipmentEstimateNote', () => {
  it('marks an equipment-use line, and leaves an ordinary one alone', () => {
    expect(equipmentEstimateNote('Plate reader — 10 hrs/wk x 4 wks (estimate; billed on actual hours)')).toBe('Estimated · billed at actual booked hours');
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
  it('names the total on the invoice', () => {
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
  it('appends the confirmed hours and what they cost to the booking card’s status line', () => {
    expect(confirmedUsageSuffix({ confirmedHours: 3.5, equipmentCharges: 140 })).toBe(' · 3.5 hrs confirmed · $140.00');
  });

  it('quotes the equipment charges alone, never the job’s whole total', () => {
    expect(confirmedUsageSuffix({ confirmedHours: 2, equipmentCharges: 80, chargesToDate: 1080 } as any)).toBe(' · 2 hrs confirmed · $80.00');
  });

  it('says nothing when no usage has been confirmed', () => {
    expect(confirmedUsageSuffix({ confirmedHours: 0, equipmentCharges: 0 })).toBe('');
  });

  it('still reports hours confirmed at a zero rate — free time is confirmed usage', () => {
    expect(confirmedUsageSuffix({ confirmedHours: 2, equipmentCharges: 0 })).toBe(' · 2 hrs confirmed · $0.00');
  });

  it('says nothing when the balance has not loaded', () => {
    expect(confirmedUsageSuffix(null)).toBe('');
  });
});
