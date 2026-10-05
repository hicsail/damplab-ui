import { describe, expect, it } from 'vitest';
import { readStoredEditType, storeEditType } from './editTypeStorage';

const fakeStore = (initial: Record<string, string> = {}) => {
  const data = { ...initial };
  return { data, getItem: (k: string) => data[k] ?? null, setItem: (k: string, v: string) => { data[k] = v; } };
};

describe('remembering the Catalog Editor view', () => {
  it('reads back the view that was stored', () => {
    const store = fakeStore();
    storeEditType('Inventory', store);
    expect(readStoredEditType(store)).toBe('Inventory');
  });

  it('is null when nothing was stored', () => {
    expect(readStoredEditType(fakeStore())).toBeNull();
  });

  it('ignores a stored value that is not one of the views', () => {
    expect(readStoredEditType(fakeStore({ 'catalogEditor:editType': 'Robots' }))).toBeNull();
  });

  it('survives storage that throws or is missing', () => {
    const broken = { getItem: () => { throw new Error('blocked'); }, setItem: () => { throw new Error('full'); } };
    expect(readStoredEditType(broken)).toBeNull();
    expect(() => storeEditType('Bundles', broken)).not.toThrow();
    expect(readStoredEditType(null)).toBeNull();
  });
});
