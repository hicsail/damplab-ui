import { describe, expect, it } from 'vitest';
import { applyWorkbook, WorkbookMutator } from './applyWorkbook';
import { allRows, planWorkbook, tickedKeys, unmetNeeds } from './planWorkbook';
import { catalogOf, rawSheet } from './testSupport';
import { CatalogSnapshot, PlanRow, RawWorkbook } from './types';

/**
 * Rows are matched by id only (change of 2026-10-08), so a name no longer says
 * which record a row is — but names are still how one row refers to another.
 * Those references resolve workbook-first: the rows of this upload that carry
 * the name, then the catalog.
 */
const op = (id: string, name: string, over: Record<string, unknown> = {}): any => ({ id, name, hiddenFromClients: false, parameterSetIds: [], ownParameters: [], ...over });
const catalog = catalogOf({
  sets: [{ id: 's1', name: 'Buffers', parameters: [{ id: 'volume', name: 'Volume', type: 'number' }, { id: 'ph', name: 'pH', type: 'number' }] }],
  operations: [op('op1', 'PCR', { parameterSetIds: ['s1'], ownParameters: [{ id: 'cycles', name: 'Cycles', type: 'number' }] }), op('op2', 'Gel'), op('tw1', 'Twin'), op('tw2', 'Twin')],
  bundles: [{ id: 'b1', label: 'Cloning', icon: '', steps: [{ id: 'op2', name: 'Gel' }] }],
  sowPresets: [{ id: 'p1', sectionKey: 'terms', name: 'Default', text: 'Net 30.', order: 1000 }],
  sowSectionKeys: ['terms']
});
const OPS = ['id', 'name', 'pricingMode'];
const LIST = ['parameterId', 'parameterSet', 'operation', 'parameter', 'type', 'conditionalDisplayLogic'];
const BUNDLES = ['id', 'BundleName', 'Order', 'Operation'];
const book = (sheets: { operations?: string[][]; parameterList?: string[][]; bundles?: string[][]; sowSections?: string[][] }): RawWorkbook => ({
  ignoredSheets: [],
  sheets: {
    ...(sheets.operations ? { operations: rawSheet('operations', OPS, sheets.operations) } : {}),
    ...(sheets.parameterList ? { parameterList: rawSheet('parameterList', LIST, sheets.parameterList) } : {}),
    ...(sheets.bundles ? { bundles: rawSheet('bundles', BUNDLES, sheets.bundles) } : {}),
    ...(sheets.sowSections ? { sowSections: rawSheet('sowSections', ['id', 'sectionKey', 'name', 'text'], sheets.sowSections) } : {})
  }
});
const planOf = (raw: RawWorkbook, cat: CatalogSnapshot = catalog) => planWorkbook(raw, cat, { allowPricing: true, hideMissing: false });
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
  return { mutator, all: () => calls, calls: () => calls.filter((c) => c[0] !== 'createUploadLog') };
};
const run = async (raw: RawWorkbook, overrides: Record<string, boolean> = {}) => {
  const plan = planOf(raw);
  const rec = recorder();
  const summary = await applyWorkbook(plan, tickedKeys(plan, overrides), catalog, rec.mutator, { fileName: 'c.xlsx', uploaderName: 'Ada' });
  return { plan, summary, calls: rec.calls(), all: rec.all() };
};

const SAME = (noun: string): string => `Same name as an existing ${noun} — this row creates a second one. Add the id to update it instead.`;
const NEW_PCR = '“PCR” means the new operation in row 2, not the existing operation named “PCR”.';
const BOTH = 'Rows 2 and 3 are both named “PCR” — rename one so this row can say which.';

