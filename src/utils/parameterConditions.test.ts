import { describe, expect, it } from 'vitest';
import { comparisonFits, hiddenParameterIds, resetHiddenValues, snapshotWithoutHiddenAnswers, visibleParameterIds, withoutHiddenAnswers } from './parameterConditions';

/**
 * SHARED VECTORS — the same table, character for character, is in
 * damplab-backend/src/services/parameter-conditions.spec.ts. A change here is a change there.
 */
const SAMPLE = {
  id: 'sample',
  name: 'Sample Type',
  type: 'dropdown',
  options: [
    { id: 'bact', name: 'Bacteria' },
    { id: 'yeast', name: 'Yeast cells' },
    { id: 'oth', name: 'Other' }
  ]
};
const TAGS = { ...SAMPLE, id: 'tags', name: 'Tags', allowMultipleValues: true };
const HOT = { id: 'hot', name: 'Hot start', type: 'boolean' };
const CYCLES = { id: 'cycles', name: 'Cycles', type: 'number' };
const NOTE = { id: 'note', name: 'Note', type: 'string' };
const target = (showIf: unknown, over: Record<string, unknown> = {}): any => ({ id: 't', name: 'Target', type: 'string', showIf, ...over });
const sampleIs = (...optionIds: string[]): any => ({ parameterId: 'sample', op: optionIds.length > 1 ? 'in' : 'eq', optionIds });

