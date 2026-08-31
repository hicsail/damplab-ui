import { describe, it, expect } from 'vitest';
import {
  chipStatusBackground,
  invoiceVersionLabel,
  jobPartyStatus,
  latestCustomerVisibleJobVersion,
  latestCustomerVisibleSowVersion,
  latestStaffVisibleJobVersion,
  latestStaffVisibleSowVersion,
  isJobProcessSettled,
  isSowProcessSettled,
  jobStatusColor,
  jobStatusLabel,
  partyVersionLabel,
  sowPartyStatus
} from './technicianProcessStatus';

describe('jobPartyStatus', () => {
  it('puts paper on staff while the job is being created', () => {
    expect(jobPartyStatus('CREATING')).toEqual({ customer: null, staff: 'paper' });
  });

  it('gives the customer a check after submit and paper to staff for review', () => {
    expect(jobPartyStatus('SUBMITTED')).toEqual({ customer: 'check', staff: 'paper' });
  });

  it('moves paper to the customer when the job is sent back', () => {
    expect(jobPartyStatus('CHANGES_REQUESTED')).toEqual({ customer: 'paper', staff: null });
  });

  it('gives both sides a check once staff accept', () => {
    expect(jobPartyStatus('ACCEPTED')).toEqual({ customer: 'check', staff: 'check' });
  });

  it('keeps both checks while the accepted job is in the lab', () => {
    expect(jobPartyStatus('QUEUED')).toEqual({ customer: 'check', staff: 'check' });
    expect(jobPartyStatus('WAITING_FOR_SOW')).toEqual({ customer: 'check', staff: 'check' });
    expect(jobPartyStatus('IN_PROGRESS')).toEqual({ customer: 'check', staff: 'check' });
    expect(jobPartyStatus('COMPLETE')).toEqual({ customer: 'check', staff: 'check' });
    expect(jobPartyStatus('CLOSED')).toEqual({ customer: 'check', staff: 'check' });
  });

  it('keeps the customer check when the job is rejected', () => {
    expect(jobPartyStatus('REJECTED')).toEqual({ customer: 'check', staff: null });
  });
});

describe('process card settled states', () => {
  it('treats an accepted job as settled so the card can start collapsed', () => {
    expect(isJobProcessSettled('ACCEPTED')).toBe(true);
    expect(isJobProcessSettled('QUEUED')).toBe(true);
    expect(isJobProcessSettled('SUBMITTED')).toBe(false);
    expect(isJobProcessSettled('CHANGES_REQUESTED')).toBe(false);
  });

  it('treats a countersigned SOW as settled', () => {
    expect(isSowProcessSettled('FINAL')).toBe(true);
    expect(isSowProcessSettled('SIGNED')).toBe(false);
    expect(isSowProcessSettled('SENT')).toBe(false);
  });
});

describe('sowPartyStatus', () => {
  it('puts paper on staff while a draft has not been sent', () => {
    expect(sowPartyStatus({ currentStatus: 'DRAFT', activeStatus: null })).toEqual({ customer: null, staff: 'paper' });
  });

  it('puts paper on the customer when the SOW is out for signature and a check on staff who issued it', () => {
    expect(sowPartyStatus({ currentStatus: 'SENT', activeStatus: 'SENT' })).toEqual({ customer: 'paper', staff: 'check' });
  });

  it('gives the customer a check after they sign and paper to staff for countersignature', () => {
    expect(sowPartyStatus({ currentStatus: 'SIGNED', activeStatus: 'SIGNED' })).toEqual({ customer: 'check', staff: 'paper' });
  });

  it('keeps the customer check when a later draft sits above the signed version', () => {
    expect(sowPartyStatus({ currentStatus: 'DRAFT', activeStatus: 'SIGNED' })).toEqual({ customer: 'check', staff: 'paper' });
  });

  it('gives both sides a check once the SOW is finalized', () => {
    expect(sowPartyStatus({ currentStatus: 'FINAL', activeStatus: 'FINAL' })).toEqual({ customer: 'check', staff: 'check' });
  });

  it('returns the draft to staff after a sent SOW is withdrawn', () => {
    expect(sowPartyStatus({ currentStatus: 'DRAFT', activeStatus: null })).toEqual({ customer: null, staff: 'paper' });
  });

  it('shows no badges when the SOW is cancelled', () => {
    expect(sowPartyStatus({ currentStatus: 'CANCELLED', activeStatus: null })).toEqual({ customer: null, staff: null });
  });

  it('shows no badges when there is no SOW yet', () => {
    expect(sowPartyStatus({ currentStatus: null, activeStatus: null })).toEqual({ customer: null, staff: null });
  });
});

