import { describe, it, expect } from 'vitest';
import {
  BIOSECURITY_SCREENINGS,
  BIOSECURITY_SCREENING_GROUPS,
  PLACEHOLDER_BIOSECURITY,
  biosecurityFromJob,
  biosecurityStatusColor,
  biosecurityStatusLabel,
  compositeBiosecurityStatus,
  customerDetail,
  homologyBackupSentence,
  homologyDetail,
  homologyStatusFrom,
  staffHomologyNote,
  type BiosecurityScreeningStatus,
  type BiosecurityScreenings
} from './biosecurityStatus';

const all = (status: BiosecurityScreeningStatus): BiosecurityScreenings => ({
  HOMOLOGY: status,
  CUSTOMER: status,
  METADATA: status,
  WATERMARKING: status,
  FUNCTIONAL: status
});

describe('compositeBiosecurityStatus', () => {
  it('rolls up to passed when every screening that reported passed', () => {
    expect(compositeBiosecurityStatus(all('PASSED'))).toBe('PASSED');
  });

  it('lets a single failure dominate everything else', () => {
    expect(compositeBiosecurityStatus({ ...all('PASSED'), HOMOLOGY: 'FAILED' })).toBe('FAILED');
    expect(compositeBiosecurityStatus({ ...all('IN_PROGRESS'), CUSTOMER: 'FAILED' })).toBe('FAILED');
  });

  it('reports in progress over a screening that has already passed', () => {
    expect(compositeBiosecurityStatus({ ...all('PASSED'), METADATA: 'IN_PROGRESS' })).toBe('IN_PROGRESS');
  });

  /**
   * `UNAVAILABLE` means the screening could not run for this job, not that it is
   * pending — so it neither drags the rollup down nor props it up. This is the
   * one rule that changed when the card grew to five screenings: three of them
   * are unavailable on every job today, and a card that read "Unavailable"
   * while homology had passed and customer was running would be telling the
   * technician nothing.
   */
  it('ignores an unavailable screening rather than suppressing a verdict', () => {
    expect(compositeBiosecurityStatus({ ...all('UNAVAILABLE'), CUSTOMER: 'PASSED' })).toBe('PASSED');
    expect(compositeBiosecurityStatus({ ...all('UNAVAILABLE'), CUSTOMER: 'FAILED' })).toBe('FAILED');
  });

  it('is unavailable only when nothing reported at all', () => {
    expect(compositeBiosecurityStatus(all('UNAVAILABLE'))).toBe('UNAVAILABLE');
    expect(compositeBiosecurityStatus({})).toBe('UNAVAILABLE');
    expect(compositeBiosecurityStatus(null)).toBe('UNAVAILABLE');
  });

  it('treats a missing screening as unavailable', () => {
    expect(compositeBiosecurityStatus({ HOMOLOGY: 'PASSED' })).toBe('PASSED');
  });

  it('is unavailable for the four screenings that have no implementation yet', () => {
    expect(compositeBiosecurityStatus(PLACEHOLDER_BIOSECURITY)).toBe('UNAVAILABLE');
  });
});

describe('biosecurityStatusColor / biosecurityStatusLabel', () => {
  it('renders an unavailable screening grey rather than green', () => {
    expect(biosecurityStatusColor('UNAVAILABLE')).toBe('default');
    expect(biosecurityStatusLabel('UNAVAILABLE')).toBe('Unavailable');
  });

  it('maps each status onto the shared chip vocabulary', () => {
    expect(biosecurityStatusColor('IN_PROGRESS')).toBe('info');
    expect(biosecurityStatusColor('PASSED')).toBe('success');
    expect(biosecurityStatusColor('FAILED')).toBe('error');
    expect(biosecurityStatusLabel('IN_PROGRESS')).toBe('In Progress');
    expect(biosecurityStatusLabel('PASSED')).toBe('Passed');
    expect(biosecurityStatusLabel('FAILED')).toBe('Failed');
  });

  it('falls back to unavailable rather than showing an enum', () => {
    expect(biosecurityStatusColor(undefined)).toBe('default');
    expect(biosecurityStatusLabel(undefined)).toBe('Unavailable');
  });
});

