import { describe, it, expect } from 'vitest';
import {
  BIOSECURITY_SCREENINGS,
  PLACEHOLDER_BIOSECURITY,
  biosecurityStatusColor,
  biosecurityStatusLabel,
  compositeBiosecurityStatus,
  type BiosecurityScreenings
} from './biosecurityStatus';

const all = (status: BiosecurityScreenings[keyof BiosecurityScreenings]): BiosecurityScreenings => ({
  METADATA: status,
  HOMOLOGY: status,
  CUSTOMER: status
});

describe('compositeBiosecurityStatus', () => {
  it('rolls up to passed only when every screening passed', () => {
    expect(compositeBiosecurityStatus(all('PASSED'))).toBe('PASSED');
  });

  it('lets a single flag dominate everything else', () => {
    expect(compositeBiosecurityStatus({ ...all('PASSED'), HOMOLOGY: 'FLAGGED' })).toBe('FLAGGED');
    expect(compositeBiosecurityStatus({ ...all('IN_PROGRESS'), CUSTOMER: 'FLAGGED' })).toBe('FLAGGED');
  });

  it('reports in progress over a screening that has not started', () => {
    expect(compositeBiosecurityStatus({ ...all('NOT_STARTED'), METADATA: 'IN_PROGRESS' })).toBe('IN_PROGRESS');
  });

  it('does not report passed while a screening has yet to run', () => {
    expect(compositeBiosecurityStatus({ ...all('PASSED'), CUSTOMER: 'NOT_STARTED' })).toBe('NOT_STARTED');
  });

  it('treats a missing screening as not started', () => {
    expect(compositeBiosecurityStatus({ METADATA: 'PASSED', HOMOLOGY: 'PASSED' })).toBe('NOT_STARTED');
    expect(compositeBiosecurityStatus(null)).toBe('NOT_STARTED');
  });

  it('is not started for the placeholder every job currently reports', () => {
    expect(compositeBiosecurityStatus(PLACEHOLDER_BIOSECURITY)).toBe('NOT_STARTED');
  });
});

describe('biosecurityStatusColor / biosecurityStatusLabel', () => {
  it('renders an unrun screening grey rather than green', () => {
    expect(biosecurityStatusColor('NOT_STARTED')).toBe('default');
    expect(biosecurityStatusLabel('NOT_STARTED')).toBe('Not Started');
  });

  it('maps each status onto the shared chip vocabulary', () => {
    expect(biosecurityStatusColor('IN_PROGRESS')).toBe('info');
    expect(biosecurityStatusColor('PASSED')).toBe('success');
    expect(biosecurityStatusColor('FLAGGED')).toBe('error');
  });

  it('falls back to not started rather than showing an enum', () => {
    expect(biosecurityStatusColor(undefined)).toBe('default');
    expect(biosecurityStatusLabel(undefined)).toBe('Not Started');
  });
});

describe('BIOSECURITY_SCREENINGS', () => {
  it('lists the three screenings the card shows', () => {
    expect(BIOSECURITY_SCREENINGS.map((s) => s.label)).toEqual(['Metadata', 'Homology', 'Customer']);
  });
});
