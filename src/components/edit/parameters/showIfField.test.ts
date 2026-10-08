import { describe, expect, it } from 'vitest';
import { ConditionContext, effectiveShowIfSummary, showIfError, showIfSummary, showIfText, showIfWarning, withShowIfSummary } from './showIfField';

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
    expect(showIfWarning(orphan, 0, onOperation)).toBe('This condition refers to a parameter set that no longer exists (id deleted-set). Until it is corrected the parameter is always shown.');
    expect(showIfError(orphan, 0, onOperation)).toBeNull();
    expect(showIfWarning([{ id: 'kit', name: 'Kit', showIf: stored }], 0, onOperation)).toBeNull();
    // The parameter it names is still there, but is no longer a dropdown: the stored option means nothing.
    const retyped = [{ ...sample, type: 'string' }, { id: 'kit', name: 'Kit', type: 'string', showIf: { parameterId: 'sample', op: 'eq', optionIds: ['bact'] } }];
    expect(showIfWarning(retyped, 1, { setId: 'set1', sets: [] })).toBe('This condition refers to “Sample Type”, whose answer format has changed since. Until it is corrected the parameter is always shown.');
    // Once the field is being edited the typed text is what counts.
    expect(showIfWarning([{ ...orphan[0], _showIfText: '' }], 0, onOperation)).toBeNull();
  });
});

describe('read-only views of a parameter (rule 33)', () => {
  it('showIfSummary writes the condition for a set parameter listed on an operation page', () => {
    const kit = { id: 'kit', name: 'Kit', type: 'string', showIf: { parameterId: 'sample', op: 'eq', optionIds: ['bact'] } };
    expect(showIfSummary(kit.showIf, { list: [sample, kit], setId: 'set1', sets: [extraction] })).toBe('Show only if: "Sample Type"=="Bacteria"');
    expect(showIfSummary(undefined, { list: [sample], setId: 'set1', sets: [] })).toBeNull();
  });

  it('effectiveShowIfSummary reads an operation’s effective list (the staff catalog dialog)', () => {
    const effective = [
      { id: 'polymerase', name: 'Polymerase', type: 'string', showIf: stored },
      { ...sample, fromParameterSetId: 'set1', fromParameterSetName: 'Extraction' }
    ];
    expect(effectiveShowIfSummary(effective[0], effective)).toBe('Show only if: "Extraction"."Sample Type"=="Bacteria"');
    expect(effectiveShowIfSummary(effective[1], effective)).toBeNull();
  });

  it('withShowIfSummary appends the line to whatever the view already shows', () => {
    expect(withShowIfSummary('In µL', 'Show only if: "A"==1')).toBe('In µL — Show only if: "A"==1');
    expect(withShowIfSummary(undefined, 'Show only if: "A"==1')).toBe('Show only if: "A"==1');
    expect(withShowIfSummary('number', null)).toBe('number');
    expect(withShowIfSummary(undefined, null)).toBeUndefined();
  });
});

describe('the field and Save agree (review M1)', () => {
  const a = { id: 'a', name: 'A', type: 'string' };
  const b = { id: 'b', name: 'B', type: 'string' };

  it('does not report a loop that Save would accept: the sibling’s stored condition is being cleared', () => {
    const list = [{ ...a, showIf: { parameterId: 'b', op: 'eq', value: 'x' }, _showIfText: '' }, { ...b, _showIfText: '"A"=="x"' }];
    expect(showIfError(list, 1, { sets: [] })).toBeNull();
  });

  it('reports a loop among the typed texts, on the parameter Save would refuse', () => {
    const list = [{ ...a, _showIfText: '"B"=="x"' }, { ...b, _showIfText: '"A"=="x"' }];
    expect(showIfError(list, 0, { sets: [] })).toBeNull();
    expect(showIfError(list, 1, { sets: [] })).toBe('This condition would form a loop: the parameter it depends on depends, in turn, on this one.');
  });

  it('a sibling’s untouched stored condition still counts', () => {
    const list = [{ ...a, showIf: { parameterId: 'b', op: 'eq', value: 'x' } }, { ...b, _showIfText: '"A"=="x"' }];
    expect(showIfError(list, 1, { sets: [] })).toMatch(/loop/);
  });
});

describe('a warning names the id of what is gone (review F11)', () => {
  it('says which parameter is missing once it is deleted, while the field text stays "<missing>"', () => {
    const list = [{ id: 'kit', name: 'Kit', type: 'string', showIf: { parameterId: 'deleted-param', op: 'eq', value: 'x' } }];
    expect(showIfWarning(list, 0, { sets: [] })).toBe('This condition refers to a parameter that no longer exists (id deleted-param). Until it is corrected the parameter is always shown.');
    expect(showIfText(list, 0, { sets: [] })).toBe('"<missing>"=="x"');
  });
});
