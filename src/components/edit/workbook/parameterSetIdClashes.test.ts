import { describe, expect, it } from 'vitest';
import { applyWorkbook, WorkbookMutator } from './applyWorkbook';
import { projectedSets } from './parameterListSheet';
import { allRows, planWorkbook, tickedKeys, unmetNeeds, WorkbookPlan } from './planWorkbook';
import { catalogOf, rawSheet } from './testSupport';
import { CatalogSnapshot, PlanRow, RawWorkbook } from './types';

/**
 * Two parameter sets one operation uses must never give it the same parameter
 * id (the server refuses the operation, effective-parameters.ts `clashMessage`).
 * An id this upload mints avoids it; two ids already stored cannot, and the
 * Operations row that would bring them together is refused in the preview.
 */
const options = { allowPricing: true, hideMissing: false };
const book = (sheets: RawWorkbook['sheets']): RawWorkbook => ({ ignoredSheets: [], sheets });
const op = (id: string, name: string, parameterSetIds: string[], own: any[] = []): any => ({ id, name, hiddenFromClients: false, parameterSetIds, ownParameters: own });
const assay = (extra: Record<string, unknown> = {}): any => ({ id: 'assay', name: 'Assay', type: 'string', ...extra });

/**
 * Records every call and answers as the server does: an operation whose sets
 * share a parameter id is refused (on its own write, and on the write of a set
 * it uses).
 */
const server = (catalog: CatalogSnapshot) => {
  const calls: Array<[string, ...unknown[]]> = [];
  const sets = new Map<string, { name: string; ids: string[] }>(catalog.sets.map((set) => [set.id, { name: set.name, ids: set.parameters.map((p) => String(p.id)) }]));
  const operations = new Map<string, { name: string; setIds: string[] }>(catalog.operations.map((o) => [o.id, { name: o.name, setIds: o.parameterSetIds }]));
  let next = 0;
  const clashOf = (setIds: string[]): string | undefined => {
    const firstSeen = new Map<string, string>();
    for (const setId of setIds) {
      const set = sets.get(setId)!;
      for (const id of new Set(set.ids)) {
        const owner = firstSeen.get(id);
        if (owner !== undefined && owner !== set.name) return `Parameter id "${id}" is in both "${owner}" and "${set.name}".`;
        firstSeen.set(id, set.name);
      }
    }
    return undefined;
  };
  const writeSet = (id: string, name: string, parameters: any[]): void => {
    const before = sets.get(id);
    sets.set(id, { name, ids: parameters.map((p) => String(p.id)) });
    const users = [...operations.values()].filter((o) => o.setIds.includes(id) && clashOf(o.setIds) !== undefined);
    if (users.length === 0) return;
    if (before) sets.set(id, before);
    else sets.delete(id);
    throw new Error(`Saving "${name}" would give ${users.map((o) => `"${o.name}"`).join(', ')} the same parameter id from two sets.`);
  };
  const writeOperation = (id: string, name: string, changes: any): void => {
    if (!Array.isArray(changes.parameterSetIds)) return;
    const clash = clashOf(changes.parameterSetIds);
    if (clash !== undefined) throw new Error(clash);
    operations.set(id, { name, setIds: changes.parameterSetIds });
  };
  const log = (name: string, ...args: unknown[]): void => void calls.push([name, ...args]);
  const noop = (name: string, returnsId: boolean) => async (...args: unknown[]): Promise<any> => {
    log(name, ...args);
    return returnsId ? `new-${name}-${(next += 1)}` : undefined;
  };
  const mutator: WorkbookMutator = {
    createParameterSet: async (input) => {
      log('createParameterSet', input);
      const id = `new-set-${(next += 1)}`;
      writeSet(id, input.name, input.parameters);
      return id;
    },
    updateParameterSet: async (id, changes) => {
      log('updateParameterSet', id, changes);
      writeSet(id, sets.get(id)!.name, changes.parameters);
    },
    createService: async (input) => {
      log('createService', input);
      const id = `new-op-${(next += 1)}`;
      writeOperation(id, String(input.name), input);
      return id;
    },
    updateService: async (id, changes) => {
      log('updateService', id, changes);
      writeOperation(id, operations.get(id)?.name ?? id, changes);
    },
    createCategory: noop('createCategory', true), updateCategory: noop('updateCategory', false),
    createBundle: noop('createBundle', true), updateBundle: noop('updateBundle', false),
    createSowTextPreset: noop('createSowTextPreset', true), updateSowTextPreset: noop('updateSowTextPreset', false),
    createUploadLog: noop('createUploadLog', false)
  };
  return { mutator, calls: () => calls.filter((c) => c[0] !== 'createUploadLog') };
};