const VECTORS: Array<{ name: string; parameters: any[]; formData: unknown; visible: string[] }> = [
  { name: 'no condition is visible', parameters: [NOTE], formData: [], visible: ['note'] },
  { name: 'dropdown eq: chosen option is the stored id', parameters: [SAMPLE, target(sampleIs('bact'))], formData: [{ id: 'sample', value: 'bact' }], visible: ['sample', 't'] },
  { name: 'dropdown eq: another option', parameters: [SAMPLE, target(sampleIs('bact'))], formData: [{ id: 'sample', value: 'yeast' }], visible: ['sample'] },
  { name: 'dropdown eq: unanswered (absent)', parameters: [SAMPLE, target(sampleIs('bact'))], formData: [], visible: ['sample'] },
  {
    name: 'dropdown ne: unanswered is false too',
    parameters: [SAMPLE, target({ parameterId: 'sample', op: 'ne', optionIds: ['bact'] })],
    formData: [{ id: 'sample', value: '  ' }],
    visible: ['sample']
  },
  {
    name: 'dropdown ne: answered and not that option',
    parameters: [SAMPLE, target({ parameterId: 'sample', op: 'ne', optionIds: ['bact'] })],
    formData: [{ id: 'sample', value: 'yeast' }],
    visible: ['sample', 't']
  },
  {
    name: 'dropdown in: any chosen option is listed',
    parameters: [TAGS, target({ parameterId: 'tags', op: 'in', optionIds: ['bact', 'oth'] })],
    formData: [{ id: 'tags', value: ['yeast', 'oth'] }],
    visible: ['tags', 't']
  },
  { name: "multi dropdown: [''] is unanswered", parameters: [TAGS, target({ parameterId: 'tags', op: 'ne', optionIds: ['bact'] })], formData: [{ id: 'tags', value: [''] }], visible: ['tags'] },
  {
    name: 'multi dropdown ne: one of the chosen is that option',
    parameters: [TAGS, target({ parameterId: 'tags', op: 'ne', optionIds: ['bact'] })],
    formData: [{ id: 'tags', value: ['yeast', 'bact'] }],
    visible: ['tags']
  },
  {
    name: 'dropdown includes: on the option name, case-insensitive',
    parameters: [SAMPLE, target({ parameterId: 'sample', op: 'includes', value: 'CELL' })],
    formData: [{ id: 'sample', value: 'yeast' }],
    visible: ['sample', 't']
  },
  {
    name: 'dropdown includes: the typed "Other" text is not consulted',
    parameters: [SAMPLE, target({ parameterId: 'sample', op: 'includes', value: 'cell' })],
    formData: [
      { id: 'sample', value: 'oth' },
      { id: 'sample__otherText', value: 'plant cells' }
    ],
    visible: ['sample']
  },
  { name: 'yes/no == false holds for a box never touched', parameters: [HOT, target({ parameterId: 'hot', op: 'eq', value: false })], formData: [], visible: ['hot', 't'] },
  { name: 'yes/no == true', parameters: [HOT, target({ parameterId: 'hot', op: 'eq', value: true })], formData: [{ id: 'hot', value: true }], visible: ['hot', 't'] },
  { name: 'yes/no == true, unticked', parameters: [HOT, target({ parameterId: 'hot', op: 'eq', value: true })], formData: [{ id: 'hot', value: '' }], visible: ['hot'] },
  { name: 'number: 5 equals "5"', parameters: [CYCLES, target({ parameterId: 'cycles', op: 'eq', value: 5 })], formData: [{ id: 'cycles', value: '5' }], visible: ['cycles', 't'] },
  { name: 'number: > compares numerically', parameters: [CYCLES, target({ parameterId: 'cycles', op: 'gt', value: 9 })], formData: [{ id: 'cycles', value: '10' }], visible: ['cycles', 't'] },
  {
    name: 'number: a value that is not a number is false, != included',
    parameters: [CYCLES, target({ parameterId: 'cycles', op: 'ne', value: 5 })],
    formData: [{ id: 'cycles', value: 'abc' }],
    visible: ['cycles']
  },
  { name: 'number: <= on the boundary', parameters: [CYCLES, target({ parameterId: 'cycles', op: 'le', value: 10 })], formData: [{ id: 'cycles', value: 10 }], visible: ['cycles', 't'] },
  { name: 'text eq: trimmed, case-insensitive', parameters: [NOTE, target({ parameterId: 'note', op: 'eq', value: 'Rush' })], formData: [{ id: 'note', value: '  rush ' }], visible: ['note', 't'] },
  { name: 'text in', parameters: [NOTE, target({ parameterId: 'note', op: 'in', values: ['a', 'B'] })], formData: [{ id: 'note', value: 'b' }], visible: ['note', 't'] },
  { name: 'text includes: substring', parameters: [NOTE, target({ parameterId: 'note', op: 'includes', value: 'USH' })], formData: [{ id: 'note', value: 'rush job' }], visible: ['note', 't'] },
  {
    name: 'multi text: any value satisfies',
    parameters: [{ ...NOTE, allowMultipleValues: true }, target({ parameterId: 'note', op: 'eq', value: 'b' })],
    formData: [{ id: 'note', value: ['a', 'B'] }],
    visible: ['note', 't']
  },
  {
    name: 'multi text ne: answered and none equals',
    parameters: [{ ...NOTE, allowMultipleValues: true }, target({ parameterId: 'note', op: 'ne', value: 'b' })],
    formData: [{ id: 'note', value: ['a', 'b'] }],
    visible: ['note']
  },
  {
    name: '&&: every part',
    parameters: [SAMPLE, HOT, target({ all: [sampleIs('bact'), { parameterId: 'hot', op: 'eq', value: true }] })],
    formData: [{ id: 'sample', value: 'bact' }],
    visible: ['sample', 'hot']
  },
  {
    name: '||: any part',
    parameters: [SAMPLE, HOT, target({ any: [sampleIs('bact'), { parameterId: 'hot', op: 'eq', value: true }] })],
    formData: [{ id: 'sample', value: 'bact' }],
    visible: ['sample', 'hot', 't']
  },
  {
    name: 'a hidden controller is unanswered, whatever is stored for it (cascade)',
    parameters: [SAMPLE, { ...NOTE, showIf: sampleIs('bact') }, target({ parameterId: 'note', op: 'eq', value: 'x' })],
    formData: [
      { id: 'sample', value: 'yeast' },
      { id: 'note', value: 'x' }
    ],
    visible: ['sample']
  },
  {
    name: 'a hidden yes/no controller is unanswered: == false does not hold',
    parameters: [SAMPLE, { ...HOT, showIf: sampleIs('bact') }, target({ parameterId: 'hot', op: 'eq', value: false })],
    formData: [{ id: 'sample', value: 'yeast' }],
    visible: ['sample']
  },
  { name: 'unresolved: the controlling parameter was deleted', parameters: [target(sampleIs('bact'))], formData: [], visible: ['t'] },
  { name: 'unresolved: the option was deleted', parameters: [SAMPLE, target(sampleIs('gone'))], formData: [{ id: 'sample', value: 'yeast' }], visible: ['sample', 't'] },
  {
    name: 'unresolved: one unresolved part shows the parameter even inside &&',
    parameters: [SAMPLE, target({ all: [sampleIs('bact'), { parameterId: 'deleted', op: 'eq', value: 'x' }] })],
    formData: [{ id: 'sample', value: 'yeast' }],
    visible: ['sample', 't']
  },
  {
    name: 'unresolved: the controller is no longer a dropdown, so stored option ids mean nothing',
    parameters: [{ ...NOTE, id: 'sample' }, target(sampleIs('bact'))],
    formData: [{ id: 'sample', value: 'yeast' }],
    visible: ['sample', 't']
  },
  {
    name: 'unresolved: the controller is no longer a yes/no',
    parameters: [{ ...NOTE, id: 'hot' }, target({ parameterId: 'hot', op: 'eq', value: true })],
    formData: [{ id: 'hot', value: 'no' }],
    visible: ['hot', 't']
  },
  {
    name: 'unresolved: > on a controller that is no longer a number',
    parameters: [{ ...NOTE, id: 'cycles' }, target({ parameterId: 'cycles', op: 'gt', value: 9 })],
    formData: [{ id: 'cycles', value: '1' }],
    visible: ['cycles', 't']
  },
  {
    name: 'unresolved: the controller became a file upload',
    parameters: [{ id: 'note', name: 'Note', type: 'file' }, target({ parameterId: 'note', op: 'eq', value: 'x' })],
    formData: [],
    visible: ['note', 't']
  },
  {
    name: 'unresolved: text stored for a controller that is now a dropdown',
    parameters: [SAMPLE, target({ parameterId: 'sample', op: 'eq', value: 'Bacteria' })],
    formData: [{ id: 'sample', value: 'yeast' }],
    visible: ['sample', 't']
  },
  {
    name: 'unresolved: the condition names a set this operation does not use',
    parameters: [SAMPLE, target({ parameterId: 'sample', parameterSetId: 'setX', op: 'eq', optionIds: ['bact'] })],
    formData: [{ id: 'sample', value: 'yeast' }],
    visible: ['sample', 't']
  },
  {
    name: 'qualified reference: an own parameter names a set parameter',
    parameters: [target({ parameterId: 'sample', parameterSetId: 'set1', op: 'eq', optionIds: ['bact'] }), { ...SAMPLE, fromParameterSetId: 'set1', fromParameterSetName: 'Extraction' }],
    formData: [{ id: 'sample', value: 'yeast' }],
    visible: ['sample']
  },
  {
    name: 'unqualified reference on a set parameter means its own set',
    parameters: [
      { ...SAMPLE, fromParameterSetId: 'set1' },
      { ...NOTE, fromParameterSetId: 'set1', showIf: sampleIs('bact') }
    ],
    formData: { sample: 'bact' },
    visible: ['sample', 'note']
  },
  {
    name: 'unqualified reference on a set parameter does not reach an own parameter of the same id',
    parameters: [SAMPLE, { ...NOTE, fromParameterSetId: 'set1', showIf: sampleIs('bact') }],
    formData: [{ id: 'sample', value: 'yeast' }],
    visible: ['sample', 'note']
  },
  {
    name: 'a cycle that reached storage shows both',
    parameters: [{ ...NOTE, showIf: { parameterId: 't', op: 'eq', value: 'x' } }, target({ parameterId: 'note', op: 'eq', value: 'y' })],
    formData: [],
    visible: ['note', 't']
  },
  { name: 'a malformed condition shows the parameter', parameters: [SAMPLE, target({ parameterId: 'sample', op: 'matches', value: 'x' })], formData: [], visible: ['sample', 't'] },
  { name: 'unresolved: eq on text with no value', parameters: [NOTE, target({ parameterId: 'note', op: 'eq' })], formData: [{ id: 'note', value: 'x' }], visible: ['note', 't'] },
  { name: 'unresolved: gt on a number with no value', parameters: [CYCLES, target({ parameterId: 'cycles', op: 'gt' })], formData: [{ id: 'cycles', value: '1' }], visible: ['cycles', 't'] },
  { name: 'unresolved: eq on a yes/no with no value', parameters: [HOT, target({ parameterId: 'hot', op: 'eq' })], formData: [{ id: 'hot', value: true }], visible: ['hot', 't'] },
  { name: 'unresolved: includes on text with no value', parameters: [NOTE, target({ parameterId: 'note', op: 'includes' })], formData: [{ id: 'note', value: 'x' }], visible: ['note', 't'] },
  { name: 'unresolved: in on text with no values', parameters: [NOTE, target({ parameterId: 'note', op: 'in' })], formData: [{ id: 'note', value: 'x' }], visible: ['note', 't'] },
  { name: 'text ne blank: unanswered is false', parameters: [NOTE, target({ parameterId: 'note', op: 'ne', value: '' })], formData: [{ id: 'note', value: '  ' }], visible: ['note'] },
  { name: 'text ne blank: answered is true', parameters: [NOTE, target({ parameterId: 'note', op: 'ne', value: '' })], formData: [{ id: 'note', value: 'hello' }], visible: ['note', 't'] },
  { name: 'text eq blank: answered is false', parameters: [NOTE, target({ parameterId: 'note', op: 'eq', value: '' })], formData: [{ id: 'note', value: 'hello' }], visible: ['note'] },
  {
    name: 'reserved entries are never hidden',
    parameters: [SAMPLE, { id: '__runCount', name: 'Number of runs', type: 'number', showIf: sampleIs('bact') }],
    formData: [],
    visible: ['sample', '__runCount']
  }
];