describe('A, on every sheet with an id column: a blank id is a create, whatever its name', () => {
  it.each<[string, Parameters<typeof book>[0], string, string]>([
    ['Operations', { operations: [['', 'PCR', '']] }, 'operations:2', 'operation'],
    ['Parameter List (a set’s parameter)', { parameterList: [['', 'Buffers', '', 'Volume', 'Number', '']] }, 'parameterList:2', 'parameter'],
    ['Parameter List (an operation’s own parameter)', { parameterList: [['', '', 'PCR', 'Cycles', 'Number', '']] }, 'parameterList:2', 'parameter'],
    ['Bundles', { bundles: [['', 'Cloning', '1', 'Gel']] }, 'bundles:2', 'bundle'],
    ['SOW Sections', { sowSections: [['', 'terms', 'Default', 'Net 30.']] }, 'sowSections:2', 'SOW text block']
  ])('A2/A3 — %s: the name of a stored record creates a second one, warned and unticked', (_sheet, sheets, key, noun) => {
    expect(rowsOf(book(sheets))[key]).toMatchObject({ action: 'create', errors: [], warnings: [SAME(noun)], selectedByDefault: false });
  });

  it('A3: a parameter’s scope is its owner — the same name under another owner is an ordinary create', () => {
    expect(rowsOf(book({ parameterList: [['', '', 'Gel', 'Volume', 'Number', '']] }))['parameterList:2']).toMatchObject({ action: 'create', warnings: [], selectedByDefault: true });
  });

  it('A1: an id still updates, and an id that matches nothing in that owner is still an error', () => {
    const rows = rowsOf(book({ parameterList: [['volume', 'Buffers', '', 'Final volume', 'Number', ''], ['cycles', 'Buffers', '', 'Cycles', 'Number', '']] }));
    expect(rows['parameterList:2']).toMatchObject({ action: 'update', changed: ['parameter'], errors: [] });
    expect(rows['parameterList:3'].errors).toEqual(['No parameter has id “cycles”.']);
  });

  it('A7: a created parameter named like a stored one of its owner gets a fresh id, and the stored one is untouched', async () => {
    const raw = book({ parameterList: [['', 'Buffers', '', 'Volume', 'Text', ''], ['', '', 'PCR', 'Cycles', 'Text', '']] });
    const { calls, summary } = await run(raw, { 'parameterList:2': true, 'parameterList:3': true });
    expect(summary.rowErrors).toEqual({});
    expect(calls).toEqual([
      ['updateParameterSet', 's1', { parameters: [...catalog.sets[0].parameters, expect.objectContaining({ id: 'volume_2', name: 'Volume', type: 'string' })] }],
      ['updateService', 'op1', { parameters: [...catalog.operations[0].ownParameters, expect.objectContaining({ id: 'cycles_2', name: 'Cycles', type: 'string' })] }]
    ]);
  });

  it('A7: an own parameter created with the name of one of its operation’s set parameters avoids that id too', async () => {
    const { calls } = await run(book({ parameterList: [['', '', 'PCR', 'Volume', 'Text', '']] }));
    expect((calls[0][2] as any).parameters.map((p: any) => p.id)).toEqual(['cycles', 'volume_2']);
  });
});

describe('C — an operation named from a Parameter List row', () => {
  const ownerOf = (raw: RawWorkbook) => planOf(raw).parameterList!.work.owners[0];
  const param = (operation: string): string[][] => [['', '', operation, 'Extension', 'Number', '']];

  it('C1: one row carries the name and has an id → that operation, found by its new name', () => {
    const raw = book({ operations: [['op1', 'PCR v2', '']], parameterList: param('PCR v2') });
    expect(rowsOf(raw)['parameterList:2']).toMatchObject({ action: 'create', errors: [], needs: [] });
    expect(ownerOf(raw)).toMatchObject({ existingId: 'op1', stored: catalog.operations[0].ownParameters, reservedIds: ['volume', 'ph'] });
  });

  it('C1: a row that is an error for its own reasons still carries the name', () => {
    const raw = book({ operations: [['op1', 'PCR v2', 'HOURLY']], parameterList: param('PCR v2') });
    expect(rowsOf(raw)['operations:2'].action).toBe('skip');
    expect(rowsOf(raw)['parameterList:2']).toMatchObject({ action: 'create', errors: [], needs: [] });
    expect(ownerOf(raw).existingId).toBe('op1');
  });

  it('C1: one row carries the name and has no id → the operation that row creates, never the stored namesake', () => {
    const raw = book({ operations: [['', 'PCR', '']], parameterList: [['', '', 'PCR', 'Cycles', 'Number', '']] });
    const rows = rowsOf(raw);
    expect(rows['operations:2']).toMatchObject({ action: 'create', selectedByDefault: false });
    // The new operation has no parameters, so "Cycles" is not a second one; the row says which PCR it means.
    expect(rows['parameterList:2']).toMatchObject({ action: 'create', errors: [], warnings: [NEW_PCR], selectedByDefault: true, needs: [{ what: 'operation “PCR”', anyOf: ['operations:2'] }] });
    expect(ownerOf(raw)).toMatchObject({ operationRowKey: 'operations:2', stored: [] });
    expect(ownerOf(raw).existingId).toBeUndefined();
  });

  it('C1: with that row unticked the parameter row is blocked — no fallback to the stored operation', async () => {
    const raw = book({ operations: [['', 'PCR', '']], parameterList: [['', '', 'PCR', 'Cycles', 'Number', '']] });
    const plan = planOf(raw);
    expect(unmetNeeds(plan, tickedKeys(plan, {}))).toEqual({ 'parameterList:2': 'Operation “PCR” was not created.' });
    const { calls, summary } = await run(raw);
    expect(calls).toEqual([]);
    expect(summary.rowErrors).toEqual({ 'parameterList:2': 'Operation “PCR” was not created.' });
  });

  it('C1: ticked, the parameter goes to the operation the row created', async () => {
    const raw = book({ operations: [['', 'PCR', '']], parameterList: [['', '', 'PCR', 'Cycles', 'Number', '']] });
    const { calls } = await run(raw, { 'operations:2': true });
    expect(calls.map((c) => [c[0], c[1]])).toEqual([['createService', expect.objectContaining({ name: 'PCR' })], ['updateService', 'new-createService-1']]);
  });

  it('C2: two rows carry the name → an error naming them', () => {
    const raw = book({ operations: [['op1', 'PCR', ''], ['', 'PCR', '']], parameterList: param('PCR') });
    expect(rowsOf(raw)['parameterList:2']).toMatchObject({ action: 'skip', errors: [BOTH] });
  });

  it('C2: three rows', () => {
    const raw = book({ operations: [['op1', 'PCR', ''], ['', 'PCR', ''], ['op2', 'PCR', '']], parameterList: param('PCR') });
    expect(rowsOf(raw)['parameterList:2'].errors).toEqual(['Rows 2, 3 and 4 are both named “PCR” — rename one so this row can say which.']);
  });

  it.each<[string, string[][] | undefined, string, string[] | 'op1']>([
    ['no Operations sheet: exactly one stored operation', undefined, 'PCR', 'op1'],
    ['no row of that name: exactly one stored operation', [['op2', 'Gel', '']], 'PCR', 'op1'],
    ['a renamed operation is still found by its stored name when no row carries it', [['op1', 'PCR v2', '']], 'PCR', 'op1'],
    ['two stored operations', undefined, 'Twin', ['2 operations are named “Twin” — its parameters cannot say which.']],
    ['none', undefined, 'Ligation', ['No operation named “Ligation”.']]
  ])('C3 — %s', (_case, operations, name, expected) => {
    const raw = book({ operations, parameterList: param(name) });
    if (expected === 'op1') {
      expect(rowsOf(raw)['parameterList:2']).toMatchObject({ action: 'create', errors: [], needs: [] });
      expect(ownerOf(raw).existingId).toBe('op1');
    } else expect(rowsOf(raw)['parameterList:2'].errors).toEqual(expected);
  });

  it('the one row that carries the name has an id no operation has → an error, not the catalog', () => {
    const raw = book({ operations: [['gone', 'PCR', '']], parameterList: param('PCR') });
    expect(rowsOf(raw)['parameterList:2'].errors).toEqual(['Row 2 is named “PCR”, but no operation has its id.']);
  });
});