describe('latest visible job versions', () => {
  const versions = [
    { versionNumber: 2, authorRole: 'STAFF' as const, visibleToCustomer: false, isEvent: false, displayVersion: '0.2' },
    { versionNumber: 1000, authorRole: 'STAFF' as const, visibleToCustomer: true, isEvent: true, displayVersion: '1.0' },
    { versionNumber: 1001, authorRole: 'STAFF' as const, visibleToCustomer: false, isEvent: false, displayVersion: '1.1' },
    { versionNumber: 2002, authorRole: 'STAFF' as const, visibleToCustomer: true, isEvent: true, displayVersion: '2.2' }
  ];

  it('includes sent-to-customer event versions the customer can see', () => {
    const untilSend = versions.slice(0, 2);
    expect(latestCustomerVisibleJobVersion(untilSend)?.displayVersion).toBe('1.0');
  });

  it('includes accept event versions for both parties', () => {
    expect(latestCustomerVisibleJobVersion(versions)?.displayVersion).toBe('2.2');
    expect(latestStaffVisibleJobVersion(versions)?.displayVersion).toBe('2.2');
  });

  it('keeps a staff-only draft off the customer label until it is published', () => {
    const withUnpublishedDraft = versions.slice(0, 3);
    expect(latestCustomerVisibleJobVersion(withUnpublishedDraft)?.displayVersion).toBe('1.0');
    expect(latestStaffVisibleJobVersion(withUnpublishedDraft)?.displayVersion).toBe('1.1');
  });
});

describe('latest visible sow versions', () => {
  const versions = [
    { versionNumber: 1000, visibleToCustomer: true, displayVersion: '1.0' },
    { versionNumber: 1001, visibleToCustomer: false, displayVersion: '1.1' }
  ];

  it('picks the newest customer-visible SOW version', () => {
    expect(latestCustomerVisibleSowVersion(versions)?.versionNumber).toBe(1000);
  });

  it('picks the newest SOW version for staff including drafts', () => {
    expect(latestStaffVisibleSowVersion(versions)?.versionNumber).toBe(1001);
  });
});

describe('partyVersionLabel', () => {
  it('falls back to an em dash when there is no version', () => {
    expect(partyVersionLabel(null)).toBe('—');
  });

  it('prefixes a display version with v', () => {
    expect(partyVersionLabel({ versionNumber: 1001, displayVersion: '1.1' })).toBe('v1.1');
  });
});

describe('chipStatusBackground', () => {
  it('returns a translucent tint for each chip color', () => {
    expect(chipStatusBackground('warning')).toMatch(/255,\s*152,\s*0/);
    expect(chipStatusBackground('success')).toMatch(/0,\s*255,\s*0/);
    expect(chipStatusBackground('default')).toMatch(/120,\s*120,\s*120/);
  });
});

// Every JobState in damplab-backend/src/job/job.model.ts. Four of these used to
// have no case at all and painted a transparent pane reading "Invalid Case".
const JOB_STATES = [
  'CREATING',
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'ACCEPTED',
  'WAITING_FOR_SOW',
  'QUEUED',
  'IN_PROGRESS',
  'COMPLETE',
  'REJECTED',
  'CLOSED'
];

describe('jobStatusColor', () => {
  it('gives every job state a colour from the shared vocabulary', () => {
    for (const state of JOB_STATES) {
      expect(['default', 'info', 'warning', 'success', 'error']).toContain(jobStatusColor(state));
    }
  });

  it('paints an accepted job the same green the SOW uses when finalized', () => {
    expect(chipStatusBackground(jobStatusColor('ACCEPTED'))).toBe(chipStatusBackground('success'));
  });

  it('keeps rejection and requested changes distinguishable', () => {
    expect(jobStatusColor('REJECTED')).toBe('error');
    expect(jobStatusColor('CHANGES_REQUESTED')).toBe('warning');
  });

  it('falls back to neutral for an unknown or missing state', () => {
    expect(jobStatusColor('NOT_A_STATE')).toBe('default');
    expect(jobStatusColor(null)).toBe('default');
  });
});

describe('jobStatusLabel', () => {
  it('never leaks a raw enum for a known state', () => {
    for (const state of JOB_STATES) {
      expect(jobStatusLabel(state)).not.toBe(state);
    }
  });

  it('reads as words', () => {
    expect(jobStatusLabel('ACCEPTED')).toBe('Accepted');
    expect(jobStatusLabel('CHANGES_REQUESTED')).toBe('Changes Requested');
    expect(jobStatusLabel('WAITING_FOR_SOW')).toBe('Waiting for SOW');
  });

  it('falls back to an em dash when there is no state', () => {
    expect(jobStatusLabel(null)).toBe('—');
  });
});

describe('invoiceVersionLabel', () => {
  it('returns an em dash when there are no invoices', () => {
    expect(invoiceVersionLabel([])).toBe('—');
  });

  it('returns the latest invoice number for both parties', () => {
    expect(invoiceVersionLabel([{ invoiceNumber: 'INV-1' }, { invoiceNumber: 'INV-2' }])).toBe('INV-2');
  });
});
