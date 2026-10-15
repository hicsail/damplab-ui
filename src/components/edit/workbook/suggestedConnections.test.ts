import { describe, expect, it } from 'vitest';
import { applyWorkbook, WorkbookMutator } from './applyWorkbook';
import { operationsExportRows, planOperations } from './operationsWorkbookSheet';
import { planWorkbook, tickedKeys } from './planWorkbook';
import { catalogOf, rawSheet } from './testSupport';
import { RawWorkbook } from './types';

/**
 * `SuggestedPostConnections` on the Operations sheet: the operations suggested
 * to come after this one (stored as `allowedConnections`), names separated by
 * ";". Suggestions only — the canvas still allows any link. A blank cell leaves
 * the stored list alone.
 */
const op = (id: string, name: string, next: string[] = []): any => ({
  id, name, description: '', pricingMode: 'SERVICE', hiddenFromClients: false, parameterSetIds: [], ownParameters: [],
  allowedConnections: next.map((to) => ({ id: to, name: '' }))
});
const catalog = catalogOf({ operations: [op('op1', 'PCR', ['op2']), op('op2', 'Gel'), op('op3', 'Ligation')] });
const ctx = { newSetRows: new Map<string, string[]>(), allowPricing: true, hideMissing: false };
const COLS = ['id', 'name', 'SuggestedPostConnections'];
const plan = (rows: string[][]) => planOperations(rawSheet('operations', COLS, rows), catalog, ctx);

describe('SuggestedPostConnections — planning', () => {
  it('downloads each operation’s suggestions as names joined by “; ”', () => {
    const [header, first, second] = operationsExportRows(catalog, false);
    const at = header.indexOf('SuggestedPostConnections');
    expect(at).toBeGreaterThan(-1);
    expect(first[at]).toBe('Gel');
    expect(second[at]).toBe('');
  });

  it('an unchanged cell, and a blank one, change nothing', () => {
    expect(plan([['op1', 'PCR', 'Gel'], ['op3', 'Ligation', '']]).rows.map((r) => r.action)).toEqual(['unchanged', 'unchanged']);
  });

  it('a changed list is an update of the operation’s suggestions, in the order written', () => {
    const result = plan([['op1', 'PCR', 'Ligation; Gel; ']]);
    expect(result.rows[0]).toMatchObject({ action: 'update', changed: ['SuggestedPostConnections'], errors: [] });
    expect(result.work.rows['operations:2'].connections).toEqual([{ name: 'Ligation', id: 'op3' }, { name: 'Gel', id: 'op2' }]);
  });

  it('may name an operation this upload creates, or the operation itself', () => {
    const result = plan([['', 'Cleanup', 'Cleanup; PCR'], ['op2', 'Gel', 'Cleanup']]);
    expect(result.rows.map((r) => r.errors)).toEqual([[], []]);
    expect(result.work.rows['operations:2'].connections).toEqual([{ name: 'Cleanup', rowKey: 'operations:2' }, { name: 'PCR', id: 'op1' }]);
    expect(result.work.rows['operations:3'].connections).toEqual([{ name: 'Cleanup', rowKey: 'operations:2' }]);
  });

  it('refuses an unknown name and a name listed twice', () => {
    expect(plan([['op1', 'PCR', 'Nope']]).rows[0]).toMatchObject({ action: 'skip', errors: ['SuggestedPostConnections: No operation named “Nope”.'] });
    expect(plan([['op1', 'PCR', 'Gel; Gel']]).rows[0].errors).toEqual(['SuggestedPostConnections: “Gel” is listed twice.']);
  });
});

describe('SuggestedPostConnections — applying', () => {
  const recorder = () => {
    const calls: Array<[string, ...unknown[]]> = [];
    let next = 0;
    const call = (name: keyof WorkbookMutator, returnsId: boolean) => async (...args: unknown[]): Promise<any> => {
      calls.push([name, ...args]);
      return returnsId ? `new-${(next += 1)}` : undefined;
    };
    const mutator: WorkbookMutator = {
      createParameterSet: call('createParameterSet', true), updateParameterSet: call('updateParameterSet', false), createService: call('createService', true),
      updateService: call('updateService', false), createCategory: call('createCategory', true), updateCategory: call('updateCategory', false),
      createBundle: call('createBundle', true), updateBundle: call('updateBundle', false), createSowTextPreset: call('createSowTextPreset', true),
      updateSowTextPreset: call('updateSowTextPreset', false), createUploadLog: call('createUploadLog', false)
    };
    return { mutator, calls };
  };
  const book = (rows: string[][]): RawWorkbook => ({ ignoredSheets: [], sheets: { operations: rawSheet('operations', COLS, rows) } });
  const apply = async (rows: string[][], overrides: Record<string, boolean> = {}) => {
    const p = planWorkbook(book(rows), catalog, { allowPricing: true, hideMissing: false });
    const rec = recorder();
    const summary = await applyWorkbook(p, tickedKeys(p, overrides), catalog, rec.mutator, { fileName: 'c.xlsx', uploaderName: 'Ada' });
    return { summary, calls: rec.calls };
  };
  const connectionWrites = (calls: Array<[string, ...unknown[]]>) =>
    calls.filter((c) => c[0] === 'updateService' && (c[2] as any)?.allowedConnections !== undefined).map((c) => [c[1], (c[2] as any).allowedConnections]);

  it('writes the ids once every operation of the upload exists, so a row may name a later row', async () => {
    const { calls, summary } = await apply([['op1', 'PCR', 'Cleanup; Gel'], ['', 'Cleanup', 'Cleanup']], { 'operations:3': true });
    expect(summary.rowErrors).toEqual({});
    expect(connectionWrites(calls)).toEqual([['op1', ['new-1', 'op2']], ['new-1', ['new-1']]]);
  });

  it('says so, and writes nothing for that row, when an operation it names was not created', async () => {
    const { calls, summary } = await apply([['op1', 'PCR', 'Cleanup'], ['', 'Cleanup', '']], { 'operations:3': false });
    expect(connectionWrites(calls)).toEqual([]);
    expect(summary.errors).toEqual(['Suggested connections for “PCR” were not saved: operation “Cleanup” was not created.']);
  });
});
