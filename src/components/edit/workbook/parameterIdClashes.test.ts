import { describe, expect, it } from 'vitest';
import { applyWorkbook, WorkbookMutator } from './applyWorkbook';
import { allRows, planWorkbook, tickedKeys } from './planWorkbook';
import { catalogOf, rawSheet } from './testSupport';
import { RawWorkbook } from './types';

// I2 (rules 17, 20): a parameter id must never end up on both an operation's own list and one of its sets.
const op = (id: string, name: string, parameterSetIds: string[], own: any[] = []): any => ({ id, name, hiddenFromClients: false, parameterSetIds, ownParameters: own });
const catalog = catalogOf({
  operations: [op('op1', 'PCR', ['s1'], [{ id: 'cycles', name: 'Cycles', type: 'number' }]), op('op2', 'Old method', [])],
  sets: [{ id: 's1', name: 'Buffers', parameters: [{ id: 'volume', name: 'Volume', type: 'number' }] }]
});
const options = { allowPricing: true, hideMissing: false };
const book = (sheets: RawWorkbook['sheets']): RawWorkbook => ({ ignoredSheets: [], sheets });
const CLASH = 'Parameter id "cycles" is in both "PCR" and "Buffers".';

const recorder = () => {
  const calls: Array<[string, ...unknown[]]> = [];
  let next = 0;
  const call = (name: string, returnsId: boolean) => async (...args: unknown[]): Promise<any> => {
    calls.push([name, ...args]);
    return returnsId ? `new-${name}-${(next += 1)}` : undefined;
  };
  const mutator = {
    createParameterSet: call('createParameterSet', true), updateParameterSet: call('updateParameterSet', false),
    createService: call('createService', true), updateService: call('updateService', false),
    createCategory: call('createCategory', true), updateCategory: call('updateCategory', false),
    createBundle: call('createBundle', true), updateBundle: call('updateBundle', false),
    createSowTextPreset: call('createSowTextPreset', true), updateSowTextPreset: call('updateSowTextPreset', false),
    createUploadLog: call('createUploadLog', false)
  } as WorkbookMutator;
  return { mutator, calls };
};
const meta = { fileName: 'c.xlsx', uploaderName: 'Ada' };
const apply = async (raw: RawWorkbook, planCatalog = catalog, applyCatalog = planCatalog) => {
  const plan = planWorkbook(raw, planCatalog, options);
  const rec = recorder();
  const summary = await applyWorkbook(plan, tickedKeys(plan, {}), applyCatalog, rec.mutator, meta);
  return { plan, summary, ...rec };
};

describe('planning refuses a new set parameter that takes an id its operation already has (unseeded case 3)', () => {
  const raw = book({ parameterList: rawSheet('parameterList', ['parameterSet', 'parameter', 'type'], [['Buffers', 'Cycles', 'Number'], ['Buffers', 'Temperature', 'Number']]) });

  it('is an error on that row only', () => {
    const rows = allRows(planWorkbook(raw, catalog, options));
    expect(rows[0]).toMatchObject({ action: 'skip', errors: [CLASH], selectedByDefault: false });
    expect(rows[1]).toMatchObject({ action: 'create', errors: [] });
  });

  it('applies the clean row and reports nothing about the refused one as written', async () => {
    const { calls, summary } = await apply(raw);
    expect(calls.find((c) => c[0] === 'updateParameterSet')![2]).toMatchObject({ parameters: [{ id: 'volume' }, { id: 'temperature' }] });
    expect(summary.sheets.parameterList).toMatchObject({ created: 1, failed: 0 });
  });

  it('also sees a set this upload creates, once an operation row puts the operation on it', () => {
    const rows = allRows(planWorkbook(book({
      parameterList: rawSheet('parameterList', ['parameterSet', 'parameter'], [['Fresh', 'Cycles']]),
      operations: rawSheet('operations', ['id', 'parameterSet1', 'parameterSet2'], [['op1', 'Buffers', 'Fresh']])
    }), catalog, options));
    expect(rows.find((r) => r.key === 'parameterList:2')).toMatchObject({ action: 'skip', errors: ['Parameter id "cycles" is in both "PCR" and "Fresh".'] });
    // The operation row that needs the set then cannot be applied either: its provider is not applicable.
    expect(rows.find((r) => r.key === 'operations:2')!.needs).toEqual([{ what: 'parameter set “Fresh”', anyOf: ['parameterList:2'] }]);
  });

  it('leaves a collision that is already stored alone', () => {
    const stored = catalogOf({
      operations: [op('op1', 'PCR', ['s1'], [{ id: 'volume', name: 'Own volume', type: 'number' }])],
      sets: [{ id: 's1', name: 'Buffers', parameters: [{ id: 'volume', name: 'Volume', type: 'number', description: 'x' }] }]
    });
    const rows = allRows(planWorkbook(book({ parameterList: rawSheet('parameterList', ['parameterId', 'parameterSet', 'parameter', 'description'], [['volume', 'Buffers', 'Volume', 'y']]) }), stored, options));
    expect(rows[0]).toMatchObject({ action: 'update', errors: [] });
  });
});

