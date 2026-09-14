import { describe, it, expect } from 'vitest';
import {
  BIOSECURITY_SCREENINGS,
  BIOSECURITY_SCREENING_GROUPS,
  PLACEHOLDER_BIOSECURITY,
  biosecurityFromJob,
  biosecurityStatusColor,
  biosecurityStatusLabel,
  compositeBiosecurityStatus,
  homologyDetail,
  homologyStatusFrom,
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

  it('is in progress for the placeholder every job currently reports', () => {
    expect(compositeBiosecurityStatus(PLACEHOLDER_BIOSECURITY)).toBe('IN_PROGRESS');
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
      CUSTOMER: 'IN_PROGRESS',
      METADATA: 'UNAVAILABLE',
      WATERMARKING: 'UNAVAILABLE',
      FUNCTIONAL: 'UNAVAILABLE'
    });
  });

  /**
   * Homology is real, so it must not sit here carrying a fake value that
   * something could read by mistake — `biosecurityFromJob` supplies it.
   */
  it('does not carry a value for the screening that actually runs', () => {
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
    expect(screenings.CUSTOMER).toBe('IN_PROGRESS');
    expect(screenings.METADATA).toBe('UNAVAILABLE');
  });

  it('covers every screening the card renders', () => {
    expect(Object.keys(biosecurityFromJob(null)).sort()).toEqual(BIOSECURITY_SCREENINGS.map((s) => s.key).sort());
  });

  it('rolls up to Failed when SecureDNA denied synthesis', () => {
    expect(compositeBiosecurityStatus(biosecurityFromJob({ homologyScreening: { status: 'FAILED' } }))).toBe('FAILED');
  });

  it('rolls up to In Progress while homology is unavailable, on the strength of the others', () => {
    expect(compositeBiosecurityStatus(biosecurityFromJob(null))).toBe('IN_PROGRESS');
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
});
