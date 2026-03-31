import { describe, expect, it } from 'vitest';
import { isRecentIso } from './time';

describe('isRecentIso', () => {
  it('returns false for invalid ISO', () => {
    expect(isRecentIso('nope', 5 * 60 * 1000, Date.parse('2026-01-01T00:00:00Z'))).toBe(false);
  });

  it('returns true when within the window', () => {
    const now = Date.parse('2026-01-01T00:10:00Z');
    const iso = '2026-01-01T00:06:00Z';
    expect(isRecentIso(iso, 5 * 60 * 1000, now)).toBe(true);
  });

  it('returns false when outside the window', () => {
    const now = Date.parse('2026-01-01T00:10:00Z');
    const iso = '2026-01-01T00:04:59Z';
    expect(isRecentIso(iso, 5 * 60 * 1000, now)).toBe(false);
  });
});

