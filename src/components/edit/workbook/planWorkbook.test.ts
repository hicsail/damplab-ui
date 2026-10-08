import { describe, expect, it } from 'vitest';
import { allRows, countsFor, planWorkbook, sheetPlans, tickedKeys, unmetNeeds } from './planWorkbook';
import { catalogOf, rawSheet } from './testSupport';
import { RawWorkbook } from './types';

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
