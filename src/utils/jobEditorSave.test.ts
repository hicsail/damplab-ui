import { describe, it, expect } from 'vitest';
import { missedContentVersion, missedUnfilteredContent, pickersAfterSave, seedLoadedVersionNumber } from './jobEditorSave';
import { JobVersionLike } from './jobGraphDiff';

function version(n: number, over: Partial<JobVersionLike> = {}): JobVersionLike {
  return {
    versionNumber: n,
    authorRole: 'STAFF',
    workflows: [],
    createdAt: '2026-08-13T12:00:00.000Z',
    createdByName: 'Alex',
    note: `saved v${n}`,
    ...over
  };
}

describe('missedContentVersion', () => {
  it('is null when nothing newer has been written since this tab loaded', () => {
    const versions = [version(1), version(2)];
    expect(missedContentVersion(versions, 2)).toBeNull();
  });

  it('returns the newest content version written after this tab loaded', () => {
    const versions = [version(1), version(2), version(3, { createdByName: 'Sam', note: 'tweaked PCR' })];
    const missed = missedContentVersion(versions, 2);
    expect(missed).toMatchObject({ versionNumber: 3, createdByName: 'Sam', note: 'tweaked PCR' });
  });

  it('skips a trailing state-change event so a close while you were editing is not a conflict', () => {
    const versions = [version(1), version(2), version(3, { isEvent: true, note: 'Closed' })];
    expect(missedContentVersion(versions, 2)).toBeNull();
  });

  it('is null before the tab has a loaded version to compare against', () => {
    expect(missedContentVersion([version(1)], null)).toBeNull();
  });
});

describe('missedUnfilteredContent', () => {
  it('is null when the unfiltered latest is the version this tab loaded', () => {
    expect(missedUnfilteredContent(1002, 1002)).toBeNull();
  });

  it('returns the unfiltered latest when a newer content version exists, even if it is hidden from this viewer', () => {
    expect(missedUnfilteredContent(1003, 1002)).toBe(1003);
  });

  it('is null before the tab has a loaded version', () => {
    expect(missedUnfilteredContent(1003, null)).toBeNull();
  });
});

describe('pickersAfterSave', () => {
  it('lands on the new latest version and restores automatic compare after a normal save', () => {
    expect(pickersAfterSave({ newLatestVersionNumber: 4 })).toEqual({ viewing: 4, baseline: undefined });
  });

  it('compares the new save against the version that was written while this tab was open', () => {
    expect(pickersAfterSave({ newLatestVersionNumber: 5, missedVersionNumber: 4 })).toEqual({
      viewing: 5,
      baseline: 4
    });
  });
});

describe('seedLoadedVersionNumber', () => {
  it('seeds staff from the filtered latest content version', () => {
    expect(seedLoadedVersionNumber(true, 1002, 1003)).toBe(1002);
  });

  it('seeds a customer from the unfiltered latest so a pre-existing hidden staff draft is not a conflict', () => {
    // Customer filtered latest is 1000; unfiltered content is a hidden staff 1001.
    // Seeding from 1000 would make missedUnfilteredContent fire on first save.
    expect(seedLoadedVersionNumber(false, 1000, 1001)).toBe(1001);
  });

  it('falls back to the filtered latest when the unfiltered number is missing', () => {
    expect(seedLoadedVersionNumber(false, 1000, null)).toBe(1000);
  });
});