const run = async (raw: RawWorkbook, catalog: CatalogSnapshot, overrides: Record<string, boolean> = {}, applyCatalog = catalog) => {
  const plan = planWorkbook(raw, catalog, options);
  const rec = server(applyCatalog);
  const summary = await applyWorkbook(plan, tickedKeys(plan, overrides), applyCatalog, rec.mutator, { fileName: 'c.xlsx', uploaderName: 'Ada' });
  return { plan, summary, calls: rec.calls() };
};
const errorsOf = (plan: WorkbookPlan): Record<string, string[]> => Object.fromEntries(allRows(plan).filter((row) => row.errors.length > 0).map((row) => [row.key, row.errors]));
const rowOf = (plan: WorkbookPlan, key: string): PlanRow => allRows(plan).find((row) => row.key === key)!;
/** The parameter ids each set would end with if every applicable row were applied, by set name. */
const plannedIds = (plan: WorkbookPlan, catalog: CatalogSnapshot): Record<string, string[]> => {
  const owners = plan.parameterList!.work.owners;
  const live = new Set(owners.flatMap((owner) => owner.entries.map((entry) => entry.rowKey)));
  return Object.fromEntries(projectedSets(owners, catalog.sets, live).map((set) => [set.name, set.parameters.map((p) => String(p.id))]));
};
/** What was written, by set name: the set's id and its parameters. */
const writtenSets = (calls: Array<[string, ...unknown[]]>): Record<string, any[]> =>
  Object.fromEntries(calls.filter((c) => c[0] === 'createParameterSet').map((c) => [(c[1] as any).name, (c[1] as any).parameters]));

// The workbook that failed on staging, cut down: no ids anywhere, no `operation` and no `parameterId` column.
// (Its "Assay " cell under Protein Quantification has a trailing space, which the reader trims.)
const LIST = ['parameterSet', 'parameter', 'type', 'options', 'conditionalDisplayLogic'];
const OPERATIONS = ['serviceCategory', 'name', 'parameterSet1', 'parameterSet2'];
const PQ_ASSAY = ['Protein Quantification', 'Assay', 'Dropdown', 'BCA Assay; Bradford', ''];
const BCA_ASSAY = ['BCA', 'Assay', 'Dropdown', 'Standard; Micro', '"Protein Quantification"."Assay"=="BCA Assay"'];
const TYPES = [['NA Quantification', 'Type', 'Text', '', ''], ['Growth Assay', 'Type', 'Text', '', '']];
/** The Operations sheet is always the same three rows; `assays` are the rows of the two sets the first operation uses. */
const staging = (assays: string[][] = [PQ_ASSAY, BCA_ASSAY]): RawWorkbook =>
  book({
    operations: rawSheet('operations', OPERATIONS, [
      ['Assay', 'Protein Quantification', 'Protein Quantification', 'BCA'],
      ['Assay', 'Nucleic Acid Quantification', 'NA Quantification', ''],
      ['Assay', 'Growth Assay', 'Growth Assay', '']
    ]),
    parameterList: rawSheet('parameterList', LIST, [...assays, ...TYPES])
  });
const empty = catalogOf();

