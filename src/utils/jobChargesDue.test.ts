import { describe, expect, it } from 'vitest';
import { buildDueScheduleInput, depositChangeInput, depositDraftFrom, dueDraftTotal, dueDraftsAsSchedule, dueDraftsError, dueDraftsFrom, localDay } from './jobCharges';

/**
 * The issue dialog's due dates and deposit, as typed. The server checks the
 * same rules with the same words (`due-schedule.ts`, `invoice.service.ts`);
 * these pin this side of that agreement.
 */

const noon = (day: string): string => new Date(`${day}T12:00:00`).toISOString();

describe('dueDraftsFrom', () => {
  it('reads a schedule into rows the inputs can hold', () => {
    expect(dueDraftsFrom([{ amount: 300, dueDate: noon('2026-10-01') }])).toEqual([{ amount: '300.00', dueDate: '2026-10-01' }]);
  });

  it('is empty for no schedule', () => {
    expect(dueDraftsFrom(null)).toEqual([]);
  });
});

describe('dueDraftsError', () => {
  const rows = [
    { amount: '100.10', dueDate: '2026-10-01' },
    { amount: '199.90', dueDate: '2026-11-01' }
  ];

  it('accepts rows that add up to what is owed, to the cent', () => {
    expect(dueDraftsError(rows, 300)).toBeNull();
  });

  it('names both figures, in the server’s words, when they do not', () => {
    expect(dueDraftsError(rows, 350)).toBe('The due dates add up to $300.00, but $350.00 is owed.');
  });

  it('refuses a row with no amount, a zero amount, or no date', () => {
    expect(dueDraftsError([{ amount: '', dueDate: '2026-10-01' }], 300)).toBe('Each due date needs an amount greater than zero.');
    expect(dueDraftsError([{ amount: '0', dueDate: '2026-10-01' }], 300)).toBe('Each due date needs an amount greater than zero.');
    expect(dueDraftsError([{ amount: '300', dueDate: '' }], 300)).toBe('Each amount needs a due date.');
  });

  it('takes no rows when nothing is owed', () => {
    expect(dueDraftsError([], 0)).toBeNull();
    expect(dueDraftsError([{ amount: '5', dueDate: '2026-10-01' }], 0)).toBe('Nothing is owed, so this invoice takes no due dates.');
  });
});

describe('dueDraftTotal and the rows the preview renders', () => {
  const rows = [
    { amount: '100', dueDate: '2026-10-01' },
    { amount: 'abc', dueDate: '2026-11-01' },
    { amount: '50.5', dueDate: '' }
  ];

  it('totals only amounts that parse', () => {
    expect(dueDraftTotal(rows)).toBe(150.5);
  });

  it('leaves out rows that are not complete yet', () => {
    expect(dueDraftsAsSchedule(rows)).toEqual([{ amount: 100, dueDate: noon('2026-10-01') }]);
  });

  it('sends every row at local noon, to the cent', () => {
    expect(buildDueScheduleInput([{ amount: '33.335', dueDate: '2026-10-01' }])).toEqual([{ amount: 33.34, dueDate: noon('2026-10-01') }]);
  });
});

describe('the deposit draft against the job’s deposit', () => {
  const existing = { label: 'Deposit', amount: 200, dueDate: noon('2026-09-20') };

  it('starts from the job’s deposit, with "Deposit" left to the placeholder', () => {
    expect(depositDraftFrom(existing)).toEqual({ amount: '200.00', label: '', dueDate: '2026-09-20' });
    expect(depositDraftFrom(null)).toBeNull();
  });

  it('says nothing when the draft is the deposit the job already has', () => {
    expect(depositChangeInput(depositDraftFrom(existing), existing)).toEqual({});
  });

  it('sends the draft when it differs', () => {
    expect(depositChangeInput({ amount: '250', label: '', dueDate: '2026-09-20' }, existing)).toEqual({ deposit: { amount: 250, dueDate: noon('2026-09-20') } });
    expect(depositChangeInput({ amount: '200', label: 'Retainer', dueDate: '2026-09-20' }, existing)).toEqual({ deposit: { amount: 200, label: 'Retainer', dueDate: noon('2026-09-20') } });
  });

  it('removes the job’s deposit when the draft is cleared, and says nothing when there was none', () => {
    expect(depositChangeInput(null, existing)).toEqual({ removeDeposit: true });
    expect(depositChangeInput(null, null)).toEqual({});
  });

  it('says nothing for a draft that is not valid yet', () => {
    expect(depositChangeInput({ amount: '', label: '', dueDate: '2026-09-20' }, existing)).toEqual({});
  });
});

describe('localDay', () => {
  it('is the local calendar day, and empty for nothing', () => {
    expect(localDay(noon('2026-09-20'))).toBe('2026-09-20');
    expect(localDay(null)).toBe('');
    expect(localDay('not a date')).toBe('');
  });
});