describe('C — an operation named from a Bundles row', () => {
  const steps = (raw: RawWorkbook) => planOf(raw).bundles!.work.bundles['bundles:2']?.changes.steps;
  const bundle = (operation: string): string[][] => [['b1', 'Cloning', '1', operation]];

  it('C1: one row with an id → that operation, by its new name', () => {
    const raw = book({ operations: [['op1', 'PCR v2', '']], bundles: bundle('PCR v2') });
    expect(rowsOf(raw)['bundles:2']).toMatchObject({ action: 'update', errors: [], needs: [] });
    expect(steps(raw)).toEqual([{ name: 'PCR v2', id: 'op1' }]);
  });

  it('C1: one row without an id → the operation it creates, and the bundle needs that row', async () => {
    const raw = book({ operations: [['', 'Gel', '']], bundles: [['b1', 'Cloning', '1', 'Gel'], ['b1', 'Cloning', '2', 'PCR']] });
    expect(rowsOf(raw)['bundles:2']).toMatchObject({ action: 'update', changed: ['steps'], errors: [], needs: [{ what: 'operation “Gel”', anyOf: ['operations:2'] }] });
    expect(steps(raw)).toEqual([{ name: 'Gel', rowKey: 'operations:2' }, { name: 'PCR', id: 'op1' }]);
    const plan = planOf(raw);
    expect(unmetNeeds(plan, tickedKeys(plan, {}))).toEqual({ 'bundles:2': 'Operation “Gel” was not created.' });
    expect((await run(raw)).calls).toEqual([]);
    const ticked = await run(raw, { 'operations:2': true });
    expect(ticked.calls[1]).toEqual(['updateBundle', 'b1', { services: ['new-createService-1', 'op1'] }]);
  });

  it('C2: two rows carry the name → an error naming them', () => {
    const raw = book({ operations: [['op1', 'PCR', ''], ['', 'PCR', '']], bundles: bundle('PCR') });
    expect(rowsOf(raw)['bundles:2']).toMatchObject({ action: 'skip', errors: [`Row 2: ${BOTH}`] });
  });

  it.each<[string, string, Array<{ name: string; id: string }> | string[]]>([
    ['exactly one stored operation', 'PCR', [{ name: 'PCR', id: 'op1' }]],
    ['two stored operations', 'Twin', ['Row 2: 2 operations are named “Twin”.']],
    ['none', 'Ligation', ['Row 2: No operation named “Ligation”.']]
  ])('C3 — no row of that name, %s', (_case, name, expected) => {
    const raw = book({ operations: [['op2', 'Gel', '']], bundles: bundle(name) });
    if (typeof expected[0] === 'string') expect(rowsOf(raw)['bundles:2'].errors).toEqual(expected);
    else expect(steps(raw)).toEqual(expected);
  });

  it('the one row that carries the name has an id no operation has → an error', () => {
    const raw = book({ operations: [['gone', 'PCR', '']], bundles: bundle('PCR') });
    expect(rowsOf(raw)['bundles:2'].errors).toEqual(['Row 2: Row 2 is named “PCR”, but no operation has its id.']);
  });
});