describe('two sets this upload creates, used by one operation it creates (the staging workbook)', () => {
  it('plans without an error, and mints the second “Assay” a different id', () => {
    const plan = planWorkbook(staging(), empty, options);
    expect(errorsOf(plan)).toEqual({});
    expect(plannedIds(plan, empty)).toMatchObject({ 'Protein Quantification': ['assay'], BCA: ['assay_2'] });
  });

  it('plans the BCA condition onto the Protein Quantification parameter, not onto itself', () => {
    const plan = planWorkbook(staging(), empty, options);
    const bca = plan.parameterList!.work.owners.find((owner) => owner.name === 'BCA')!;
    expect(bca.entries[0].next.showIf).toEqual({ parameterId: 'assay', parameterSetId: 'new:Protein Quantification', op: 'eq', optionIds: ['bca_assay'] });
    expect(rowOf(plan, 'parameterList:3').needs).toEqual([{ what: 'parameter “Assay”', anyOf: ['parameterList:2'] }]);
  });

  it('applies: both sets written, the condition stored with the real set id, the operation created on both', async () => {
    const { summary, calls } = await run(staging(), empty);
    expect(summary.rowErrors).toEqual({});
    const written = writtenSets(calls);
    expect(written['Protein Quantification'].map((p) => p.id)).toEqual(['assay']);
    expect(written.BCA.map((p) => p.id)).toEqual(['assay_2']);
    const pqId = 'new-set-1';
    expect(written.BCA[0].showIf).toEqual({ parameterId: 'assay', parameterSetId: pqId, op: 'eq', optionIds: ['bca_assay'] });
    const created = calls.filter((c) => c[0] === 'createService').map((c) => c[1] as any);
    expect(created.find((input) => input.name === 'Protein Quantification').parameterSetIds).toEqual([pqId, 'new-set-2']);
    expect(summary.sheets.operations).toMatchObject({ created: 3, failed: 0 });
    expect(summary.sheets.parameterList).toMatchObject({ created: 4, failed: 0 });
  });

  it('two sets that share a parameter name but no operation both keep the plain id', async () => {
    const { plan, calls } = await run(staging(), empty);
    expect(plannedIds(plan, empty)).toMatchObject({ 'NA Quantification': ['type'], 'Growth Assay': ['type'] });
    const written = writtenSets(calls);
    expect(written['NA Quantification'].map((p) => p.id)).toEqual(['type']);
    expect(written['Growth Assay'].map((p) => p.id)).toEqual(['type']);
  });

  it('is decided by sheet order: with BCA first it is BCA that keeps “assay”, and its condition follows', async () => {
    const { plan, summary, calls } = await run(staging([BCA_ASSAY, PQ_ASSAY]), empty);
    expect(errorsOf(plan)).toEqual({});
    expect(summary.rowErrors).toEqual({});
    const written = writtenSets(calls);
    expect(written['Protein Quantification'].map((p) => p.id)).toEqual(['assay_2']);
    expect(written.BCA.map((p) => p.id)).toEqual(['assay']);
    // Protein Quantification is written first (BCA's condition needs it), with the id it would have had second.
    expect(written.BCA[0].showIf).toEqual({ parameterId: 'assay_2', parameterSetId: 'new-set-1', op: 'eq', optionIds: ['bca_assay'] });
  });

  it('a set’s own second parameter of a name still counts on from what the other set took', () => {
    const plan = planWorkbook(staging([PQ_ASSAY, BCA_ASSAY, ['BCA', 'Assay 2', 'Text', '', '']]), empty, options);
    expect(plannedIds(plan, empty)).toMatchObject({ 'Protein Quantification': ['assay'], BCA: ['assay_2', 'assay_2_2'] });
  });
});

describe('unticked rows: ids are minted again for what is actually applied', () => {
  const METHOD = ['Protein Quantification', 'Method', 'Dropdown', 'BCA Assay; Bradford', ''];
  const onMethod = ['BCA', 'Assay', 'Dropdown', 'Standard; Micro', '"Protein Quantification"."Method"=="BCA Assay"'];

  it('without the first set’s “Assay” the second takes the plain id, and its condition still resolves', async () => {
    const { summary, calls } = await run(staging([PQ_ASSAY, METHOD, onMethod]), empty, { 'parameterList:2': false });
    expect(summary.rowErrors).toEqual({});
    const written = writtenSets(calls);
    expect(written['Protein Quantification'].map((p) => p.id)).toEqual(['method']);
    expect(written.BCA.map((p) => p.id)).toEqual(['assay']);
    expect(written.BCA[0].showIf).toEqual({ parameterId: 'method', parameterSetId: 'new-set-1', op: 'eq', optionIds: ['bca_assay'] });
    expect(calls.filter((c) => c[0] === 'createService').map((c) => (c[1] as any).parameterSetIds)).toContainEqual(['new-set-1', 'new-set-2']);
  });

  it('with it ticked the same workbook mints assay and assay_2', async () => {
    const { summary, calls } = await run(staging([PQ_ASSAY, METHOD, onMethod]), empty);
    expect(summary.rowErrors).toEqual({});
    expect(writtenSets(calls).BCA.map((p) => p.id)).toEqual(['assay_2']);
  });

  it('a condition that names the unticked parameter itself is blocked, never pointed at the wrong “assay”', async () => {
    const plan = planWorkbook(staging([PQ_ASSAY, METHOD, BCA_ASSAY]), empty, options);
    const ticked = tickedKeys(plan, { 'parameterList:2': false });
    expect(unmetNeeds(plan, ticked)['parameterList:4']).toBe('Parameter “Assay” was not created.');
    const { summary, calls } = await run(staging([PQ_ASSAY, METHOD, BCA_ASSAY]), empty, { 'parameterList:2': false });
    expect(summary.rowErrors['parameterList:4']).toBe('Parameter “Assay” was not created.');
    expect(writtenSets(calls).BCA).toBeUndefined();
  });

  it('unticking the Operations row does not change the ids: the sets are still kept apart', async () => {
    const { summary, calls } = await run(staging(), empty, { 'operations:2': false });
    expect(summary.rowErrors).toEqual({});
    expect(writtenSets(calls).BCA.map((p) => p.id)).toEqual(['assay_2']);
  });
});

