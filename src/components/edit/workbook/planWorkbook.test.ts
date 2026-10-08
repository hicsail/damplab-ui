import { describe, expect, it } from 'vitest';
import { allRows, countsFor, planWorkbook, plansMatch, previewOrder, sheetPlans, survivingOverrides, tickedKeys, unmetNeeds, untickedCounts } from './planWorkbook';
import { catalogOf, rawSheet } from './testSupport';
import { PlanRow, RawWorkbook } from './types';

const catalog = catalogOf({
  operations: [{ id: 'op1', name: 'PCR', parameterSetIds: [], ownParameters: [] } as any],
  sets: [{ id: 's1', name: 'Buffers', parameters: [{ id: 'volume', name: 'Volume', type: 'number' }] }],
  sowSectionKeys: ['terms']
});
const options = { allowPricing: true, hideMissing: false };

/** A new set, a new operation that uses it and has its own parameter, a bundle of that operation, and a SOW block. */
const chained: RawWorkbook = {
  ignoredSheets: ['(Syntax)'],
  sheets: {
    parameterList: rawSheet('parameterList', ['parameterSet', 'operation', 'parameter', 'type'], [['Salts', '', 'NaCl', 'Number'], ['', 'Ligation', 'Insert', 'Text']]),
    operations: rawSheet('operations', ['name', 'parameterSet1'], [['Ligation', 'Salts'], ['PCR', '']]),
    bundles: rawSheet('bundles', ['BundleName', 'Order', 'Operation'], [['Cloning', '1', 'Ligation']]),
    sowSections: rawSheet('sowSections', ['sectionKey', 'name', 'text'], [['terms', 'Default', 'Net 30.']])
  }
};

describe('planWorkbook', () => {
  it('plans whichever recognised sheets are present, in tab order, and passes the ignored sheets through', () => {
    const plan = planWorkbook(chained, catalog, options);
    expect(sheetPlans(plan).map((s) => s.sheet)).toEqual(['operations', 'parameterList', 'bundles', 'sowSections']);
    expect(plan.ignoredSheets).toEqual(['(Syntax)']);
    const only = planWorkbook({ ignoredSheets: [], sheets: { bundles: chained.sheets.bundles } }, catalog, options);
    expect(sheetPlans(only).map((s) => s.sheet)).toEqual(['bundles']);
  });

  it('wires records one sheet creates to the rows of another that name them (rule 8)', () => {
    const plan = planWorkbook(chained, catalog, options);
    const byKey = Object.fromEntries(allRows(plan).map((r) => [r.key, r]));
    expect(byKey['operations:2']).toMatchObject({ action: 'create', errors: [], needs: [{ what: 'parameter set “Salts”', anyOf: ['parameterList:2'] }] });
    expect(byKey['operations:3'].action).toBe('unchanged');
    expect(byKey['parameterList:3']).toMatchObject({ action: 'create', errors: [], needs: [{ what: 'operation “Ligation”', anyOf: ['operations:2'] }] });
    expect(byKey['bundles:2']).toMatchObject({ action: 'create', errors: [], needs: [{ what: 'operation “Ligation”', anyOf: ['operations:2'] }] });
    expect(byKey['sowSections:2']).toMatchObject({ action: 'create', errors: [] });
  });

  it('passes the hide option to the Operations sheet only', () => {
    const plan = planWorkbook({ ignoredSheets: [], sheets: { operations: rawSheet('operations', ['name'], [['Ligation']]) } }, catalog, { allowPricing: true, hideMissing: true });
    expect(plan.operations!.rows.map((r) => r.key)).toEqual(['operations:2', 'hide:op1']);
  });
});