describe('BIOSECURITY_SCREENING_GROUPS', () => {
  it('shows primary screening before additional screening', () => {
    expect(BIOSECURITY_SCREENING_GROUPS.map((g) => g.label)).toEqual(['Primary Screening', 'Additional Screening']);
  });

  it('orders each group the way the card reads it', () => {
    expect(BIOSECURITY_SCREENING_GROUPS[0].screenings.map((s) => s.label)).toEqual(['Homology', 'Customer']);
    expect(BIOSECURITY_SCREENING_GROUPS[1].screenings.map((s) => s.label)).toEqual([
      'Metadata',
      'Watermarking',
      'Functional'
    ]);
  });

  it('flattens into the five screenings the card shows, in card order', () => {
    expect(BIOSECURITY_SCREENINGS.map((s) => s.label)).toEqual([
      'Homology',
      'Customer',
      'Metadata',
      'Watermarking',
      'Functional'
    ]);
  });
});

describe('PLACEHOLDER_BIOSECURITY', () => {
  it('holds the four screenings with nothing behind them yet', () => {
    expect(PLACEHOLDER_BIOSECURITY).toEqual({
      CUSTOMER: 'UNAVAILABLE',
      METADATA: 'UNAVAILABLE',
      WATERMARKING: 'UNAVAILABLE',
      FUNCTIONAL: 'UNAVAILABLE'
    });
  });

  /**
   * Homology is real, so it must not sit here carrying a fake value that
   * something could read by mistake — `biosecurityFromJob` supplies it.
   */
  it('does not carry a value for homology — biosecurityFromJob supplies it', () => {
    expect(PLACEHOLDER_BIOSECURITY).not.toHaveProperty('HOMOLOGY');
  });
});

describe('homologyStatusFrom', () => {
  it('passes through the three statuses SecureDNA can produce', () => {
    expect(homologyStatusFrom({ status: 'PASSED' })).toBe('PASSED');
    expect(homologyStatusFrom({ status: 'FAILED' })).toBe('FAILED');
    expect(homologyStatusFrom({ status: 'IN_PROGRESS' })).toBe('IN_PROGRESS');
  });

  /**
   * A job submitted before screening existed carries no `homologyScreening` at
   * all. That has to read as unavailable, not as a pass and not as a job stuck
   * forever in progress.
   */
  it('is unavailable for a job with no screening, or an unrecognised status', () => {
    expect(homologyStatusFrom(undefined)).toBe('UNAVAILABLE');
    expect(homologyStatusFrom(null)).toBe('UNAVAILABLE');
    expect(homologyStatusFrom({})).toBe('UNAVAILABLE');
    expect(homologyStatusFrom({ status: 'UNAVAILABLE' })).toBe('UNAVAILABLE');
    expect(homologyStatusFrom({ status: 'SOMETHING_NEW' })).toBe('UNAVAILABLE');
  });
});

describe('biosecurityFromJob', () => {
  it("puts the job's verdict on Homology and leaves the other four placeholder", () => {
    const screenings = biosecurityFromJob({ homologyScreening: { status: 'FAILED' } });
    expect(screenings.HOMOLOGY).toBe('FAILED');
    expect(screenings.CUSTOMER).toBe('UNAVAILABLE');
    expect(screenings.METADATA).toBe('UNAVAILABLE');
  });

  it('reads Customer from aclidScreening.customerStatus, Unavailable when absent', () => {
    expect(biosecurityFromJob(null).CUSTOMER).toBe('UNAVAILABLE');
    expect(biosecurityFromJob({ aclidScreening: { customerStatus: 'PASSED' } }).CUSTOMER).toBe('PASSED');
    expect(biosecurityFromJob({ aclidScreening: { customerStatus: 'FAILED' } }).CUSTOMER).toBe('FAILED');
  });

  it('rolls up to Unavailable when nothing ran, not In Progress', () => {
    expect(compositeBiosecurityStatus(biosecurityFromJob(null))).toBe('UNAVAILABLE');
  });

  it('covers every screening the card renders', () => {
    expect(Object.keys(biosecurityFromJob(null)).sort()).toEqual(BIOSECURITY_SCREENINGS.map((s) => s.key).sort());
  });

  it('rolls up to Failed when SecureDNA denied synthesis', () => {
    expect(compositeBiosecurityStatus(biosecurityFromJob({ homologyScreening: { status: 'FAILED' } }))).toBe('FAILED');
  });

  /**
   * The invariant the customer card broke while its query left
   * `homologyScreening` unselected: a KYC pass must never let the card read
   * Passed over a failed homology verdict. A false clear on a safety verdict,
   * shown to the person whose sequence was flagged.
   */
  it('stays Failed when homology failed and the customer passed KYC', () => {
    const screenings = biosecurityFromJob({
      homologyScreening: { status: 'FAILED' },
      aclidScreening: { customerStatus: 'PASSED' }
    });
    expect(screenings.HOMOLOGY).toBe('FAILED');
    expect(screenings.CUSTOMER).toBe('PASSED');
    expect(compositeBiosecurityStatus(screenings)).toBe('FAILED');
  });
});