describe('visibleParameterIds — shared vectors (rules 8–13)', () => {
  it.each(VECTORS.map((v) => [v.name, v] as const))('%s', (_name, v) => {
    expect([...visibleParameterIds(v.parameters, v.formData)]).toEqual(v.visible);
  });
});

const KIND = { ...SAMPLE, id: 'kind', name: 'Kind', showIf: sampleIs('bact') };

describe('hidden answers', () => {
  const parameters = [SAMPLE, KIND, NOTE];
  const formData = [
    { id: 'sample', value: 'yeast' },
    { id: 'kind', value: 'oth' },
    { id: 'kind__otherText', value: 'Phage' },
    { id: 'note', value: 'n' },
    { id: '__runCount', value: 2 }
  ];

  it('hiddenParameterIds lists them, and never an id the step does not have', () => {
    expect([...hiddenParameterIds(parameters, formData)]).toEqual(['kind']);
    expect(hiddenParameterIds([SAMPLE, NOTE], formData).size).toBe(0);
  });

  it('withoutHiddenAnswers drops the entry and its __otherText companion, nothing else', () => {
    expect(withoutHiddenAnswers(parameters, formData)).toEqual([
      { id: 'sample', value: 'yeast' },
      { id: 'note', value: 'n' },
      { id: '__runCount', value: 2 }
    ]);
  });

  it('withoutHiddenAnswers keeps the object shape, and returns the input itself when nothing is hidden', () => {
    expect(withoutHiddenAnswers(parameters, { sample: 'yeast', kind: 'oth', kind__otherText: 'Phage', note: 'n' })).toEqual({ sample: 'yeast', note: 'n' });
    const shown = [{ id: 'sample', value: 'bact' }];
    expect(withoutHiddenAnswers(parameters, shown)).toBe(shown);
    expect(withoutHiddenAnswers(parameters, null)).toBeNull();
  });
});

