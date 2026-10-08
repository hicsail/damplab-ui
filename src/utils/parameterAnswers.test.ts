import { describe, expect, it } from 'vitest';
import { answerProblems, isCheckboxList, syncOtherTextEntries, toggleChecked, nodeAnswersComplete, requiredProblems } from './parameterAnswers';
import { withoutHiddenAnswers } from './parameterConditions';

const options = [{ id: 'bact', name: 'Bacteria' }, { id: 'oth', name: 'Other' }];
const parameters = [
  { id: 'cycles', name: 'Cycles', type: 'number', validation: '>0 && integer' },
  { id: 'vol', name: 'Volume', type: 'number', rangeValueMin: 1, rangeValueMax: 50 },
  { id: 'sample_type', name: 'Sample Type', type: 'dropdown', options },
  { id: 'tags', name: 'Tags', type: 'dropdown', allowMultipleValues: true, display: 'checkboxes', options }
];
const entry = (id: string, value: unknown, over: Record<string, unknown> = {}): any => {
  const def = parameters.find((p) => p.id === id);
  return { id, nodeId: 'n1', name: def?.name ?? id, type: def?.type ?? 'string', options: (def as any)?.options ?? null, value, ...over };
};

describe('answerProblems (rules 25, 27)', () => {
  it('is empty for a clean node', () => {
    expect(answerProblems([entry('cycles', 30), entry('vol', '25'), entry('sample_type', 'bact')], parameters)).toEqual({});
  });
  it('names the broken rule under the parameter id', () => {
    expect(answerProblems([entry('cycles', 0)], parameters)).toEqual({ cycles: 'Must be greater than 0' });
    expect(answerProblems([entry('cycles', '2.5')], parameters)).toEqual({ cycles: 'Must be a whole number' });
  });
  it('enforces a legacy min/max', () => {
    expect(answerProblems([entry('vol', 51)], parameters)).toEqual({ vol: 'Must be at most 50' });
  });
  it('ignores an empty number', () => {
    expect(answerProblems([entry('cycles', ''), entry('vol', null)], parameters)).toEqual({});
  });
  it('reads the rule from the node definition, not the form entry — entries do not carry it', () => {
    expect(answerProblems([entry('cycles', 0)], [])).toEqual({});
    expect(answerProblems([entry('cycles', 0)], undefined)).toEqual({});
  });
  it('asks for the Other text under the companion id, single and multi', () => {
    expect(answerProblems([entry('sample_type', 'oth')], parameters)).toEqual({ sample_type__otherText: 'Please specify “Other”' });
    expect(answerProblems([entry('tags', ['bact', 'oth']), { id: 'tags__otherText', value: '  ' }], parameters)).toEqual({ tags__otherText: 'Please specify “Other”' });
    expect(answerProblems([entry('sample_type', 'oth'), { id: 'sample_type__otherText', value: 'Yeast' }], parameters)).toEqual({});
  });
  it('skips result parameters', () => {
    expect(answerProblems([entry('cycles', 0, { paramType: 'result' })], parameters)).toEqual({});
  });
});

describe('syncOtherTextEntries (rule 27)', () => {
  it('adds the companion directly after the answer that selects Other', () => {
    const out = syncOtherTextEntries([entry('sample_type', 'oth'), entry('cycles', 3)], { sample_type__otherText: 'Yeast' });
    expect(out.map((e) => e.id)).toEqual(['sample_type', 'sample_type__otherText', 'cycles']);
    expect(out[1]).toMatchObject({ id: 'sample_type__otherText', nodeId: 'n1', name: 'Sample Type (Other)', type: 'string', paramType: 'input', value: 'Yeast', required: false });
  });
  it('adds an empty companion while the text is still blank', () => {
    const out = syncOtherTextEntries([entry('sample_type', 'oth')], {});
    expect(out[1]).toMatchObject({ id: 'sample_type__otherText', value: '' });
  });
  it('drops the companion — and so its text — when Other is no longer selected', () => {
    const out = syncOtherTextEntries([entry('sample_type', 'bact'), { id: 'sample_type__otherText', value: 'Yeast' }], { sample_type__otherText: 'Yeast' });
    expect(out.map((e) => e.id)).toEqual(['sample_type']);
  });
  it('never duplicates a companion that is already there', () => {
    const out = syncOtherTextEntries([entry('sample_type', 'oth'), { id: 'sample_type__otherText', value: 'old' }], { sample_type__otherText: 'new' });
    expect(out.map((e) => e.id)).toEqual(['sample_type', 'sample_type__otherText']);
    expect(out[1].value).toBe('new');
  });
});