describe('C — a parameter named inside a conditionalDisplayLogic condition', () => {
  const showIf = (raw: RawWorkbook, ownerIndex = 0): any => planOf(raw).parameterList!.work.owners[ownerIndex].entries.find((entry) => entry.next.name === 'Dilution')?.next.showIf;
  const dilution = (condition: string): string[] => ['', 'Buffers', '', 'Dilution', 'Number', condition];

  it('C1: the name is a new row’s and a stored parameter’s → the new row’s, which the condition then needs', () => {
    const raw = book({ parameterList: [['', 'Buffers', '', 'Volume', 'Number', ''], dilution('"Volume">5')] });
    const rows = rowsOf(raw);
    expect(rows['parameterList:2']).toMatchObject({ action: 'create', warnings: [SAME('parameter')], selectedByDefault: false });
    expect(rows['parameterList:3']).toMatchObject({ action: 'create', errors: [], needs: [{ what: 'parameter “Volume”', anyOf: ['parameterList:2'] }] });
    expect(showIf(raw)).toEqual({ parameterId: 'volume_2', op: 'gt', value: 5 });
  });

  it('C1: with the new row unticked the condition’s row is blocked — it does not fall back to the stored parameter', async () => {
    const raw = book({ parameterList: [['', 'Buffers', '', 'Volume', 'Number', ''], dilution('"Volume">5')] });
    const plan = planOf(raw);
    expect(unmetNeeds(plan, tickedKeys(plan, {}))).toEqual({ 'parameterList:3': 'Parameter “Volume” was not created.' });
    const { calls, summary } = await run(raw);
    expect(calls).toEqual([]);
    expect(summary.rowErrors).toEqual({ 'parameterList:3': 'Parameter “Volume” was not created.' });
  });

  it('C1: applied, the condition is written with the id the new parameter was given', async () => {
    const raw = book({ parameterList: [['', 'Buffers', '', 'Volume', 'Number', ''], dilution('"Volume">5')] });
    const { calls } = await run(raw, { 'parameterList:2': true });
    const written = (calls[0][2] as any).parameters;
    expect(written.map((p: any) => p.id)).toEqual(['volume', 'ph', 'volume_2', 'dilution']);
    expect(written[3].showIf).toEqual({ parameterId: 'volume_2', op: 'gt', value: 5 });
  });

  it('C1: the new row has an error → the condition’s row is an error, not a reference to the stored parameter', () => {
    const raw = book({ parameterList: [['', 'Buffers', '', 'Volume', 'Bogus', ''], dilution('"Volume">5')] });
    expect(rowsOf(raw)['parameterList:3']).toMatchObject({ action: 'skip', errors: ['conditionalDisplayLogic: Row 2, which would create “Volume”, has an error.'] });
  });

  it('C1: a row with an id carries its new name → the stored parameter, with nothing to wait for', () => {
    const raw = book({ parameterList: [['volume', 'Buffers', '', 'Final volume', 'Number', ''], dilution('"Final volume">5')] });
    expect(rowsOf(raw)['parameterList:3']).toMatchObject({ action: 'create', errors: [], needs: [] });
    expect(showIf(raw)).toEqual({ parameterId: 'volume', op: 'gt', value: 5 });
  });

  it('C1: so does an id row that is an error for its own reasons', () => {
    const raw = book({ parameterList: [['volume', 'Buffers', '', 'Final volume', 'Bogus', ''], dilution('"Final volume">5')] });
    expect(rowsOf(raw)['parameterList:2'].action).toBe('skip');
    expect(rowsOf(raw)['parameterList:3']).toMatchObject({ action: 'create', errors: [], needs: [] });
    expect(showIf(raw)).toEqual({ parameterId: 'volume', op: 'gt', value: 5 });
  });

  it('C1: a stored parameter that a row renames is not found by its old name', () => {
    const raw = book({ parameterList: [['volume', 'Buffers', '', 'Final volume', 'Number', ''], dilution('"Volume">5')] });
    expect(rowsOf(raw)['parameterList:3'].errors).toEqual(['conditionalDisplayLogic: No parameter is named “Volume” here.']);
  });

  it('C2: two rows of the owner carry the name → an error naming them', () => {
    const raw = book({ parameterList: [['volume', 'Buffers', '', 'Volume', 'Number', ''], ['', 'Buffers', '', 'Volume', 'Number', ''], dilution('"Volume">5')] });
    expect(rowsOf(raw)['parameterList:4']).toMatchObject({ action: 'skip', errors: ['conditionalDisplayLogic: Rows 2 and 3 are both named “Volume” — rename one so this row can say which.'] });
  });

  it('C3: no row carries the name → the owner’s stored parameter; an unknown name is today’s error', () => {
    const stored = book({ parameterList: [dilution('"pH">5')] });
    expect(rowsOf(stored)['parameterList:2']).toMatchObject({ action: 'create', errors: [], needs: [] });
    expect(showIf(stored)).toEqual({ parameterId: 'ph', op: 'gt', value: 5 });
    expect(rowsOf(book({ parameterList: [dilution('"Nope">5')] }))['parameterList:2'].errors).toEqual(['conditionalDisplayLogic: No parameter is named “Nope” here.']);
  });

  it('C3: two stored parameters of that name and no row → today’s error', () => {
    const twins = catalogOf({ sets: [{ id: 's1', name: 'Buffers', parameters: [{ id: 'a', name: 'Volume', type: 'number' }, { id: 'b', name: 'Volume', type: 'number' }] }] });
    const rows = allRows(planOf(book({ parameterList: [dilution('"Volume">5')] }), twins));
    expect(rows[0].errors).toEqual(['conditionalDisplayLogic: 2 parameters are named “Volume” here.']);
  });

  it('the scope is unchanged: a named set is looked up in that set’s rows, then that set’s stored parameters', async () => {
    const raw = book({ parameterList: [['', 'Buffers', '', 'Volume', 'Number', ''], ['', '', 'PCR', 'Dilution', 'Number', '"Buffers"."Volume">5 && "Buffers"."pH"<9']] });
    expect(rowsOf(raw)['parameterList:3']).toMatchObject({ action: 'create', errors: [], needs: [{ what: 'parameter “Volume”', anyOf: ['parameterList:2'] }] });
    expect(showIf(raw, 1)).toEqual({ all: [{ parameterId: 'volume_2', parameterSetId: 's1', op: 'gt', value: 5 }, { parameterId: 'ph', parameterSetId: 's1', op: 'lt', value: 9 }] });
    expect((await run(raw)).calls).toEqual([]);
    const { calls } = await run(raw, { 'parameterList:2': true });
    expect((calls[1][2] as any).parameters[1].showIf.all[0]).toEqual({ parameterId: 'volume_2', parameterSetId: 's1', op: 'gt', value: 5 });
  });

  it('the scope is unchanged: an unqualified name is not looked up in another owner’s rows', () => {
    const raw = book({ parameterList: [['', 'Buffers', '', 'Volume', 'Number', ''], ['', '', 'Gel', 'Dilution', 'Number', '"Volume">5']] });
    expect(rowsOf(raw)['parameterList:3'].errors).toEqual(['conditionalDisplayLogic: No parameter is named “Volume” here.']);
  });
});