describe('ticks, dependencies and counts (rule 8)', () => {
  const plan = planWorkbook(chained, catalog, options);

  it('ticks every applicable row by default, and never a row that cannot be applied', () => {
    expect([...tickedKeys(plan, {})].sort()).toEqual(['bundles:2', 'operations:2', 'parameterList:2', 'parameterList:3', 'sowSections:2']);
    expect(tickedKeys(plan, { 'operations:3': true }).has('operations:3')).toBe(false);
    expect(tickedKeys(plan, { 'sowSections:2': false }).has('sowSections:2')).toBe(false);
  });

  it('nothing is blocked while everything is ticked', () => {
    expect(unmetNeeds(plan, tickedKeys(plan, {}))).toEqual({});
  });

  it('unticking a provider blocks what needs it, all the way down the chain', () => {
    const ticked = tickedKeys(plan, { 'parameterList:2': false });
    expect(unmetNeeds(plan, ticked)).toEqual({
      'operations:2': 'Parameter set “Salts” was not created.',
      'parameterList:3': 'Operation “Ligation” was not created.',
      'bundles:2': 'Operation “Ligation” was not created.'
    });
  });

  it('counts ticked, unblocked rows by action and everything else as skipped', () => {
    const ticked = tickedKeys(plan, { 'parameterList:2': false });
    const blocked = unmetNeeds(plan, ticked);
    expect(countsFor(plan.operations!.rows, ticked, blocked)).toEqual({ create: 0, update: 0, hide: 0, skip: 2 });
    expect(countsFor(plan.sowSections!.rows, ticked, blocked)).toEqual({ create: 1, update: 0, hide: 0, skip: 0 });
    expect(countsFor(plan.operations!.rows, tickedKeys(plan, {}), {})).toEqual({ create: 1, update: 0, hide: 0, skip: 1 });
  });
});

describe('plansMatch (I1: the plan re-made at Import against the plan that was previewed)', () => {
  it('is true for the same file against an unchanged catalog', () => {
    expect(plansMatch(planWorkbook(chained, catalog, options), planWorkbook(chained, catalog, options))).toBe(true);
  });

  it('is true when the catalog changed somewhere no row looks', () => {
    const grown = catalogOf({ ...catalog, sets: [...catalog.sets, { id: 's2', name: 'Elsewhere', parameters: [] }] });
    expect(plansMatch(planWorkbook(chained, catalog, options), planWorkbook(chained, grown, options))).toBe(true);
  });

  it('is false when a row’s action changes: a record the file would create now exists', () => {
    const made = catalogOf({ ...catalog, operations: [...catalog.operations, { id: 'op2', name: 'Ligation', parameterSetIds: [], ownParameters: [] } as any] });
    expect(plansMatch(planWorkbook(chained, catalog, options), planWorkbook(chained, made, options))).toBe(false);
  });

  it('is false when the changed fields differ', () => {
    const file = { ignoredSheets: [], sheets: { operations: rawSheet('operations', ['id', 'name', 'description'], [['op1', 'PCR', 'Amplify']]) } };
    const before = catalogOf({ ...catalog, operations: [{ id: 'op1', name: 'PCR', description: 'Old', parameterSetIds: [], ownParameters: [] } as any] });
    const after = catalogOf({ ...catalog, operations: [{ id: 'op1', name: 'PCR', description: 'Amplify', parameterSetIds: [], ownParameters: [] } as any] });
    expect(plansMatch(planWorkbook(file, before, options), planWorkbook(file, after, options))).toBe(false);
  });

  it('is false when an error or a warning appears or goes', () => {
    const file = { ignoredSheets: [], sheets: { operations: rawSheet('operations', ['id', 'name'], [['op1', 'PCR']]) } };
    const gone = catalogOf({ ...catalog, operations: [] });
    expect(plansMatch(planWorkbook(file, catalog, options), planWorkbook(file, gone, options))).toBe(false);
    const near = catalogOf({ ...catalog, operations: [{ id: 'op7', name: 'pcr ', parameterSetIds: [], ownParameters: [] } as any] });
    const byName = { ignoredSheets: [], sheets: { operations: rawSheet('operations', ['name'], [['PCR']]) } };
    expect(plansMatch(planWorkbook(byName, catalog, options), planWorkbook(byName, near, options))).toBe(false);
  });

  it('is false when a hide row appears', () => {
    const file = { ignoredSheets: [], sheets: { operations: rawSheet('operations', ['name'], [['PCR']]) } };
    const more = catalogOf({ ...catalog, operations: [...catalog.operations, { id: 'op5', name: 'New one', parameterSetIds: [], ownParameters: [] } as any] });
    const hide = { allowPricing: true, hideMissing: true };
    expect(plansMatch(planWorkbook(file, catalog, hide), planWorkbook(file, more, hide))).toBe(false);
  });
});

