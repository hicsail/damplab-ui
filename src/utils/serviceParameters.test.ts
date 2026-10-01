import { describe, expect, it } from 'vitest';
import {
  idsFromSetRefs,
  orderedSetRefs,
  overridingSetName,
  ownParametersOf,
  setParameterRows,
  setRefsForIds,
  setRefsFrom
} from './serviceParameters';

describe('ownParametersOf', () => {
  it('prefers the stored own list', () => {
    expect(ownParametersOf({ ownParameters: [{ id: 'a' }], parameters: [{ id: 'a' }, { id: 'b', fromParameterSetId: 's' }] })).toEqual([{ id: 'a' }]);
  });
  it('falls back to parameters minus set-derived entries (a response from before the field existed)', () => {
    expect(ownParametersOf({ parameters: [{ id: 'a' }, { id: 'b', fromParameterSetId: 's' }] })).toEqual([{ id: 'a' }]);
  });
  it('is empty for nothing', () => {
    expect(ownParametersOf(undefined)).toEqual([]);
  });
});

describe('setRefsFrom', () => {
  it('maps parameterSets rows to id/name refs', () => {
    expect(setRefsFrom({ parameterSets: [{ id: 1, name: 'Buffers', parameters: [{ id: 'a' }] }] })).toEqual([
      { id: '1', name: 'Buffers' }
    ]);
  });

  it('includes parameters when asked', () => {
    expect(setRefsFrom({ parameterSets: [{ id: 1, name: 'Buffers', parameters: [{ id: 'a' }] }] }, { withParameters: true })).toEqual([
      { id: '1', name: 'Buffers', parameters: [{ id: 'a' }] }
    ]);
  });

  it('is empty when parameterSets is absent', () => {
    expect(setRefsFrom(undefined)).toEqual([]);
    expect(setRefsFrom({})).toEqual([]);
  });
});

const sets = [
  { id: 's1', name: 'Buffers', parameters: [{ id: 'buffer', name: 'Buffer' }, { id: 'volume', name: 'Volume' }] },
  { id: 's2', name: 'Cleanup', parameters: [{ id: 'kit', name: 'Kit' }] }
];

describe('orderedSetRefs', () => {
  it('keeps the operation order and drops ids that no longer resolve (display only)', () => {
    expect(orderedSetRefs(['s2', 'gone', 's1'], sets).map((s) => s.name)).toEqual(['Cleanup', 'Buffers']);
  });
});

describe('the operation page keeps set ids, not refs (pin 3)', () => {
  it('an id whose set has not loaded (or failed to) survives a round trip unchanged', () => {
    expect(idsFromSetRefs(setRefsForIds(['s2', 'not-loaded', 's1'], sets))).toEqual(['s2', 'not-loaded', 's1']);
    expect(idsFromSetRefs(setRefsForIds(['s1', 's2'], []))).toEqual(['s1', 's2']);
  });

  it('labels resolved ids by name, in the chosen order', () => {
    expect(setRefsForIds(['s2', 's1'], sets).map((s) => s.name)).toEqual(['Cleanup', 'Buffers']);
  });
});

describe('set parameters on the parameter page (pin 10)', () => {
  it('lists every set parameter by set, marking the ones an own parameter overrides', () => {
    const rows = setParameterRows(['s1', 's2'], sets, [{ id: 'volume' }]);
    expect(rows.map((r) => [r.setName, r.parameter.id, r.overriddenByOwn])).toEqual([
      ['Buffers', 'buffer', false],
      ['Buffers', 'volume', true],
      ['Cleanup', 'kit', false]
    ]);
  });

  it('names the set an own parameter overrides', () => {
    expect(overridingSetName({ id: 'volume' }, ['s1', 's2'], sets)).toBe('Buffers');
    expect(overridingSetName({ id: 'cycles' }, ['s1'], sets)).toBeUndefined();
  });
});
