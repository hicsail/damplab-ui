import { describe, expect, it } from 'vitest';
import { applyWorkbook, WorkbookMutator } from './applyWorkbook';
import { allRows, planWorkbook, tickedKeys, unmetNeeds } from './planWorkbook';
import { catalogOf, rawSheet } from './testSupport';
import { PlanRow, RawWorkbook } from './types';

/**
 * show-only-if rules 27 and 29: a changed conditionalDisplayLogic cell is
 * resolved against the catalog as this upload would leave it, and written with
 * the ids the upload actually produced.
 */
const sampleType = { id: 'sample_type', name: 'Sample Type', type: 'dropdown', options: [{ id: 'bact', name: 'Bacteria' }, { id: 'yeast', name: 'Yeast' }] };
const catalog = catalogOf({
  sets: [
    { id: 'setX', name: 'Extraction', parameters: [sampleType, { id: 'lysis', name: 'Lysis', type: 'string', showIf: { parameterId: 'sample_type', op: 'eq', optionIds: ['yeast'] } }] },
    { id: 'setB', name: 'Buffers', parameters: [{ id: 'volume', name: 'Volume', type: 'number' }] }
  ],
  operations: [
    { id: 'op1', name: 'PCR', hiddenFromClients: false, parameterSetIds: ['setX', 'setB'], ownParameters: [{ id: 'cycles', name: 'Cycles', type: 'number', showIf: { parameterId: 'sample_type', parameterSetId: 'setX', op: 'eq', optionIds: ['yeast'] } }] } as any,
    { id: 'op2', name: 'Miniprep', hiddenFromClients: false, parameterSetIds: ['setX'], ownParameters: [] } as any,
    { id: 'op3', name: 'Gel', hiddenFromClients: false, parameterSetIds: ['setB'], ownParameters: [] } as any
  ]
});
const LIST = ['parameterSet', 'operation', 'parameter', 'type', 'options', 'conditionalDisplayLogic'];
const book = (rows: string[][], operations?: string[][]): RawWorkbook => ({
  ignoredSheets: [],
  sheets: {
    parameterList: rawSheet('parameterList', LIST, rows),
    ...(operations ? { operations: rawSheet('operations', ['name', 'parameterSet1', 'parameterSet2'], operations) } : {})
  }
});
const planOf = (raw: RawWorkbook) => planWorkbook(raw, catalog, { allowPricing: true, hideMissing: false });
const rowsOf = (raw: RawWorkbook): Record<string, PlanRow> => Object.fromEntries(allRows(planOf(raw)).map((row) => [row.key, row]));

/** Records every call; creates return predictable ids. */
const recorder = () => {
  const calls: Array<[string, ...unknown[]]> = [];
  let next = 0;
  const call = (name: keyof WorkbookMutator, returnsId: boolean) => async (...args: unknown[]): Promise<any> => {
    calls.push([name, ...args]);
    return returnsId ? `new-${name}-${(next += 1)}` : undefined;
  };
  const mutator: WorkbookMutator = {
    createParameterSet: call('createParameterSet', true), updateParameterSet: call('updateParameterSet', false), createService: call('createService', true),
    updateService: call('updateService', false), createCategory: call('createCategory', true), updateCategory: call('updateCategory', false),
    createBundle: call('createBundle', true), updateBundle: call('updateBundle', false), createSowTextPreset: call('createSowTextPreset', true),
    updateSowTextPreset: call('updateSowTextPreset', false), createUploadLog: call('createUploadLog', false)
  };
  return { mutator, calls: () => calls.filter((c) => c[0] !== 'createUploadLog') };
};
const run = async (raw: RawWorkbook, overrides: Record<string, boolean> = {}) => {
  const plan = planOf(raw);
  const rec = recorder();
  const summary = await applyWorkbook(plan, tickedKeys(plan, overrides), catalog, rec.mutator, { fileName: 'c.xlsx', uploaderName: 'Ada' });
  return { plan, summary, calls: rec.calls() };
};
const byId = (parameters: any[], id: string): any => parameters.find((p) => p.id === id);

