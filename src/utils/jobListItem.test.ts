import { describe, expect, it } from 'vitest';
import { toJobListItem } from './jobListItem';
import { jobListSectionChips } from './jobListSections';

describe('toJobListItem', () => {
  it('carries the invoice status through to the row, so an invoiced job is not shown as "None" (F6)', () => {
    const item = toJobListItem({ id: 'j1', name: 'Gibson', state: 'SUBMITTED', submitted: '2026-09-01', invoiceStatus: 'PAID', sow: null });
    expect(item.invoiceStatus).toBe('PAID');
    expect(jobListSectionChips(item).find((chip) => chip.key === 'invoices')?.label).toBe('Invoice · Paid');
  });

  it('reads a missing status as none', () => {
    expect(toJobListItem({ id: 'j1' }).invoiceStatus).toBeNull();
  });

  it('copies the SOW summary', () => {
    expect(toJobListItem({ id: 'j1', sow: { id: 's1', sowNumber: '00012', sowTitle: null, status: 'SIGNED' } }).sow).toEqual({ id: 's1', sowNumber: '00012', sowTitle: undefined, status: 'SIGNED' });
  });
});
