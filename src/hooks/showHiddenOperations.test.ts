import { describe, expect, it } from 'vitest';
import { readShowHidden, SHOW_HIDDEN_OPERATIONS_KEY, writeShowHidden } from './useShowHiddenOperations';

const memory = (): Storage => {
  const data = new Map<string, string>();
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) } as unknown as Storage;
};
const broken = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } } as unknown as Storage;

describe('show-hidden toggle storage (pin 19)', () => {
  it('defaults to off', () => {
    expect(readShowHidden(memory())).toBe(false);
    expect(readShowHidden(undefined)).toBe(false);
  });

  it('remembers the viewer’s choice', () => {
    const s = memory();
    writeShowHidden(s, true);
    expect(s.getItem(SHOW_HIDDEN_OPERATIONS_KEY)).toBe('true');
    expect(readShowHidden(s)).toBe(true);
  });

  it('survives storage that throws (private window, blocked site data)', () => {
    expect(readShowHidden(broken)).toBe(false);
    expect(() => writeShowHidden(broken, true)).not.toThrow();
  });
});