describe('one set already stored with the id, the other getting it from this upload', () => {
  const stored = (operations: any[] = []): CatalogSnapshot => catalogOf({ sets: [{ id: 'pq', name: 'Protein Quantification', parameters: [assay()] }], operations });
  const bcaRow = ['BCA', 'Assay', 'Text', '', ''];

  it('a new operation on both: the new set’s parameter is assay_2', async () => {
    const raw = book({ operations: rawSheet('operations', OPERATIONS, [['Assay', 'Protein Quantification', 'Protein Quantification', 'BCA']]), parameterList: rawSheet('parameterList', LIST, [bcaRow]) });
    const { plan, summary, calls } = await run(raw, stored());
    expect(errorsOf(plan)).toEqual({});
    expect(summary.rowErrors).toEqual({});
    expect(writtenSets(calls).BCA.map((p) => p.id)).toEqual(['assay_2']);
    expect((calls.find((c) => c[0] === 'createService')![1] as any).parameterSetIds).toEqual(['pq', 'new-set-1']);
  });

  it('an existing operation updated to use both: the same', async () => {
    const raw = book({ operations: rawSheet('operations', ['id', 'parameterSet1', 'parameterSet2'], [['op1', 'Protein Quantification', 'BCA']]), parameterList: rawSheet('parameterList', LIST, [bcaRow]) });
    const { plan, summary, calls } = await run(raw, stored([op('op1', 'Protein Quantification', ['pq'])]));
    expect(errorsOf(plan)).toEqual({});
    expect(summary.rowErrors).toEqual({});
    expect(writtenSets(calls).BCA.map((p) => p.id)).toEqual(['assay_2']);
    expect(calls.find((c) => c[0] === 'updateService')).toEqual(['updateService', 'op1', { parameterSetIds: ['pq', 'new-set-1'] }]);
  });

  it('the stored set is the one that gets a new parameter: it avoids the id the other set has stored', async () => {
    const catalog = catalogOf({
      sets: [{ id: 'pq', name: 'Protein Quantification', parameters: [] }, { id: 'bca', name: 'BCA', parameters: [assay()] }],
      operations: [op('op1', 'Protein Quantification', ['pq', 'bca'])]
    });
    const { plan, summary, calls } = await run(book({ parameterList: rawSheet('parameterList', LIST, [['Protein Quantification', 'Assay', 'Text', '', '']]) }), catalog);
    expect(errorsOf(plan)).toEqual({});
    expect(summary.rowErrors).toEqual({});
    expect(calls).toEqual([['updateParameterSet', 'pq', { parameters: [expect.objectContaining({ id: 'assay_2', name: 'Assay' })] }]]);
  });

  it('an operation that already uses both sets, each given the parameter by this upload', async () => {
    const catalog = catalogOf({
      sets: [{ id: 'pq', name: 'Protein Quantification', parameters: [] }, { id: 'bca', name: 'BCA', parameters: [] }],
      operations: [op('op1', 'Protein Quantification', ['pq', 'bca'])]
    });
    const { summary, calls } = await run(book({ parameterList: rawSheet('parameterList', LIST, [PQ_ASSAY, BCA_ASSAY]) }), catalog);
    expect(summary.rowErrors).toEqual({});
    expect((calls.find((c) => c[1] === 'pq')![2] as any).parameters.map((p: any) => p.id)).toEqual(['assay']);
    const bca = (calls.find((c) => c[1] === 'bca')![2] as any).parameters;
    expect(bca.map((p: any) => p.id)).toEqual(['assay_2']);
    expect(bca[0].showIf).toEqual({ parameterId: 'assay', parameterSetId: 'pq', op: 'eq', optionIds: ['bca_assay'] });
  });

  it('an operation whose row takes it off the other set is still on it while the set is written', async () => {
    const catalog = catalogOf({
      sets: [{ id: 'pq', name: 'Protein Quantification', parameters: [] }, { id: 'bca', name: 'BCA', parameters: [assay()] }],
      operations: [op('op1', 'Protein Quantification', ['pq', 'bca'])]
    });
    const raw = book({ operations: rawSheet('operations', ['id', 'parameterSet1'], [['op1', 'Protein Quantification']]), parameterList: rawSheet('parameterList', LIST, [['Protein Quantification', 'Assay', 'Text', '', '']]) });
    const { summary, calls } = await run(raw, catalog);
    expect(summary.rowErrors).toEqual({});
    expect((calls.find((c) => c[0] === 'updateParameterSet')![2] as any).parameters.map((p: any) => p.id)).toEqual(['assay_2']);
  });
});