describe('planning: the catalog as this upload would leave it (rule 27)', () => {
  it('a condition can name a parameter another row of the same sheet creates, and needs that row', () => {
    const rows = rowsOf(book([
      ['Extraction', '', 'Bead size', 'Number', '', ''],
      ['Extraction', '', 'Bead material', 'Text', '', '"Bead size">0.5']
    ]));
    expect(rows['parameterList:3']).toMatchObject({ action: 'create', errors: [], needs: [{ what: 'parameter “Bead size”', anyOf: ['parameterList:2'] }] });
    expect(rows['parameterList:2'].needs).toEqual([]);
  });

  it('a condition can name an option another row adds, and needs that row', () => {
    const rows = rowsOf(book([
      ['Extraction', '', 'Sample Type', 'Dropdown', 'Bacteria; Yeast; Fungi', ''],
      ['Extraction', '', 'Spore prep', 'Text', '', '"Sample Type"=="Fungi"']
    ]));
    expect(rows['parameterList:3']).toMatchObject({ action: 'create', errors: [], needs: [{ what: 'an option of “Sample Type” this condition names', anyOf: ['parameterList:2'] }] });
  });

  it('a condition that names only what is already stored needs nothing, even when its controller’s row changes something else', () => {
    const rows = rowsOf(book([
      ['Extraction', '', 'Sample Type', 'Dropdown', 'Bacteria; Yeast; Fungi', ''],
      ['Extraction', '', 'Spore prep', 'Text', '', '"Sample Type"=="Yeast"']
    ]));
    expect(rows['parameterList:3']).toMatchObject({ action: 'create', errors: [], needs: [] });
  });

  it('a condition can name a parameter of a set this upload creates — from another set and from an operation', () => {
    const rows = rowsOf(book([
      ['Cleanup', '', 'Method', 'Dropdown', 'Column; Beads', ''],
      ['Extraction', '', 'Wash', 'Text', '', '"Cleanup"."Method"=="Beads"'],
      ['', 'PCR', 'Polish', 'Text', '', '"Cleanup"."Method"=="Column" && "Cycles">30']
    ]));
    expect(rows['parameterList:3']).toMatchObject({ action: 'create', errors: [], needs: [{ what: 'parameter “Method”', anyOf: ['parameterList:2'] }] });
    expect(rows['parameterList:4']).toMatchObject({ action: 'create', errors: [], needs: [{ what: 'parameter “Method”', anyOf: ['parameterList:2'] }] });
  });

  it('a row whose own cells are wrong creates nothing, so a condition naming it is an error too', () => {
    const rows = rowsOf(book([
      ['Extraction', '', 'Bead size', 'Sphere', '', ''],
      ['Extraction', '', 'Bead material', 'Text', '', '"Bead size">0.5']
    ]));
    expect(rows['parameterList:2'].errors).toEqual(['Unknown type “Sphere”.']);
    expect(rows['parameterList:3']).toMatchObject({ action: 'skip', errors: ['conditionalDisplayLogic: No parameter is named “Bead size” here.'] });
  });

  it('a row refused for its condition creates nothing either: the refusal carries to the rows that name it', () => {
    const rows = rowsOf(book([
      ['Extraction', '', 'Bead size', 'Number', '', '"Nowhere">1'],
      ['Extraction', '', 'Bead material', 'Text', '', '"Bead size">0.5'],
      ['Extraction', '', 'Wash', 'Text', '', '"Sample Type"=="Yeast"']
    ]));
    expect(rows['parameterList:2'].errors).toEqual(['conditionalDisplayLogic: No parameter is named “Nowhere” here.']);
    expect(rows['parameterList:3'].errors).toEqual(['conditionalDisplayLogic: No parameter is named “Bead size” here.']);
    expect(rows['parameterList:4']).toMatchObject({ action: 'create', errors: [] });
  });

  it('two new conditions that depend on each other are both… one loop error, on the row that closes it', () => {
    const rows = rowsOf(book([
      ['Extraction', '', 'A', 'Text', '', '"B"=="x"'],
      ['Extraction', '', 'B', 'Text', '', '"A"=="x"']
    ]));
    expect(rows['parameterList:3'].errors).toEqual(['conditionalDisplayLogic: This condition would form a loop: the parameter it depends on depends, in turn, on this one.']);
    // With B refused, A names a parameter that will not exist.
    expect(rows['parameterList:2'].errors).toEqual(['conditionalDisplayLogic: No parameter is named “B” here.']);
  });

  it('a loop that spans two sets is refused when planned — on the later row — not discovered at import', async () => {
    // Each set gets a new condition naming the other set's existing parameter.
    const raw = book([
      ['Extraction', '', 'Sample Type', 'Dropdown', 'Bacteria; Yeast', '"Buffers"."Volume">5'],
      ['Buffers', '', 'Volume', 'Number', '', '"Extraction"."Sample Type"=="Yeast"']
    ]);
    const rows = rowsOf(raw);
    expect(rows['parameterList:2']).toMatchObject({ action: 'update', errors: [] });
    expect(rows['parameterList:3']).toMatchObject({ action: 'skip', errors: ['conditionalDisplayLogic: This condition would form a loop: the parameter it depends on depends, in turn, on this one.'] });
    const { summary, calls } = await run(raw);
    expect(summary.rowErrors).toEqual({});
    expect(calls.map((c) => c[0])).toEqual(['updateParameterSet']);
  });

  it('the preview blocks a row whose provider is unticked (never a silent skip)', () => {
    const plan = planOf(book([
      ['Extraction', '', 'Bead size', 'Number', '', ''],
      ['Extraction', '', 'Bead material', 'Text', '', '"Bead size">0.5']
    ]));
    expect(unmetNeeds(plan, tickedKeys(plan, {}))).toEqual({});
    expect(unmetNeeds(plan, tickedKeys(plan, { 'parameterList:2': false }))).toEqual({ 'parameterList:3': 'Parameter “Bead size” was not created.' });
  });
});

