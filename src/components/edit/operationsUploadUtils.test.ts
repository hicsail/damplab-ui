import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import {
  beforeSnapshot, buildOperationCreateInput, buildOperationUpdateChanges, OperationsParseContext, OPTIONAL_UPLOAD_COLUMNS,
  parseOperationsSheet, pickOperationsSheet
} from './operationsUploadUtils';
import { OPERATION_COLUMNS } from './operationsSheet';

const pcr: any = { id: 'op1', name: 'PCR', description: 'Amplify', serviceCategoryName: 'Mol', pricing: { __typename: 'Pricing', internal: 5, external: 9, externalAcademic: 7, externalMarket: 9, externalNoSalary: 6, legacy: 10 } };
const ctx: OperationsParseContext = {
  existing: [pcr, { id: 'op2', name: 'Gibson Assembly' }],
  deletedIds: new Set(['dead']),
  sets: [{ id: 's1', name: 'Buffers' }, { id: 's2', name: 'Cleanup' }],
  allowPricing: true
};
const all = new Set(OPERATION_COLUMNS);

describe('pickOperationsSheet', () => {
  it('prefers the Operations sheet even when Parameters comes first (Review Focus 3)', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['operationId'], ['op1']]), 'Parameters');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['id', 'name'], ['op1', 'PCR']]), 'Operations');
    expect(pickOperationsSheet(wb)).toEqual([['id', 'name'], ['op1', 'PCR']]);
  });

  it('falls back to the first sheet', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['id'], ['op1']]), 'Sheet1');
    expect(pickOperationsSheet(wb)).toEqual([['id'], ['op1']]);
  });

  it('never falls back to a Parameters sheet — the upload never imports parameters', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['operationId', 'name'], ['op1', 'Temperature']]), 'Parameters');
    expect(pickOperationsSheet(wb)).toEqual([]);
  });

  it('skips a leading Parameters sheet to fall back to a later, non-Parameters sheet', () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['operationId'], ['op1']]), 'Parameters');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['id'], ['op1']]), 'Sheet2');
    expect(pickOperationsSheet(wb)).toEqual([['id'], ['op1']]);
  });
});

describe('parseOperationsSheet (pins 26, 27, 28, 29)', () => {
  const parse = (aoa: unknown[][], over: Partial<OperationsParseContext> = {}) => parseOperationsSheet(aoa, { ...ctx, ...over });

  it('matches headers case- and space-insensitively and ignores unknown ones', () => {
    const { presentColumns } = parse([['ID', 'Name', 'Pricing Internal', 'Notes'], ['op1', 'PCR', '5', 'x']]);
    expect(presentColumns).toEqual(['id', 'name', 'pricingInternal']);
  });

  it('update / create / unknown id / deleted id', () => {
    const { rows } = parse([['id', 'name'], ['op1', 'PCR'], ['', 'New op'], ['nope', 'X'], ['dead', 'Y']]);
    expect(rows.map((r) => [r.action, r.errors.length, r.warnings.length])).toEqual([['update', 0, 0], ['create', 0, 0], ['skip', 1, 0], ['skip', 0, 1]]);
    expect(rows[2].errors[0]).toBe('No operation has id "nope".');
    expect(rows[3].warnings[0]).toBe('Operation "dead" was deleted; skipped.');
    expect(rows.map((r) => r.rowNumber)).toEqual([2, 3, 4, 5]);
  });

  it('skips second and later rows with the same id, with a warning', () => {
    const { rows } = parse([['id', 'name'], ['op1', 'PCR'], ['op1', 'PCR again']]);
    expect(rows[1]).toMatchObject({ action: 'skip', selectedByDefault: false, warnings: ['Duplicate id "op1" — row 2 already has it; skipped.'] });
  });

  it('warns and unticks a create whose name matches an existing operation, case-insensitively', () => {
    const { rows } = parse([['id', 'name'], ['', 'gibson assembly']]);
    expect(rows[0]).toMatchObject({ action: 'create', selectedByDefault: false, warnings: ['An operation named "gibson assembly" already exists.'] });
  });

  it('errors on a negative or unparseable price, a bad Y/N, a bad mode, and an unknown set', () => {
    const { rows } = parse([
      ['id', 'name', 'pricingInternal', 'hiddenFromClients', 'pricingMode', 'parameterSets'],
      ['op1', 'PCR', '-1', 'Y', 'SERVICE', ''],
      ['op1x', '', '', '', '', ''],
      ['op2', 'Gibson Assembly', 'abc', 'maybe', 'HOURLY', 'Buffers; Nope']
    ], { existing: [...ctx.existing, { id: 'op1x', name: 'Other' }] });
    expect(rows[0].errors).toEqual(['pricingInternal: "-1" is not a valid price.']);
    expect(rows[1].errors).toEqual(['Name cannot be blank.']);
    expect(rows[2].errors).toEqual([
      'pricingInternal: "abc" is not a valid price.',
      'pricingMode: "HOURLY" must be SERVICE or PARAMETER.',
      'hiddenFromClients: "maybe" must be Y or N.',
      'Unknown parameter set "Nope".'
    ]);
    expect(rows.every((r) => r.action === 'skip' && !r.selectedByDefault)).toBe(true);
  });

  it('drops pricing columns for a caller without internal-fields:read', () => {
    expect(parse([['id', 'pricingInternal'], ['op1', '5']], { allowPricing: false }).presentColumns).toEqual(['id']);
  });

  it('skips wholly blank rows', () => {
    expect(parse([['id', 'name'], ['', ''], ['op1', 'PCR']]).rows).toHaveLength(1);
  });
});

