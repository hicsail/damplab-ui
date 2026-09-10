import { describe, expect, it } from 'vitest';
import {
  buildCustomLineInputs,
  buildDepositInput,
  chargeKindLabel,
  customLineError,
  customLineErrors,
  depositDraftError,
  depositError,
  emptyCustomLine,
  isBlankCustomLine,
  issuePreview,
  noonIso,
  sortChargesForDisplay
} from './jobCharges';

describe('sortChargesForDisplay', () => {
  it('lists legacy service lines by position first, then everything else oldest first', () => {
    const rows = sortChargesForDisplay([
      { id: 'c', kind: 'DEPOSIT', addedAt: '2026-03-01T00:00:00Z' },
      { id: 'b', kind: 'SERVICE_LINE', sourceIndex: 1, addedAt: '2026-04-01T00:00:00Z' },
      { id: 'a', kind: 'SERVICE_LINE', sourceIndex: 0, addedAt: '2026-04-02T00:00:00Z' }
    ] as any);
    expect(rows.map((r: any) => r.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('chargeKindLabel', () => {
  it('words each kind for the Charges list', () => {
    expect(chargeKindLabel('SERVICE_LINE')).toBe('Service line');
    expect(chargeKindLabel('CUSTOM')).toBe('Custom');
    expect(chargeKindLabel('DEPOSIT')).toBe('Deposit');
    expect(chargeKindLabel(undefined)).toBe('Charge');
  });
});

describe('custom line drafts', () => {
  it('drops a blank row', () => {
    expect(isBlankCustomLine({ label: '  ', amount: '', note: '' })).toBe(true);
    expect(buildCustomLineInputs([emptyCustomLine(), { label: 'Courier', amount: '25', note: '' }])).toEqual([{ label: 'Courier', amount: 25 }]);
  });

  it('keeps a note when there is one, trimmed', () => {
    expect(buildCustomLineInputs([{ label: ' Courier ', amount: '25', note: ' Overnight ' }])).toEqual([{ label: 'Courier', amount: 25, note: 'Overnight' }]);
  });

  it('allows a negative amount — a discount', () => {
    expect(buildCustomLineInputs([{ label: 'Goodwill', amount: '-50', note: '' }])).toEqual([{ label: 'Goodwill', amount: -50 }]);
  });

  it('blocks a labelled row with a zero amount, in the server’s words', () => {
    expect(customLineError({ label: 'Courier', amount: '0', note: '' })).toBe('A charge amount cannot be zero.');
    expect(customLineError({ label: 'Courier', amount: '', note: '' })).toBe('A charge amount cannot be zero.');
  });

  it('blocks an amount with no label, in the server’s words', () => {
    expect(customLineError({ label: '  ', amount: '25', note: '' })).toBe('A label is required for a charge.');
  });

  it('says nothing about a blank row or a good one', () => {
    expect(customLineError(emptyCustomLine())).toBeNull();
    expect(customLineError({ label: 'Courier', amount: '25', note: '' })).toBeNull();
  });

  it('reports the first offending row for the dialog', () => {
    expect(customLineErrors([{ label: 'Courier', amount: '25', note: '' }, { label: 'Bad', amount: '0', note: '' }])).toBe('A charge amount cannot be zero.');
    expect(customLineErrors([emptyCustomLine()])).toBeNull();
  });
});

describe('depositError', () => {
  it.each([['0'], ['-5'], [''], ['abc']])('refuses %s in the server’s words', (v) => {
    expect(depositError(v)).toBe('A deposit must be greater than zero.');
  });

  it('accepts a positive amount', () => {
    expect(depositError('500')).toBeNull();
  });
});

describe('the deposit draft', () => {
  it('needs an amount and a due date, in the server’s words', () => {
    expect(depositDraftError({ amount: '0', label: '', dueDate: '2026-10-01' })).toBe('A deposit must be greater than zero.');
    expect(depositDraftError({ amount: '500', label: '', dueDate: '' })).toBe('A deposit needs a due date.');
    expect(depositDraftError({ amount: '500', label: '', dueDate: '2026-10-01' })).toBeNull();
    expect(depositDraftError(null)).toBeNull();
  });

  it('builds the mutation input at noon, dropping a blank label', () => {
    expect(buildDepositInput({ amount: '500', label: '  ', dueDate: '2026-10-01' })).toEqual({ amount: 500, dueDate: noonIso('2026-10-01') });
    expect(buildDepositInput({ amount: '500', label: 'Retainer', dueDate: '2026-10-01' })).toEqual({ amount: 500, label: 'Retainer', dueDate: noonIso('2026-10-01') });
  });

  it('builds nothing from an invalid or absent draft', () => {
    expect(buildDepositInput({ amount: '', label: '', dueDate: '2026-10-01' })).toBeNull();
    expect(buildDepositInput(null)).toBeNull();
  });
});

describe('issuePreview', () => {
  const balance = { chargesToDate: 1000, paymentsToDate: 400, depositAmount: null };

  it('adds the new lines to the charges and states the balance', () => {
    const preview = issuePreview(balance, [{ label: 'Rush', amount: '50', note: '' }, emptyCustomLine()], null);
    expect(preview).toMatchObject({ charges: 1050, payments: 400, balance: 650, paid: false });
  });

  it('shows the invoice as Paid when a discount settles the remainder', () => {
    const preview = issuePreview(balance, [{ label: 'Write-off', amount: '-600', note: '' }], null);
    expect(preview).toMatchObject({ charges: 400, balance: 0, paid: true });
  });

  it('ignores a line that would be refused', () => {
    expect(issuePreview(balance, [{ label: '', amount: '75', note: '' }], null).charges).toBe(1000);
  });

  it('never adds a deposit to the charges, and caps what it asks for at the balance', () => {
    const preview = issuePreview({ chargesToDate: 300, paymentsToDate: 0 }, [], { amount: '500', label: '', dueDate: '2026-10-01' });
    expect(preview.charges).toBe(300);
    expect(preview.depositOutstanding).toBe(300);
  });

  it('uses the job’s existing deposit when the dialog adds none', () => {
    expect(issuePreview({ chargesToDate: 1000, paymentsToDate: 100, depositAmount: 250 }, [], null).depositOutstanding).toBe(150);
  });
});