describe('a hand-authored workbook with no ids, against a catalog that already has those names', () => {
  const raw = book({
    operations: [['', 'PCR', '']],
    parameterList: [
      ['', 'Buffers', '', 'Volume', 'Number', ''],
      ['', 'Buffers', '', 'Dilution', 'Number', '"Volume">5'],
      ['', '', 'PCR', 'Cycles', 'Number', '"Buffers"."Volume">2']
    ],
    bundles: [['', 'Cloning', '1', 'PCR']],
    sowSections: [['', 'terms', 'Default', 'Net 30.']]
  });

  it('every row that names a stored record is a create, warned and unticked; none is an update', () => {
    const rows = rowsOf(raw);
    expect(Object.values(rows).map((row) => row.action)).toEqual(['create', 'create', 'create', 'create', 'create', 'create']);
    expect(Object.values(rows).flatMap((row) => row.errors)).toEqual([]);
    for (const [key, noun] of [['operations:2', 'operation'], ['parameterList:2', 'parameter'], ['sowSections:2', 'SOW text block']]) {
      expect(rows[key]).toMatchObject({ action: 'create', warnings: [SAME(noun)], selectedByDefault: false });
    }
    // The bundle is a second "Cloning", and its step is the new PCR.
    expect(rows['bundles:2']).toMatchObject({ action: 'create', warnings: [SAME('bundle'), NEW_PCR], selectedByDefault: false });
    expect(rows['parameterList:4']).toMatchObject({ action: 'create', warnings: [NEW_PCR], selectedByDefault: true });
  });

  it('its dependents resolve to the new rows', () => {
    const rows = rowsOf(raw);
    expect(rows['parameterList:3'].needs).toEqual([{ what: 'parameter “Volume”', anyOf: ['parameterList:2'] }]);
    expect(rows['parameterList:4'].needs).toEqual([{ what: 'operation “PCR”', anyOf: ['operations:2'] }, { what: 'parameter “Volume”', anyOf: ['parameterList:2'] }]);
    expect(rows['bundles:2'].needs).toEqual([{ what: 'operation “PCR”', anyOf: ['operations:2'] }]);
    const plan = planOf(raw);
    expect(plan.parameterList!.work.owners[1]).toMatchObject({ kind: 'operation', name: 'PCR', operationRowKey: 'operations:2', stored: [] });
    expect(plan.bundles!.work.bundles['bundles:2'].changes.steps).toEqual([{ name: 'PCR', rowKey: 'operations:2' }]);
  });

  it('as previewed — nothing ticked that names a stored record — nothing is written', async () => {
    const plan = planOf(raw);
    const ticked = tickedKeys(plan, {});
    expect([...ticked].sort()).toEqual(['parameterList:3', 'parameterList:4']);
    expect(Object.keys(unmetNeeds(plan, ticked)).sort()).toEqual(['parameterList:3', 'parameterList:4']);
    const { calls, summary } = await run(raw);
    expect(calls).toEqual([]);
    expect(Object.keys(summary.rowErrors).sort()).toEqual(['parameterList:3', 'parameterList:4']);
  });

  it('with every row unticked nothing at all is written, not even an upload log', async () => {
    const off = Object.fromEntries(Object.keys(rowsOf(raw)).map((key) => [key, false]));
    expect((await run(raw, off)).all).toEqual([]);
  });

  it('with every row ticked, second records are created and the dependents point at them', async () => {
    const on = Object.fromEntries(Object.keys(rowsOf(raw)).map((key) => [key, true]));
    const { calls, summary } = await run(raw, on);
    expect(summary.rowErrors).toEqual({});
    expect(calls.map((c) => c[0])).toEqual(['updateParameterSet', 'createService', 'updateService', 'createBundle', 'createSowTextPreset']);
    const set = (calls[0][2] as any).parameters;
    expect(set.map((p: any) => p.id)).toEqual(['volume', 'ph', 'volume_2', 'dilution']);
    expect(set[3].showIf).toEqual({ parameterId: 'volume_2', op: 'gt', value: 5 });
    expect(calls[2][1]).toBe('new-createService-1');
    expect((calls[2][2] as any).parameters).toEqual([expect.objectContaining({ id: 'cycles', name: 'Cycles', showIf: { parameterId: 'volume_2', parameterSetId: 's1', op: 'gt', value: 2 } })]);
    expect(calls[3][1]).toMatchObject({ label: 'Cloning', services: ['new-createService-1'] });
  });
});