describe('customerDetail', () => {
  it('prompts identity verification while customer screening is in progress', () => {
    expect(customerDetail({ customerStatus: 'IN_PROGRESS' })).toBe('Complete identity verification');
  });

  it('needs no line when customer verification passed', () => {
    expect(customerDetail({ customerStatus: 'PASSED' })).toBeNull();
  });

  it("surfaces the server's reason for a failure or an unavailable screen", () => {
    expect(customerDetail({ customerStatus: 'FAILED', detail: 'Identity could not be verified' })).toBe(
      'Identity could not be verified'
    );
    expect(customerDetail({ customerStatus: 'UNAVAILABLE', detail: 'Aclid customer check not started' })).toBe(
      'Aclid customer check not started'
    );
  });

  it('is null when there is nothing worth saying', () => {
    expect(customerDetail(null)).toBeNull();
    expect(customerDetail({ customerStatus: 'UNAVAILABLE', detail: '   ' })).toBeNull();
  });
});

describe('homologyDetail', () => {
  it('says nothing explanatory for a pass beyond what cleared', () => {
    expect(homologyDetail({ status: 'PASSED', sequenceCount: 1 })).toBe('1 sequence cleared by SecureDNA');
    expect(homologyDetail({ status: 'PASSED', sequenceCount: 3 })).toBe('3 sequences cleared by SecureDNA');
    expect(homologyDetail({ status: 'PASSED', sequenceCount: 0 })).toBeNull();
  });

  it("surfaces the server's reason for a failure or an unavailable screen", () => {
    expect(homologyDetail({ status: 'FAILED', detail: 'SecureDNA denied synthesis — 1 of 2 sequence(s) flagged' })).toBe(
      'SecureDNA denied synthesis — 1 of 2 sequence(s) flagged'
    );
    expect(homologyDetail({ status: 'UNAVAILABLE', detail: 'Could not reach SecureDNA' })).toBe('Could not reach SecureDNA');
  });

  it('is null when there is nothing worth saying', () => {
    expect(homologyDetail(null)).toBeNull();
    expect(homologyDetail({ status: 'UNAVAILABLE', detail: '   ' })).toBeNull();
  });

  it('says a screen is running rather than leaving it unexplained', () => {
    expect(homologyDetail({ status: 'IN_PROGRESS' })).toBe('Screening with SecureDNA…');
  });

  /**
   * In the default `aclid` mode SecureDNA never runs, so the row has no batch.
   * Crediting it anyway tells a technician two providers agreed.
   */
  it('credits the provider that actually screened', () => {
    const aclidOnly = { screenId: 'scr_1' };
    expect(homologyDetail({ status: 'PASSED', sequenceCount: 1, batchId: null }, aclidOnly)).toBe('1 sequence cleared by Aclid');
    expect(homologyDetail({ status: 'IN_PROGRESS', batchId: null }, aclidOnly)).toBe('Screening with Aclid…');
    expect(homologyDetail({ status: 'PASSED', sequenceCount: 2, batchId: 'batch-1' }, aclidOnly)).toBe(
      '2 sequences cleared by SecureDNA and Aclid'
    );
    expect(homologyDetail({ status: 'PASSED', sequenceCount: 2, batchId: 'batch-1' }, { screenId: null })).toBe(
      '2 sequences cleared by SecureDNA'
    );
  });
});

