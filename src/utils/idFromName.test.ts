import { describe, expect, it } from 'vitest';
import { idFromName, makeUniqueIds } from './idFromName';

describe('idFromName', () => {
  it('lowercases, trims, and turns whitespace runs into underscores', () => {
    expect(idFromName('  Sample Count  ')).toBe('sample_count');
    expect(idFromName('Buffer   Volume')).toBe('buffer_volume');
  });

  it('is empty for a blank or missing name', () => {
    expect(idFromName('')).toBe('');
    expect(idFromName(undefined as unknown as string)).toBe('');
  });
});

describe('makeUniqueIds', () => {
  it('keeps the first occurrence of an id and suffixes later collisions', () => {
    const out = makeUniqueIds([{ id: 'a', name: 'A' }, { id: 'a', name: 'A2' }, { id: 'a', name: 'A3' }]);
    expect(out.map((p) => p.id)).toEqual(['a', 'a_2', 'a_3']);
  });

  it('derives a blank id from the name', () => {
    const out = makeUniqueIds([{ id: '', name: 'Sample Count' }]);
    expect(out[0].id).toBe('sample_count');
  });

  it('leaves an item unchanged (same reference) when its id is already unique', () => {
    const item = { id: 'a', name: 'A' };
    const out = makeUniqueIds([item]);
    expect(out[0]).toBe(item);
  });

  it('with no reserved argument, behaves exactly as before that parameter existed', () => {
    const out = makeUniqueIds([{ id: 'a', name: 'A' }, { id: 'a', name: 'A2' }]);
    expect(out.map((p) => p.id)).toEqual(['a', 'a_2']);
  });

  it('seeds the used-id set from reserved, so the first item colliding with a reserved id is suffixed', () => {
    const out = makeUniqueIds([{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }], ['a']);
    expect(out.map((p) => p.id)).toEqual(['a_2', 'b']);
  });

  it('reserved ids do not themselves appear in the input and are not affected', () => {
    // Reserved seeds the used set only — it does not add entries to the output.
    const out = makeUniqueIds([{ id: 'x', name: 'X' }], ['a', 'b']);
    expect(out.map((p) => p.id)).toEqual(['x']);
  });
});