// ---------------------------------------------------------------- fix round 1

describe('fix C1 — one operation reached by two names is one owner and one write', () => {
  const raw = book({
    operations: [['op1', 'PCR v2', '']],
    parameterList: [['cycles', '', 'PCR', 'Cycles', 'Text', ''], ['', '', 'PCR v2', 'Extension', 'Number', '']]
  });

  it('rows on the old name and on the new name plan under one owner, each labelled as written', () => {
    const plan = planOf(raw);
    expect(plan.parameterList!.work.owners).toHaveLength(1);
    expect(plan.parameterList!.work.owners[0]).toMatchObject({ kind: 'operation', existingId: 'op1' });
    expect(plan.parameterList!.rows.map((r) => [r.label, r.action, r.errors, r.warnings])).toEqual([['PCR › Cycles', 'update', [], []], ['PCR v2 › Extension', 'create', [], []]]);
  });

  it('a single update carries both edits', async () => {
    const { calls, summary } = await run(raw);
    expect(summary.rowErrors).toEqual({});
    expect(calls).toEqual([
      ['updateService', 'op1', { name: 'PCR v2' }],
      ['updateService', 'op1', { parameters: [{ id: 'cycles', name: 'Cycles', type: 'string' }, expect.objectContaining({ id: 'extension', name: 'Extension', type: 'number' })] }]
    ]);
  });

  it('one parameterId given under both names is the usual error on both rows', () => {
    const rows = rowsOf(book({ operations: [['op1', 'PCR v2', '']], parameterList: [['cycles', '', 'PCR', 'Cycles', 'Text', ''], ['cycles', '', 'PCR v2', 'Cycles', 'Number', '']] }));
    expect(rows['parameterList:2'].errors).toEqual(['Rows 2 and 3 both resolve to “Cycles”.']);
    expect(rows['parameterList:3'].errors).toEqual(['Rows 2 and 3 both resolve to “Cycles”.']);
  });
});