describe('homologyBackupSentence', () => {
  it('picks the SecureDNA-backup clause out of a multi-leg detail', () => {
    expect(
      homologyBackupSentence('SecureDNA backup after Aclid error: timeout; 2 sequences cleared')
    ).toBe('SecureDNA backup after Aclid error: timeout');
  });

  it('is null when no leg was a backup', () => {
    expect(homologyBackupSentence('Aclid not_controlled')).toBeNull();
    expect(homologyBackupSentence(null)).toBeNull();
    expect(homologyBackupSentence(undefined)).toBeNull();
  });
});

describe('staffHomologyNote', () => {
  it("is SecureDNA's line alone when Aclid did not screen this job", () => {
    expect(staffHomologyNote({ status: 'PASSED', sequenceCount: 2 }, null)).toEqual({
      note: '2 sequences cleared by SecureDNA',
      backup: null
    });
    expect(staffHomologyNote(null, null)).toEqual({ note: null, backup: null });
  });

  it("adds Aclid's regulatory verdict and detail when a screen exists", () => {
    expect(
      staffHomologyNote(
        { status: 'FAILED', detail: 'Aclid controlled' },
        { screenId: 'scr_1', regulatoryStatus: 'controlled', detail: 'Regulated agent match' }
      )
    ).toEqual({
      note: 'Aclid controlled · Aclid regulatory status: controlled · Regulated agent match',
      backup: null
    });
  });

  it('ignores Aclid fields when there is no screen, even if they are populated', () => {
    expect(
      staffHomologyNote({ status: 'UNAVAILABLE', detail: 'Aclid skipped: sequences shorter than 30 bp' }, { screenId: null, regulatoryStatus: 'controlled' })
    ).toEqual({ note: 'Aclid skipped: sequences shorter than 30 bp', backup: null });
  });

  it('keeps the SecureDNA-backup sentence on a pass, where homologyDetail would drop it', () => {
    const result = staffHomologyNote(
      { status: 'PASSED', sequenceCount: 3, detail: 'SecureDNA backup after Aclid error: 401 Unauthorized; 3 sequence(s) cleared' },
      { screenId: null, detail: 'Aclid 401 Unauthorized' }
    );
    expect(result.backup).toBe('SecureDNA backup after Aclid error: 401 Unauthorized');
    expect(result.note).toBe('3 sequences cleared by SecureDNA · SecureDNA backup after Aclid error: 401 Unauthorized');
  });

  it('does not repeat a backup sentence homologyDetail already surfaced', () => {
    const result = staffHomologyNote(
      { status: 'FAILED', detail: 'SecureDNA backup after Aclid error: timeout; SecureDNA denied synthesis' },
      null
    );
    expect(result.backup).toBe('SecureDNA backup after Aclid error: timeout');
    expect(result.note).toBe('SecureDNA backup after Aclid error: timeout; SecureDNA denied synthesis');
  });

  it('reads a backup sentence off the Aclid detail when the homology detail lacks one', () => {
    const result = staffHomologyNote(
      { status: 'PASSED', sequenceCount: 1, batchId: 'batch-1' },
      { screenId: 'scr_2', regulatoryStatus: 'not_controlled', detail: 'SecureDNA backup ran alongside' }
    );
    expect(result.backup).toBe('SecureDNA backup ran alongside');
    expect(result.note).toBe(
      '1 sequence cleared by SecureDNA and Aclid · Aclid regulatory status: not controlled · SecureDNA backup ran alongside'
    );
  });

  /** The default mode, and so what the lab sees on nearly every job. */
  it('does not credit SecureDNA on a row only Aclid produced', () => {
    const result = staffHomologyNote(
      { status: 'PASSED', sequenceCount: 1, batchId: null },
      { screenId: 'scr_3', regulatoryStatus: 'not_controlled' }
    );
    expect(result.note).toBe('1 sequence cleared by Aclid · Aclid regulatory status: not controlled');
  });
});
