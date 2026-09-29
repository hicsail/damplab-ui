import { describe, expect, it } from 'vitest';
import { prepareParametersForSave, withDragKeys } from './parameterSave';

describe('prepareParametersForSave', () => {
  it('strips drag keys, fills a blank id from the name, and de-duplicates ids', () => {
    const { parameters, errors } = prepareParametersForSave(
      [
        { _dragKey: 'k1', id: '', name: 'Sample count', type: 'number' },
        { _dragKey: 'k2', id: 'sample_count', name: 'Other', type: 'string' }
      ],
      {}
    );
    expect(errors).toEqual([]);
    expect(parameters.map((p) => p.id)).toEqual(['sample_count', 'sample_count_2']);
    expect(parameters[0]).not.toHaveProperty('_dragKey');
  });

  it('parses table JSON by row index and reports bad JSON', () => {
    const ok = prepareParametersForSave([{ _dragKey: 'k', id: 't', name: 'T', type: 'table' }], { 0: '{"columns":[]}' });
    expect(ok.parameters[0].tableData).toEqual({ columns: [] });
    const bad = prepareParametersForSave([{ _dragKey: 'k', id: 't', name: 'T', type: 'table' }], { 0: '{' });
    expect(bad.errors).toContain('Parameter 1 table setup must be valid JSON.');
  });

  it('reports validation errors with the parameter number', () => {
    const { errors } = prepareParametersForSave([{ _dragKey: 'k', id: '', name: '', type: 'string' }], {});
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/^Parameter 1: /);
  });

  it('reserves a locked id first, so a new unlocked parameter that derives the same id is the one renamed', () => {
    // The new row's id is 'buffer_volume' here because the Name field's onChange
    // derives it from the name as the person types — not because it starts blank.
    const isIdLocked = (p: { _dragKey: string }) => p._dragKey === 'saved';
    const { parameters, errors } = prepareParametersForSave(
      [
        { _dragKey: 'new', id: 'buffer_volume', name: 'Buffer volume', type: 'number' },
        { _dragKey: 'saved', id: 'buffer_volume', name: 'Buffer volume', type: 'number' }
      ],
      {},
      isIdLocked
    );
    expect(errors).toEqual([]);
    expect(parameters.map((p) => p.id)).toEqual(['buffer_volume_2', 'buffer_volume']);
  });

  it('with no isIdLocked argument, behaves exactly as before (no reservation)', () => {
    const { parameters } = prepareParametersForSave(
      [
        { _dragKey: 'a', id: '', name: 'Buffer volume', type: 'number' },
        { _dragKey: 'b', id: 'buffer_volume', name: 'Buffer volume', type: 'number' }
      ],
      {}
    );
    expect(parameters.map((p) => p.id)).toEqual(['buffer_volume', 'buffer_volume_2']);
  });
});

describe('withDragKeys', () => {
  it('gives every parameter a distinct drag key without touching its fields', () => {
    const out = withDragKeys([{ id: 'a' }, { id: 'b' }]);
    expect(out.map((p) => p.id)).toEqual(['a', 'b']);
    expect(new Set(out.map((p) => p._dragKey)).size).toBe(2);
  });
});