describe('previewOrder (I3: the rows that matter come first)', () => {
  const row = (key: string, over: Partial<PlanRow>): PlanRow => ({
    key, sheet: 'operations', rowNumber: Number(key.split(':')[1]) || null, label: key, action: 'unchanged', matchedByName: false, changed: [], errors: [], warnings: [], selectedByDefault: false, needs: [], ...over
  });
  const rows = [
    row('operations:2', {}),
    row('operations:3', { action: 'create' }),
    row('operations:4', {}),
    row('operations:5', { action: 'skip', errors: ['boom'] }),
    row('operations:6', { action: 'update' }),
    row('operations:7', { action: 'create', warnings: ['near-duplicate'] }),
    row('operations:8', { action: 'unchanged', warnings: ['order is ignored'] }),
    row('operations:9', { action: 'skip', errors: ['again'] }),
    row('hide:x', { action: 'hide' })
  ];

  it('puts errors, then warnings (whatever the action, F22), then writes, then unchanged; sheet order within each band', () => {
    expect(previewOrder(rows, {}).map((r) => r.key)).toEqual(['operations:5', 'operations:9', 'operations:7', 'operations:8', 'operations:3', 'operations:6', 'hide:x', 'operations:2', 'operations:4']);
  });

  it('treats a row that is blocked by an unmet need as an error row', () => {
    expect(previewOrder(rows, { 'operations:6': 'Parameter set “Salts” was not created.' }).map((r) => r.key).slice(0, 3)).toEqual(['operations:5', 'operations:6', 'operations:9']);
  });

  it('keeps every row and leaves the input alone', () => {
    const copy = [...rows];
    expect(previewOrder(rows, {})).toHaveLength(rows.length);
    expect(rows).toEqual(copy);
  });
});

describe('untickedCounts (I3: an unticked create or update is never uncounted)', () => {
  it('counts applicable rows that are not ticked, by action', () => {
    const plan = planWorkbook(chained, catalog, options);
    const ticked = tickedKeys(plan, { 'parameterList:2': false, 'sowSections:2': false });
    expect(untickedCounts(plan.parameterList!.rows, ticked)).toEqual({ create: 1, update: 0, hide: 0 });
    expect(untickedCounts(plan.sowSections!.rows, ticked)).toEqual({ create: 1, update: 0, hide: 0 });
    expect(untickedCounts(plan.operations!.rows, ticked)).toEqual({ create: 0, update: 0, hide: 0 });
  });
});

describe('survivingOverrides (F23: a refreshed preview keeps the ticks that still apply)', () => {
  const file = { ignoredSheets: [], sheets: { operations: rawSheet('operations', ['id', 'name'], [['op1', 'PCR'], ['', 'Ligation']]) } };
  const plan = planWorkbook(file, catalog, options);
  const [first, second] = plan.operations!.rows.map((row) => row.key);

  it('keeps an override whose row is still in the new plan, ticked or unticked', () => {
    expect(survivingOverrides({ [first]: false, [second]: true }, plan)).toEqual({ [first]: false, [second]: true });
  });

  it('drops an override whose row is no longer in the new plan', () => {
    expect(survivingOverrides({ [first]: false, 'operations:99': true, 'hide:gone': false }, plan)).toEqual({ [first]: false });
  });

  it('is empty when there is nothing to keep', () => {
    expect(survivingOverrides({}, plan)).toEqual({});
  });
});
