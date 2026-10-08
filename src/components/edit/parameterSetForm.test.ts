import { describe, expect, it } from 'vitest';
import { lockedDragKeys, parameterSetPayload, usedByLabel } from './parameterSetForm';

describe('parameter set form', () => {
  it('locks exactly the parameters that came from the server (pin 2)', () => {
    expect([...lockedDragKeys([{ _dragKey: 'a', id: 'x' }, { _dragKey: 'b', id: 'y' }])]).toEqual(['a', 'b']);
  });

  it('requires a name and refuses ";" before the server does', () => {
    expect(parameterSetPayload({ name: ' ', description: '', parameters: [], tableDataText: {} }).errors).toEqual(['Name is required.']);
    expect(parameterSetPayload({ name: 'A; B', description: '', parameters: [], tableDataText: {} }).errors).toEqual(['A set name cannot contain ";".']);
  });

  it('builds the payload with prepared parameters, blank description as null', () => {
    const { payload, errors } = parameterSetPayload({ name: ' Buffers ', description: '', parameters: [{ _dragKey: 'k', id: '', name: 'Buffer volume', type: 'number' }], tableDataText: {} });
    expect(errors).toEqual([]);
    expect(payload).toEqual({ name: 'Buffers', description: null, parameters: [{ id: 'buffer_volume', name: 'Buffer volume', type: 'number' }] });
  });

  it('says how many operations use a set', () => {
    expect(usedByLabel(0)).toBe('Not used');
    expect(usedByLabel(1)).toBe('Used by 1 operation');
    expect(usedByLabel(3)).toBe('Used by 3 operations');
  });

  it('never renames a saved id when a new parameter collides with it (C4, pin 2)', () => {
    // A new 'Buffer volume' parameter added above the saved, locked 'Buffer volume'
    // derives the same id — the saved one (index 1) must keep it; the new one
    // (index 0) is the one renamed, to 'buffer_volume_2'.
    const saved: any = { _dragKey: 'saved-1', id: 'buffer_volume', name: 'Buffer volume', type: 'string' };
    const added: any = { _dragKey: 'new-1', id: '', name: 'Buffer volume', type: 'string' };
    const locked = lockedDragKeys([saved]);

    const { payload, errors } = parameterSetPayload({
      name: 'Buffers',
      description: '',
      parameters: [added, saved],
      tableDataText: {},
      isIdLocked: (p) => locked.has(p._dragKey)
    });

    expect(errors).toEqual([]);
    expect(payload!.parameters[1].id).toBe('buffer_volume'); // saved, untouched
    expect(payload!.parameters[0].id).toBe('buffer_volume_2'); // new, renamed
  });
  it('forwards the condition context, so a set parameter can name a parameter of another set', () => {
    const parameters = [{ _dragKey: 'a', id: 'kit', name: 'Kit', type: 'string', _showIfText: '"Cleanup"."Method"=="Column"' }];
    const cleanup = { id: 'set2', name: 'Cleanup', parameters: [{ id: 'method', name: 'Method', type: 'dropdown', options: [{ id: 'col', name: 'Column' }] }] };
    const withContext = parameterSetPayload({ name: 'Extraction', description: '', parameters, tableDataText: {}, conditionContext: { setId: 'set1', sets: [cleanup] } });
    expect(withContext.payload?.parameters[0].showIf).toEqual({ parameterId: 'method', parameterSetId: 'set2', op: 'eq', optionIds: ['col'] });
    expect(parameterSetPayload({ name: 'Extraction', description: '', parameters, tableDataText: {} }).errors).toEqual(['Parameter 1: Show only if - No parameter set is named “Cleanup”.']);
  });
});
