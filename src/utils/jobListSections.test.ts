import { describe, it, expect } from 'vitest';
import { jobListSectionChips } from './jobListSections';
import { jobStatusColor } from './technicianProcessStatus';
import { statusColor } from '../components/sow/sowTypes';

const chipsByKey = (job: Parameters<typeof jobListSectionChips>[0]) =>
  Object.fromEntries(jobListSectionChips(job).map((c) => [c.key, c]));

describe('jobListSectionChips', () => {
  it('always returns one chip per job-page card, in card order', () => {
    expect(jobListSectionChips({}).map((c) => c.key)).toEqual(['job', 'sow', 'invoices']);
  });

  it('reports every section of a job nothing has happened to yet', () => {
    const chips = chipsByKey({ state: 'SUBMITTED' });
    expect(chips.sow.label).toBe('SOW · Not started');
    expect(chips.invoices.label).toBe('Invoice · None');
    expect(chips.sow.color).toBe('default');
    expect(chips.invoices.color).toBe('default');
  });

  it('takes the job colour from the same table the job page uses', () => {
    for (const state of ['SUBMITTED', 'CHANGES_REQUESTED', 'ACCEPTED', 'REJECTED', 'CLOSED']) {
      expect(chipsByKey({ state }).job.color).toBe(jobStatusColor(state));
    }
  });

  it('takes the SOW colour from the same table the SOW card uses', () => {
    for (const status of ['DRAFT', 'SENT', 'SIGNED', 'FINAL', 'CANCELLED'] as const) {
      expect(chipsByKey({ sow: { status } }).sow.color).toBe(statusColor(status));
    }
  });

  it('reads a job state rather than printing the raw enum', () => {
    expect(chipsByKey({ state: 'CHANGES_REQUESTED' }).job.label).toBe('Job · Changes Requested');
  });

  it('does not colour an unsent draft the same as a countersigned document', () => {
    const draft = chipsByKey({ sow: { status: 'DRAFT' } }).sow;
    const final = chipsByKey({ sow: { status: 'FINAL' } }).sow;
    expect(draft.color).not.toBe(final.color);
  });

  it('shows where the invoice stands, in the Invoice card’s colours', () => {
    expect(chipsByKey({ invoiceStatus: 'ISSUED' }).invoices).toMatchObject({ label: 'Invoice · Issued', color: 'info' });
    expect(chipsByKey({ invoiceStatus: 'PAID' }).invoices).toMatchObject({ label: 'Invoice · Paid', color: 'success' });
  });

  it('treats a missing invoiceStatus as none rather than as unknown', () => {
    // Not a compatibility path — a backend without the field fails the query
    // outright. This is only so a caller that does not select it still renders.
    expect(chipsByKey({ invoiceStatus: null }).invoices).toMatchObject({ label: 'Invoice · None', color: 'default' });
    expect(chipsByKey({}).invoices.label).toBe('Invoice · None');
  });
});