describe('fix C2 / W2 — a name that now means another operation says so on the rows that use it', () => {
  // Both operations have an own parameter `cycles`; Gel's is Text, PCR's is Number.
  const two = catalogOf({
    ...catalog,
    operations: [catalog.operations[0], op('op2', 'Gel', { ownParameters: [{ id: 'cycles', name: 'Cycles', type: 'string' }] })],
    bundles: [{ id: 'b1', label: 'Cloning', icon: '', steps: [{ id: 'op2', name: 'Gel' }] }]
  });
  const rowsIn = (raw: RawWorkbook): Record<string, PlanRow> => Object.fromEntries(allRows(planOf(raw, two)).map((row) => [row.key, row]));
  const NOW = (name: string, row: number): string => `“${name}” now means the operation in row ${row}, not the operation currently named “${name}”.`;
  const NEW = (name: string, row: number): string => `“${name}” means the new operation in row ${row}, not the existing operation named “${name}”.`;
  const asDownloaded = [['cycles', '', 'PCR', 'Cycles', 'Number', ''], ['cycles', '', 'Gel', 'Cycles', 'Text', '']];
  const swap = [['op1', 'Gel', ''], ['op2', 'PCR', '']];

  it('two operations swap names: each Parameter List row that would now write to the other operation is warned and unticked', () => {
    const rows = rowsIn(book({ operations: swap, parameterList: asDownloaded }));
    expect(rows['parameterList:2']).toMatchObject({ action: 'update', errors: [], warnings: [NOW('PCR', 3)], selectedByDefault: false });
    expect(rows['parameterList:3']).toMatchObject({ action: 'update', errors: [], warnings: [NOW('Gel', 2)], selectedByDefault: false });
  });

  it('a referencing row that ends up unchanged needs no warning', () => {
    // Swapped in both sheets: each row already says what its operation holds.
    const rows = rowsIn(book({ operations: swap, parameterList: [['cycles', '', 'Gel', 'Cycles', 'Number', ''], ['cycles', '', 'PCR', 'Cycles', 'Text', '']] }));
    expect(rows['parameterList:2']).toMatchObject({ action: 'unchanged', warnings: [] });
    expect(rows['parameterList:3']).toMatchObject({ action: 'unchanged', warnings: [] });
  });

  it('an operation renamed onto a name another operation is leaving: same warning, unticked', () => {
    const rows = rowsIn(book({ operations: [['op1', 'PCR old', ''], ['op2', 'PCR', '']], parameterList: [['cycles', '', 'PCR', 'Cycles', 'Number', '']] }));
    expect(rows['parameterList:2']).toMatchObject({ action: 'update', warnings: [NOW('PCR', 3)], selectedByDefault: false });
  });

  it('an operation renamed onto a name whose holder has no row in the workbook: same warning, unticked (nothing else holds it back)', () => {
    const rows = rowsIn(book({ operations: [['op2', 'PCR', '']], parameterList: [['cycles', '', 'PCR', 'Cycles', 'Number', '']] }));
    expect(rows['parameterList:2']).toMatchObject({ action: 'update', warnings: [NOW('PCR', 2)], selectedByDefault: false });
  });

  it('Bundles: a step whose name moved is warned and unticked; a bundle that ends up unchanged is not', () => {
    const moved = rowsIn(book({ operations: swap, bundles: [['b1', 'Cloning', '1', 'Gel']] }));
    expect(moved['bundles:2']).toMatchObject({ action: 'update', changed: ['steps'], errors: [], warnings: [NOW('Gel', 2)], selectedByDefault: false });
    const same = rowsIn(book({ operations: swap, bundles: [['b1', 'Cloning', '1', 'PCR']] }));
    expect(same['bundles:2']).toMatchObject({ action: 'unchanged', warnings: [] });
    const vacated = rowsIn(book({ operations: [['op2', 'Gel old', ''], ['op1', 'Gel', '']], bundles: [['b1', 'Cloning', '1', 'Gel']] }));
    expect(vacated['bundles:2']).toMatchObject({ action: 'update', warnings: [NOW('Gel', 3)], selectedByDefault: false });
  });

  it('a plain rename — a name nobody else has or had — raises no such warning', () => {
    const rows = rowsIn(book({ operations: [['op1', 'PCR v2', '']], parameterList: [['', '', 'PCR v2', 'Extension', 'Number', '']], bundles: [['b1', 'Cloning', '1', 'PCR v2']] }));
    expect(rows['parameterList:2']).toMatchObject({ action: 'create', warnings: [], selectedByDefault: true });
    expect(rows['bundles:2']).toMatchObject({ action: 'update', warnings: [], selectedByDefault: true });
  });

  it('W2: a namesake create with no row for the stored operation warns its dependents, and leaves their default alone', () => {
    const rows = rowsIn(book({ operations: [['', 'PCR', '']], parameterList: [['', '', 'PCR', 'Cycles', 'Number', '']], bundles: [['b1', 'Cloning', '1', 'PCR']] }));
    expect(rows['parameterList:2']).toMatchObject({ action: 'create', warnings: [NEW('PCR', 2)], selectedByDefault: true, needs: [{ what: 'operation “PCR”', anyOf: ['operations:2'] }] });
    expect(rows['bundles:2']).toMatchObject({ action: 'update', changed: ['steps'], warnings: [NEW('PCR', 2)], selectedByDefault: true, needs: [{ what: 'operation “PCR”', anyOf: ['operations:2'] }] });
  });

  it('W2: a create named like a stored operation that this workbook renames away is the unticked case', () => {
    const rows = rowsIn(book({ operations: [['', 'PCR', ''], ['op1', 'PCR old', '']], bundles: [['b1', 'Cloning', '1', 'PCR']] }));
    expect(rows['bundles:2']).toMatchObject({ action: 'update', warnings: [NOW('PCR', 2)], selectedByDefault: false });
  });
});

describe('fix I3 — a stored parameter that has no id', () => {
  const idless = catalogOf({ sets: [{ id: 's1', name: 'Seq', parameters: [{ name: 'Sequencing type', type: 'string' }, { id: 'volume', name: 'Volume', type: 'number' }, { name: 'Notes', type: 'string' }] }] });
  const rowsIn = (rows: string[][]) => planOf(book({ parameterList: rows }), idless);

  it('round-trips: its blank-id row is that parameter, unchanged, with no warning', () => {
    const plan = rowsIn([['', 'Seq', '', 'Sequencing type', 'Text', ''], ['volume', 'Seq', '', 'Volume', 'Number', ''], ['', 'Seq', '', 'Notes', 'Text', '']]);
    expect(plan.parameterList!.rows.map((r) => [r.action, r.warnings, r.errors])).toEqual(Array(3).fill(['unchanged', [], []]));
    expect(plan.parameterList!.work.owners[0].entries).toEqual([]);
  });

  it('an edited row updates it in place, still without an id, and leaves the other id-less parameter alone', async () => {
    const plan = rowsIn([['', 'Seq', '', 'Notes', 'Number', '']]);
    expect(plan.parameterList!.rows[0]).toMatchObject({ action: 'update', changed: ['type'], warnings: [], errors: [], selectedByDefault: true });
    const rec = recorder();
    await applyWorkbook(plan, tickedKeys(plan, {}), idless, rec.mutator, { fileName: 'c.xlsx', uploaderName: 'Ada' });
    expect(rec.calls()).toEqual([['updateParameterSet', 's1', { parameters: [idless.sets[0].parameters[0], idless.sets[0].parameters[1], { name: 'Notes', type: 'number' }] }]]);
  });

  it('a blank-id row never matches a stored parameter that has an id', () => {
    const plan = rowsIn([['', 'Seq', '', 'Volume', 'Number', '']]);
    expect(plan.parameterList!.rows[0]).toMatchObject({ action: 'create', warnings: [SAME('parameter')], selectedByDefault: false });
  });

  it('two id-less stored parameters of one name are not matched: the row is a warned create', () => {
    const twins = catalogOf({ sets: [{ id: 's1', name: 'Seq', parameters: [{ name: 'Notes', type: 'string' }, { name: 'Notes', type: 'string' }] }] });
    expect(allRows(planOf(book({ parameterList: [['', 'Seq', '', 'Notes', 'Text', '']] }), twins))[0]).toMatchObject({ action: 'create', warnings: [SAME('parameter')], selectedByDefault: false });
  });

  it('a condition that names it gets the resolver’s own answer, not a row error', () => {
    const plan = rowsIn([['', 'Seq', '', 'Notes', 'Text', ''], ['volume', 'Seq', '', 'Volume', 'Number', '"Notes"=="x"']]);
    expect(plan.parameterList!.rows[1].errors).toEqual(['conditionalDisplayLogic: “Notes” has no id yet — save it first.']);
  });
});

