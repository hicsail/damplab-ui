import { describe, expect, it } from 'vitest';
import { ownParametersOf, setRefsFrom } from './serviceParameters';

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