describe('minting reserves the ids of the operation’s resulting set list (unseeded cases 1 and 2)', () => {
  it('an operation this upload creates: its own “Volume” becomes volume_2 beside the set’s volume', async () => {
    const { calls, summary } = await apply(book({
      operations: rawSheet('operations', ['name', 'parameterSet1'], [['Ligation', 'Buffers']]),
      parameterList: rawSheet('parameterList', ['operation', 'parameter'], [['Ligation', 'Volume']])
    }));
    expect(calls.find((c) => c[0] === 'updateService')![2]).toEqual({ parameters: [expect.objectContaining({ id: 'volume_2', name: 'Volume' })] });
    expect(summary.rowErrors).toEqual({});
  });

  it('an operation whose sets this upload changes: minted against the new sets, not the stored ones', async () => {
    const { calls } = await apply(book({
      operations: rawSheet('operations', ['id', 'parameterSet1'], [['op2', 'Buffers']]),
      parameterList: rawSheet('parameterList', ['operation', 'parameter'], [['Old method', 'Volume']])
    }));
    const write = calls.filter((c) => c[0] === 'updateService').find((c) => c[1] === 'op2' && (c[2] as any).parameters)!;
    expect((write[2] as any).parameters).toEqual([expect.objectContaining({ id: 'volume_2' })]);
  });

  it('a set this upload creates and an operation row uses: minted against the parameters the set was written with', async () => {
    const { calls } = await apply(book({
      parameterList: rawSheet('parameterList', ['parameterSet', 'operation', 'parameter'], [['Salts', '', 'NaCl'], ['', 'Ligation', 'NaCl']]),
      operations: rawSheet('operations', ['name', 'parameterSet1'], [['Ligation', 'Salts']])
    }));
    expect((calls.find((c) => c[0] === 'updateService')![2] as any).parameters).toEqual([expect.objectContaining({ id: 'nacl_2' })]);
  });

  it('leaves the minted id alone when no set is involved', async () => {
    const { calls } = await apply(book({ parameterList: rawSheet('parameterList', ['operation', 'parameter'], [['Old method', 'Volume']]) }));
    expect((calls.find((c) => c[0] === 'updateService')![2] as any).parameters).toEqual([expect.objectContaining({ id: 'volume' })]);
  });
});

describe('applying re-checks the rows actually ticked, against the catalog it is given', () => {
  it('refuses a set-parameter create whose id an operation gained after the plan was made', async () => {
    const raw = book({ parameterList: rawSheet('parameterList', ['parameterSet', 'parameter', 'type'], [['Buffers', 'Temperature', 'Number']]) });
    const later = catalogOf({ ...catalog, operations: [op('op1', 'PCR', ['s1'], [{ id: 'temperature', name: 'T', type: 'number' }])] });
    const { calls, summary } = await apply(raw, catalog, later);
    expect(calls.map((c) => c[0])).not.toContain('updateParameterSet');
    expect(summary.rowErrors).toEqual({ 'parameterList:2': 'Parameter id "temperature" is in both "PCR" and "Buffers".' });
    expect(summary.sheets.parameterList).toMatchObject({ created: 0, failed: 1 });
  });
});