describe('fix I4 — which row carries a condition’s name is decided on the exact name', () => {
  const showIf = (raw: RawWorkbook): any => planOf(raw).parameterList!.work.owners[0].entries.find((entry) => entry.next.name === 'Dilution')?.next.showIf;
  const dilution = (condition: string): string[] => ['', 'Buffers', '', 'Dilution', 'Number', condition];

  it('a near-duplicate new row does not take over the stored parameter’s name', () => {
    const raw = book({ parameterList: [['', 'Buffers', '', 'volume', 'Number', ''], dilution('"Volume">5')] });
    expect(rowsOf(raw)['parameterList:3']).toMatchObject({ action: 'create', errors: [], needs: [] });
    expect(showIf(raw)).toEqual({ parameterId: 'volume', op: 'gt', value: 5 });
  });

  it('nor does it make a false "both named" error when the stored parameter has its own row', () => {
    const raw = book({ parameterList: [['volume', 'Buffers', '', 'Volume', 'Number', ''], ['', 'Buffers', '', 'volume', 'Number', ''], dilution('"Volume">5')] });
    expect(rowsOf(raw)['parameterList:4']).toMatchObject({ action: 'create', errors: [], needs: [] });
    expect(showIf(raw)).toEqual({ parameterId: 'volume', op: 'gt', value: 5 });
  });

  it('the exact name of the near-duplicate row means that row', () => {
    const raw = book({ parameterList: [['', 'Buffers', '', 'volume', 'Number', ''], dilution('"volume">5')] });
    expect(rowsOf(raw)['parameterList:3']).toMatchObject({ errors: [], needs: [{ what: 'parameter “volume”', anyOf: ['parameterList:2'] }] });
    expect(showIf(raw)).toEqual({ parameterId: 'volume_2', op: 'gt', value: 5 });
  });

  it('only when no row and no stored parameter has the exact name does the loose lookup apply, as before', () => {
    const raw = book({ parameterList: [dilution('"volume">5 && "PH"<9')] });
    expect(rowsOf(raw)['parameterList:2']).toMatchObject({ action: 'create', errors: [], needs: [] });
    expect(showIf(raw)).toEqual({ all: [{ parameterId: 'volume', op: 'gt', value: 5 }, { parameterId: 'ph', op: 'lt', value: 9 }] });
  });
});

describe('fix W1 — parameter errors under an owner that is new or cannot be told apart', () => {
  it('(a) when the owner has an error its rows show that error only', () => {
    const rows = rowsOf(book({ operations: [['op1', 'PCR', ''], ['', 'PCR', '']], parameterList: [['cycles', '', 'PCR', 'Cycles', 'Number', ''], ['nope', '', 'PCR', 'Other', 'Number', '']] }));
    expect(rows['parameterList:2'].errors).toEqual([BOTH]);
    expect(rows['parameterList:3'].errors).toEqual([BOTH]);
  });

  it('(b) a parameterId under an operation this upload creates says the operation is new', () => {
    const rows = rowsOf(book({ operations: [['', 'PCR', '']], parameterList: [['cycles', '', 'PCR', 'Cycles', 'Number', ''], ['', '', 'PCR', 'Extension', 'Number', '']] }));
    expect(rows['parameterList:2']).toMatchObject({ action: 'skip', errors: ['“cycles” is a parameter id from an existing operation, but this row\'s operation is new (row 2). Clear the id to create the parameter.'] });
    expect(rows['parameterList:3']).toMatchObject({ action: 'create', errors: [] });
  });

  it('(b) and likewise under a parameter set this upload creates', () => {
    const rows = rowsOf(book({ parameterList: [['volume', 'Fresh', '', 'Volume', 'Number', '']] }));
    expect(rows['parameterList:2'].errors).toEqual(['“volume” is a parameter id from an existing parameter set, but this row\'s parameter set is new. Clear the id to create the parameter.']);
  });
});