describe('checkbox list helpers (rule 30)', () => {
  it('ticks and unticks, dropping the blank placeholder a multi-value answer starts with', () => {
    expect(toggleChecked([''], 'bact', true)).toEqual(['bact']);
    expect(toggleChecked(['bact'], 'oth', true)).toEqual(['bact', 'oth']);
    expect(toggleChecked(['bact', 'oth'], 'bact', false)).toEqual(['oth']);
    expect(toggleChecked(['bact'], 'bact', true)).toEqual(['bact']);
    expect(toggleChecked(undefined, 'bact', false)).toEqual([]);
  });
  it('is a checkbox list only for a dropdown whose definition says display: checkboxes', () => {
    expect(isCheckboxList(entry('tags', []), parameters[3])).toBe(true);
    expect(isCheckboxList(entry('sample_type', ''), parameters[2])).toBe(false);
    expect(isCheckboxList(entry('tags', []), undefined)).toBe(false);
    expect(isCheckboxList({ ...entry('tags', []), type: 'string' }, parameters[3])).toBe(false);
  });
});

describe('hidden parameters raise nothing (show-only-if rule 16)', () => {
  const options = [{ id: 'bact', name: 'Bacteria' }, { id: 'yeast', name: 'Yeast' }, { id: 'oth', name: 'Other' }];
  const isBacteria = { parameterId: 'kind', op: 'eq', optionIds: ['bact'] };
  const parameters = [
    { id: 'kind', name: 'Kind', type: 'dropdown', options },
    { id: 'cycles', name: 'Cycles', type: 'number', validation: '>0', showIf: isBacteria },
    { id: 'lysis', name: 'Lysis', type: 'dropdown', options, showIf: isBacteria },
    { id: 'kit', name: 'Kit', type: 'string', showIf: isBacteria },
    { id: 'files', name: 'Maps', type: 'file', allowMultipleValues: true, showIf: isBacteria }
  ];
  const form = (kind: string): any[] => [
    { id: 'kind', type: 'dropdown', options, value: kind, required: true },
    { id: 'cycles', type: 'number', value: 0, required: true },
    { id: 'lysis', type: 'dropdown', options, value: 'oth', required: true },
    { id: 'kit', type: 'string', value: '', required: true },
    { id: 'files', type: 'file', value: [], required: true, allowMultipleValues: true }
  ];
  const valuesOf = (formData: any[]): Record<string, any> => Object.fromEntries(formData.map((e) => [e.id, e.value]));

  it('requiredProblems: one message per empty required entry it is given', () => {
    const shown = form('bact');
    expect(requiredProblems(shown, valuesOf(shown))).toEqual({ kit: 'Required', files: 'Required (at least one value)' });
    expect(requiredProblems(shown, { ...valuesOf(shown), kit: 'K', files: [{}] })).toEqual({});
    expect(requiredProblems([{ id: 'sheet', type: 'sampleSheet', value: null, required: true }, { id: 'opt', type: 'string', value: '', required: false }], { sheet: null, opt: '' })).toEqual({ sheet: 'Required' });
  });

  it('the form: a hidden parameter is neither required, nor range-checked, nor asked for "Other" text', () => {
    const shown = withoutHiddenAnswers(parameters, form('yeast'));
    expect(shown.map((e: any) => e.id)).toEqual(['kind']);
    expect(requiredProblems(shown, valuesOf(form('yeast')))).toEqual({});
    expect(answerProblems(shown, parameters)).toEqual({});
    // The same answers with the condition true raise all three kinds.
    const visible = withoutHiddenAnswers(parameters, form('bact'));
    expect(Object.keys(requiredProblems(visible, valuesOf(form('bact'))))).toEqual(['kit', 'files']);
    expect(answerProblems(visible, parameters)).toEqual({ cycles: 'Must be greater than 0', lysis__otherText: 'Please specify “Other”' });
  });

  it('the node badge: hidden parameters do not count against completeness', () => {
    expect(nodeAnswersComplete(form('yeast'), parameters)).toBe(true);
    expect(nodeAnswersComplete(form('bact'), parameters)).toBe(false);
    expect(nodeAnswersComplete([{ id: 'kind', type: 'dropdown', options, value: '', required: true }], parameters)).toBe(false);
    expect(nodeAnswersComplete(null, parameters)).toBe(true);
  });

  it('the node badge: a required result parameter still needs its alternative, and a broken rule still flags', () => {
    expect(nodeAnswersComplete([{ id: 'r', paramType: 'result', value: false, required: true, resultParamValue: '' }], [])).toBe(false);
    expect(nodeAnswersComplete([{ id: 'r', paramType: 'result', value: true, required: true, resultParamValue: '' }], [])).toBe(true);
    expect(nodeAnswersComplete([{ id: 'n', type: 'number', value: -1 }], [{ id: 'n', type: 'number', validation: '>0' }])).toBe(false);
  });
});