describe('planning: warnings (rule 29)', () => {
  it('a set parameter that names another set: the operations using its set without the other are named', () => {
    const rows = rowsOf(book([['Extraction', '', 'Wash', 'Text', '', '"Buffers"."Volume">5']]));
    expect(rows['parameterList:2']).toMatchObject({ action: 'create', errors: [], warnings: ['“Miniprep” uses “Extraction” without “Buffers”: there this parameter is always shown.'] });
  });

  it('counts the sets each operation would have after this upload', () => {
    const rows = rowsOf(book([['Extraction', '', 'Wash', 'Text', '', '"Buffers"."Volume">5']], [['Miniprep', 'Extraction', 'Buffers'], ['Gel', 'Extraction', '']]));
    expect(rows['parameterList:2'].warnings).toEqual(['“Gel” uses “Extraction” without “Buffers”: there this parameter is always shown.']);
  });

  it('names at most five operations', () => {
    const many = catalogOf({
      sets: catalog.sets,
      operations: ['A', 'B', 'C', 'D', 'E', 'F', 'G'].map((name, i) => ({ id: `o${i}`, name, hiddenFromClients: false, parameterSetIds: ['setX'], ownParameters: [] }) as any)
    });
    const plan = planWorkbook(book([['Extraction', '', 'Wash', 'Text', '', '"Buffers"."Volume">5']]), many, { allowPricing: true, hideMissing: false });
    expect(plan.parameterList!.rows[0].warnings).toEqual(['“A”, “B”, “C”, “D”, “E” and 2 more use “Extraction” without “Buffers”: there this parameter is always shown.']);
  });

  it('no warning for an operation’s own parameter, nor for a same-set reference', () => {
    const rows = rowsOf(book([
      ['', 'PCR', 'Polish', 'Text', '', '"Buffers"."Volume">5'],
      ['Extraction', '', 'Wash', 'Text', '', '"Sample Type"=="Yeast"']
    ]));
    expect(rows['parameterList:2'].warnings).toEqual([]);
    expect(rows['parameterList:3'].warnings).toEqual([]);
  });

  it('dropping (or renaming) an option that a condition elsewhere names warns on the row that drops it, naming those parameters', () => {
    const rows = rowsOf(book([['Extraction', '', 'Sample Type', 'Dropdown', 'Bacteria; Yeasts', '']]));
    expect(rows['parameterList:2']).toMatchObject({
      action: 'update',
      errors: [],
      warnings: ['Option “Yeast” will be removed', 'An option this row removes is named by the condition on “Lysis”, “Cycles”, which will then always be shown.']
    });
  });

  it('no such warning when the option stays, or when the same upload re-points the condition', () => {
    const kept = rowsOf(book([['Extraction', '', 'Sample Type', 'Dropdown', 'Yeast; Bacteria; Fungi', '']]));
    expect(kept['parameterList:2'].warnings).toEqual([]);
    const repointed = rowsOf(book([
      ['Extraction', '', 'Sample Type', 'Dropdown', 'Bacteria', ''],
      ['Extraction', '', 'Lysis', 'Text', '', '"Sample Type"=="Bacteria"'],
      ['', 'PCR', 'Cycles', 'Number', '', '']
    ]));
    expect(repointed['parameterList:2'].warnings).toEqual(['Option “Yeast” will be removed']);
    expect(repointed['parameterList:4']).toMatchObject({ action: 'update', warnings: ['The conditionalDisplayLogic cell is blank: the condition will be removed.'] });
  });
});