describe('resetHiddenValues (rule 15)', () => {
  const FILE = { id: 'map', name: 'Map', type: 'file', showIf: sampleIs('bact') };
  const MULTI = { id: 'primers', name: 'Primers', type: 'string', allowMultipleValues: true, showIf: sampleIs('bact') };
  const FLAG = { id: 'flag', name: 'Flag', type: 'boolean', showIf: sampleIs('bact') };
  const LAST = { id: 'last', name: 'Last', type: 'string', showIf: { parameterId: 'kind', op: 'eq', optionIds: ['oth'] } };
  const parameters = [SAMPLE, KIND, FILE, MULTI, FLAG, LAST];
  const entry = (def: any, value: unknown): any => ({ id: def.id, name: def.name, type: def.type, options: def.options ?? null, paramType: 'input', value, allowMultipleValues: def.allowMultipleValues || undefined });
  const formData = [entry(SAMPLE, 'bact'), entry(KIND, 'oth'), entry(FILE, null), entry(MULTI, ['']), entry(FLAG, null), entry(LAST, null)];
  const filled = { sample: 'bact', kind: 'oth', kind__otherText: 'Phage', map: { __kind: 'pending-file', filename: 'a.gb' }, primers: ['f1', 'r1'], flag: true, last: 'x' };

  it('changes nothing while every parameter is shown', () => {
    expect(resetHiddenValues(filled, formData, parameters)).toBeNull();
  });

  it('returns each newly hidden parameter to its empty value and drops its "Other" text', () => {
    expect(resetHiddenValues({ ...filled, sample: 'yeast' }, formData, parameters)).toEqual({ sample: 'yeast', kind: '', kind__otherText: '', map: null, primers: [''], flag: '', last: '' });
  });

  it('follows the cascade: emptying one answer hides the parameter it controls (Review Focus 1)', () => {
    const next = resetHiddenValues({ ...filled, sample: 'yeast' }, formData, parameters)!;
    expect(next.last).toBe('');
    // And a second pass has nothing left to do: the caller's effect cannot loop (Review Focus 5).
    expect(resetHiddenValues(next, formData, parameters)).toBeNull();
  });

  it('is null — not a fresh object — when the hidden values are already empty', () => {
    expect(resetHiddenValues({ sample: 'yeast', kind: '', kind__otherText: '', map: null, primers: [''], flag: '', last: '' }, formData, parameters)).toBeNull();
    expect(resetHiddenValues({ sample: '' }, formData, parameters)).toBeNull();
  });

  it('leaves a result parameter and an unknown key alone', () => {
    const result = [{ id: 'kind', name: 'Kind', type: 'dropdown', paramType: 'result', value: true }];
    expect(resetHiddenValues({ sample: 'yeast', kind: true, resultParamValuekind: 'x' }, result, parameters)).toBeNull();
  });
});