describe('both ids already stored: the Operations row that would bring the sets together is refused', () => {
  const catalog = catalogOf({
    sets: [{ id: 'pq', name: 'Protein Quantification', parameters: [assay()] }, { id: 'bca', name: 'BCA', parameters: [assay({ name: 'BCA assay' })] }],
    operations: [op('op1', 'Protein Quantification', ['pq']), op('op2', 'Stuck', ['pq', 'bca'])]
  });
  const CLASH = 'Parameter id "assay" is in both "Protein Quantification" and "BCA".';

  it('an update that adds the second set is a row error in the preview, and nothing is written', async () => {
    const { plan, summary, calls } = await run(book({ operations: rawSheet('operations', ['id', 'parameterSet1', 'parameterSet2'], [['op1', 'Protein Quantification', 'BCA']]) }), catalog);
    expect(rowOf(plan, 'operations:2')).toMatchObject({ action: 'skip', errors: [CLASH], selectedByDefault: false, changed: [] });
    expect(calls).toEqual([]);
    expect(summary.rowErrors).toEqual({});
  });

  it('a create on both sets is refused the same way, and what waits for it says so', () => {
    const plan = planWorkbook(book({
      operations: rawSheet('operations', ['name', 'parameterSet1', 'parameterSet2'], [['Fresh', 'BCA', 'Protein Quantification']]),
      parameterList: rawSheet('parameterList', ['operation', 'parameter'], [['Fresh', 'Volume']])
    }), catalog, options);
    expect(rowOf(plan, 'operations:2')).toMatchObject({ action: 'skip', errors: ['Parameter id "assay" is in both "BCA" and "Protein Quantification".'] });
    expect(unmetNeeds(plan, tickedKeys(plan, {}))).toEqual({ 'parameterList:2': 'Operation “Fresh” was not created.' });
  });

  it('a row that leaves a stored collision as it is, is left alone', () => {
    const plan = planWorkbook(book({ operations: rawSheet('operations', ['id', 'description', 'parameterSet1', 'parameterSet2'], [['op2', 'Now described', 'Protein Quantification', 'BCA']]) }), catalog, options);
    expect(rowOf(plan, 'operations:2')).toMatchObject({ action: 'update', errors: [], changed: ['description'] });
  });

  it('other rows of the same upload are applied', async () => {
    const { plan, summary, calls } = await run(book({
      operations: rawSheet('operations', ['id', 'description', 'parameterSet1', 'parameterSet2'], [['op1', 'x', 'Protein Quantification', 'BCA'], ['op2', 'Now described', 'Protein Quantification', 'BCA']])
    }), catalog);
    expect(errorsOf(plan)).toEqual({ 'operations:2': [CLASH] });
    expect(calls).toEqual([['updateService', 'op2', { description: 'Now described' }]]);
    expect(summary.sheets.operations).toMatchObject({ updated: 1, failed: 0 });
  });

  it('is checked again at apply, against the catalog as it then is', async () => {
    const before = catalogOf({ ...catalog, sets: [catalog.sets[0], { id: 'bca', name: 'BCA', parameters: [] }] });
    const raw = book({ operations: rawSheet('operations', ['id', 'parameterSet1', 'parameterSet2'], [['op1', 'Protein Quantification', 'BCA']]) });
    const { plan, summary, calls } = await run(raw, before, {}, catalog);
    expect(errorsOf(plan)).toEqual({});
    expect(calls).toEqual([]);
    expect(summary.rowErrors).toEqual({ 'operations:2': CLASH });
  });
});
