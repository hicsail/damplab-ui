import { describe, it, expect } from 'vitest';
import { invoiceCountLabel } from './invoiceCounts';

const live = { voidedAt: null };
const voided = { voidedAt: '2026-09-08T00:00:00.000Z' };

describe('invoiceCountLabel', () => {
  it('counts records, matching the list of invoices it sits above', () => {
    expect(invoiceCountLabel([live])).toBe('1 invoice');
    expect(invoiceCountLabel([live, live])).toBe('2 invoices');
  });

  it('says voided when nothing stands, so it cannot contradict the jobs-list chip', () => {
    // The chip counts standing invoices only and would read "Invoices · None".
    // Without the qualifier this pane would read a bare "1 invoice" for the same job.
    expect(invoiceCountLabel([voided])).toBe('1 invoice, voided');
    expect(invoiceCountLabel([voided, voided])).toBe('2 invoices, all voided');
  });

  it('drops the qualifier as soon as one invoice stands', () => {
    expect(invoiceCountLabel([voided, live])).toBe('2 invoices');
  });

  it.each([null, undefined, []])('reports no invoices for %p', (input) => {
    expect(invoiceCountLabel(input as never)).toBe('No invoices yet');
  });
});