describe('snapshotWithoutHiddenAnswers (rule 21, the job editor diff)', () => {
  it('drops hidden answers per node, by the definitions given for that node', () => {
    const workflows = [
      {
        name: 'W',
        nodes: [
          { id: 'n1', serviceId: 's1', formData: [{ id: 'sample', value: 'yeast' }, { id: 'kind', value: 'bact' }] },
          { id: 'n2', serviceId: 'gone', formData: [{ id: 'kind', value: 'bact' }] }
        ],
        edges: [{ source: 'n1', target: 'n2' }]
      }
    ];
    const out = snapshotWithoutHiddenAnswers(workflows, (node) => (node.serviceId === 's1' ? [SAMPLE, KIND] : undefined));
    expect(out[0].nodes![0].formData).toEqual([{ id: 'sample', value: 'yeast' }]);
    expect(out[0].nodes![1].formData).toEqual([{ id: 'kind', value: 'bact' }]);
    expect(out[0].edges).toEqual(workflows[0].edges);
    expect(workflows[0].nodes[0].formData).toHaveLength(2);
  });
});

describe('comparisonFits', () => {
  it('a comparison missing the operand its operator needs does not fit', () => {
    expect(comparisonFits({ parameterId: 'note', op: 'eq' }, NOTE)).toBe(false);
    expect(comparisonFits({ parameterId: 'note', op: 'in' }, NOTE)).toBe(false);
    expect(comparisonFits({ parameterId: 'cycles', op: 'gt' }, CYCLES)).toBe(false);
    expect(comparisonFits({ parameterId: 'note', op: 'eq', value: 'x' }, NOTE)).toBe(true);
    expect(comparisonFits({ parameterId: 'cycles', op: 'eq', value: 'abc' }, CYCLES)).toBe(true);
  });
});