describe('applying: conditions are written with the ids the upload produced (rule 27)', () => {
  it('writes a set’s new parameter and the condition that names it in one write', async () => {
    const { calls, summary } = await run(book([
      ['Extraction', '', 'Bead size', 'Number', '', ''],
      ['Extraction', '', 'Bead material', 'Text', '', '"Bead size">0.5']
    ]));
    expect(summary.rowErrors).toEqual({});
    expect(calls.map((c) => c[0])).toEqual(['updateParameterSet']);
    const parameters = (calls[0][2] as any).parameters;
    expect(parameters.map((p: any) => p.id)).toEqual(['sample_type', 'lysis', 'bead_size', 'bead_material']);
    expect(byId(parameters, 'bead_material').showIf).toEqual({ parameterId: 'bead_size', op: 'gt', value: 0.5 });
    expect(byId(parameters, 'lysis').showIf).toEqual({ parameterId: 'sample_type', op: 'eq', optionIds: ['yeast'] });
  });

  it('resolves again when applying: unticking a row changes the id minted for the parameter a condition names', async () => {
    // "Bead size" and "Bead  size" (two spaces) are different names that derive the same id.
    // They are near-duplicates, so neither is ticked by default: tick them by hand.
    const raw = book([
      ['Extraction', '', 'Bead size', 'Number', '', ''],
      ['Extraction', '', 'Bead  size', 'Number', '', ''],
      ['Extraction', '', 'Bead material', 'Text', '', '"Bead  size">0.5']
    ]);
    const both = await run(raw, { 'parameterList:2': true, 'parameterList:3': true });
    expect(byId((both.calls[0][2] as any).parameters, 'bead_material').showIf).toEqual({ parameterId: 'bead_size_2', op: 'gt', value: 0.5 });
    const second = await run(raw, { 'parameterList:2': false, 'parameterList:3': true });
    expect(second.summary.rowErrors).toEqual({});
    expect((second.calls[0][2] as any).parameters.map((p: any) => p.id)).toEqual(['sample_type', 'lysis', 'bead_size', 'bead_material']);
    expect(byId((second.calls[0][2] as any).parameters, 'bead_material').showIf).toEqual({ parameterId: 'bead_size', op: 'gt', value: 0.5 });
  });

  it('a row whose provider was unticked is not written and says why; the rest of its set still is', async () => {
    const { calls, summary } = await run(
      book([
        ['Extraction', '', 'Bead size', 'Number', '', ''],
        ['Extraction', '', 'Bead material', 'Text', '', '"Bead size">0.5'],
        ['Extraction', '', 'Wash', 'Text', '', '']
      ]),
      { 'parameterList:2': false }
    );
    expect(summary.rowErrors).toEqual({ 'parameterList:3': 'Parameter “Bead size” was not created.' });
    expect((calls[0][2] as any).parameters.map((p: any) => p.id)).toEqual(['sample_type', 'lysis', 'wash']);
    expect(summary.sheets.parameterList).toMatchObject({ created: 1, failed: 1 });
  });

  it('writes a reference into a set this upload creates with that set’s real id — and writes that set first', async () => {
    const { calls, summary } = await run(book([
      ['Extraction', '', 'Wash', 'Text', '', '"Cleanup"."Method"=="Beads"'],
      ['Cleanup', '', 'Method', 'Dropdown', 'Column; Beads', ''],
      ['', 'PCR', 'Polish', 'Text', '', '"Cleanup"."Method"=="Column"']
    ]));
    expect(summary.rowErrors).toEqual({});
    // Extraction is first in the sheet, but it needs Cleanup's parameter.
    expect(calls.map((c) => c[0])).toEqual(['createParameterSet', 'updateParameterSet', 'updateService']);
    expect((calls[0][1] as any).name).toBe('Cleanup');
    const method = (calls[0][1] as any).parameters[0];
    const optionId = (name: string): string => method.options.find((o: any) => o.name === name).id;
    expect(byId((calls[1][2] as any).parameters, 'wash').showIf).toEqual({ parameterId: 'method', parameterSetId: 'new-createParameterSet-1', op: 'eq', optionIds: [optionId('Beads')] });
    expect(byId((calls[2][2] as any).parameters, 'polish').showIf).toEqual({ parameterId: 'method', parameterSetId: 'new-createParameterSet-1', op: 'eq', optionIds: [optionId('Column')] });
    expect(JSON.stringify(calls)).not.toContain('new:Cleanup');
  });

  it('two new sets that each need a parameter of the other cannot both go first: the row that waits says what it is missing', async () => {
    // Not a loop — A1 depends on B1, and B2 on A2 — but neither set exists yet, and one has to be written first.
    const { calls, summary } = await run(book([
      ['Alpha', '', 'A1', 'Text', '', '"Beta"."B1"=="x"'],
      ['Alpha', '', 'A2', 'Text', '', ''],
      ['Beta', '', 'B1', 'Text', '', ''],
      ['Beta', '', 'B2', 'Text', '', '"Alpha"."A2"=="x"']
    ]));
    expect(summary.rowErrors).toEqual({ 'parameterList:2': 'Parameter “B1” was not created.' });
    expect(calls.map((c) => [c[0], (c[1] as any).name, (c[1] as any).parameters.map((p: any) => p.id)])).toEqual([
      ['createParameterSet', 'Alpha', ['a2']],
      ['createParameterSet', 'Beta', ['b1', 'b2']]
    ]);
    expect(byId((calls[1][1] as any).parameters, 'b2').showIf).toEqual({ parameterId: 'a2', parameterSetId: 'new-createParameterSet-1', op: 'eq', value: 'x' });
  });

  it('two new sets whose conditions form a loop are refused when planned', () => {
    const rows = rowsOf(book([
      ['Alpha', '', 'A', 'Text', '', '"Beta"."B"=="x"'],
      ['Beta', '', 'B', 'Text', '', '"Alpha"."A"=="x"']
    ]));
    expect(rows['parameterList:3'].errors).toEqual(['conditionalDisplayLogic: This condition would form a loop: the parameter it depends on depends, in turn, on this one.']);
    // With B refused, the set "Beta" is not created, so A names a set that will not exist.
    expect(rows['parameterList:2'].errors).toEqual(['conditionalDisplayLogic: No parameter set is named “Beta”.']);
  });

  it('an unchanged condition is not rewritten: a row that changes another cell keeps the stored tree', async () => {
    const { calls } = await run(book([['Extraction', '', 'Lysis', 'Number', '', '"Sample Type"=="Yeast"']]));
    expect(byId((calls[0][2] as any).parameters, 'lysis')).toEqual({ id: 'lysis', name: 'Lysis', type: 'number', showIf: { parameterId: 'sample_type', op: 'eq', optionIds: ['yeast'] } });
  });
});
