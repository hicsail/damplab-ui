import { describe, expect, it } from 'vitest';
import { ConditionContext, showIfError, showIfText, showIfWarning } from './showIfField';

const sample = { id: 'sample', name: 'Sample Type', type: 'dropdown', options: [{ id: 'bact', name: 'Bacteria' }] };
const extraction = { id: 'set1', name: 'Extraction', parameters: [sample] };
const onOperation: ConditionContext = { sets: [extraction] };
const stored = { parameterId: 'sample', parameterSetId: 'set1', op: 'eq', optionIds: ['bact'] };

describe('the "Show only if" field (rules 30–32)', () => {
  it('shows the stored condition as text, with current names', () => {
    expect(showIfText([{ id: 'kit', name: 'Kit', type: 'string', showIf: stored }], 0, onOperation)).toBe('"Extraction"."Sample Type"=="Bacteria"');
    expect(showIfText([{ id: 'kit', name: 'Kit', type: 'string' }], 0, onOperation)).toBe('');
    expect(showIfText([], 0, onOperation)).toBe('');
  });

  it('shows what is being typed, exactly as typed', () => {
    expect(showIfText([{ id: 'kit', name: 'Kit', showIf: stored, _showIfText: '"Extraction"."Sample' }], 0, onOperation)).toBe('"Extraction"."Sample');
    expect(showIfText([{ id: 'kit', name: 'Kit', showIf: stored, _showIfText: '' }], 0, onOperation)).toBe('');
  });

  it('reports a rule-6 error for typed text, and none for a stored condition or a cleared field', () => {
    const list = [sample, { id: 'kit', name: 'Kit', type: 'string', _showIfText: '"Sample Type"=="Fungi"' }];
    expect(showIfError(list, 1, { setId: 'set1', sets: [] })).toBe('“Fungi” is not an option of “Sample Type”.');
    expect(showIfError([sample, { id: 'kit', name: 'Kit', _showIfText: '"Sample Type"=="Bacteria"' }], 1, { setId: 'set1', sets: [] })).toBeNull();
    expect(showIfError([sample, { id: 'kit', name: 'Kit', _showIfText: '' }], 1, onOperation)).toBeNull();
    expect(showIfError([{ id: 'kit', name: 'Kit', showIf: { parameterId: 'gone', op: 'eq', value: 'x' } }], 0, onOperation)).toBeNull();
  });

  it('warns — without an error — when a stored condition no longer resolves, naming what is missing', () => {
    const orphan = [{ id: 'kit', name: 'Kit', type: 'string', showIf: { parameterId: 'sample', parameterSetId: 'deleted-set', op: 'eq', optionIds: ['bact'] } }];
    expect(showIfWarning(orphan, 0, onOperation)).toBe('This condition refers to a parameter set that no longer exists. Until it is corrected the parameter is always shown.');
    expect(showIfError(orphan, 0, onOperation)).toBeNull();
    expect(showIfWarning([{ id: 'kit', name: 'Kit', showIf: stored }], 0, onOperation)).toBeNull();
    // The parameter it names is still there, but is no longer a dropdown: the stored option means nothing.
    const retyped = [{ ...sample, type: 'string' }, { id: 'kit', name: 'Kit', type: 'string', showIf: { parameterId: 'sample', op: 'eq', optionIds: ['bact'] } }];
    expect(showIfWarning(retyped, 1, { setId: 'set1', sets: [] })).toBe('This condition refers to “Sample Type”, whose answer format has changed since. Until it is corrected the parameter is always shown.');
    // Once the field is being edited the typed text is what counts.
    expect(showIfWarning([{ ...orphan[0], _showIfText: '' }], 0, onOperation)).toBeNull();
  });
});