describe('building mutations (pins 28, 31)', () => {
  const rowOf = (aoa: unknown[][]) => parseOperationsSheet(aoa, ctx).rows[0];

  it('never sends an id on create (F2)', () => {
    const input = buildOperationCreateInput(rowOf([['id', 'name', 'parameterSets', 'hiddenFromClients'], ['', 'New op', 'Cleanup; Buffers', 'y']]), all, ctx.sets);
    expect(input).not.toHaveProperty('id');
    // Every key AdminNewService (the create that works) sends that CreateService requires.
    expect(input).toMatchObject({ name: 'New op', icon: '', description: '', allowedConnections: [], parameters: [], paramGroups: [], deliverables: [], protocolIds: [], pricingMode: 'SERVICE', parameterSetIds: ['s2', 's1'], hiddenFromClients: true });
  });

  it('leaves a field alone when its column is absent, clears it when the cell is blank', () => {
    const changes = buildOperationUpdateChanges(rowOf([['id', 'serviceCategoryName', 'parameterSets', 'description'], ['op1', '', '', '']]), all, pcr, ctx.sets);
    expect(changes).toEqual({ serviceCategoryName: null, parameterSetIds: [], description: '' });
    expect(changes).not.toHaveProperty('unit');
  });

  it('applies only ticked columns', () => {
    const row = rowOf([['id', 'unit', 'description'], ['op1', 'rxn', 'New words']]);
    expect(buildOperationUpdateChanges(row, new Set(['unit']), pcr, ctx.sets)).toEqual({ unit: 'rxn' });
  });

  it('merges one pricing column into existing pricing, without __typename (Review Focus 5)', () => {
    const changes: any = buildOperationUpdateChanges(rowOf([['id', 'pricingInternal'], ['op1', '$8.50']]), all, pcr, ctx.sets);
    expect(changes.pricing).toEqual({ internal: 8.5, external: 9, externalAcademic: 7, externalMarket: 9, externalNoSalary: 6, legacy: 10 });
    expect(changes.internalPrice).toBe(8.5);
    expect(JSON.stringify(changes)).not.toContain('__typename');
  });

  it('keeps the generic external tier in step with market, and a blank tier clears it', () => {
    const changes: any = buildOperationUpdateChanges(rowOf([['id', 'pricingExternalMarket', 'pricingLegacy'], ['op1', '12', '']]), all, pcr, ctx.sets);
    expect(changes.pricing).toMatchObject({ externalMarket: 12, external: 12, legacy: null });
    expect(changes).toMatchObject({ externalMarketPrice: 12, externalPrice: 12, price: null });
  });

  it('only sends a changed name', () => {
    expect(buildOperationUpdateChanges(rowOf([['id', 'name'], ['op1', 'PCR']]), all, pcr, ctx.sets)).toEqual({});
    expect(buildOperationUpdateChanges(rowOf([['id', 'name'], ['op1', 'PCR v2']]), all, pcr, ctx.sets)).toEqual({ name: 'PCR v2' });
  });

  it('snapshots the before-values of exactly the changed fields', () => {
    expect(beforeSnapshot(pcr, { description: 'x', unit: 'rxn' })).toEqual({ description: 'Amplify', unit: null });
  });

  it('offers every column but id and name as optional', () => {
    expect(OPTIONAL_UPLOAD_COLUMNS).toEqual(OPERATION_COLUMNS.filter((c) => c !== 'id' && c !== 'name'));
  });
});
