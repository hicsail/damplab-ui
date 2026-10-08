import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { canonicalColumn, readWorkbook } from './readWorkbook';

const book = (sheets: Record<string, unknown[][]>): XLSX.WorkBook => {
  const wb = XLSX.utils.book_new();
  for (const [name, aoa] of Object.entries(sheets)) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), name);
  return wb;
};

describe('canonicalColumn', () => {
  it('matches headers loosely and numbers parameterSet columns', () => {
    expect(canonicalColumn('operations', ' Service Category ')).toBe('serviceCategory');
    expect(canonicalColumn('operations', 'ParameterSet12')).toBe('parameterSet12');
    expect(canonicalColumn('operations', 'parameter set 03')).toBe('parameterSet3');
    expect(canonicalColumn('operations', 'serviceCategoryNumber')).toBeNull();
    expect(canonicalColumn('operations', 'Notes')).toBeNull();
    expect(canonicalColumn('bundles', 'bundle name')).toBe('BundleName');
    expect(canonicalColumn('parameterList', 'conditionalDisplayLogic')).toBeNull();
    expect(canonicalColumn('parameterList', 'parameterSet1')).toBeNull();
    expect(canonicalColumn('operations', '')).toBeNull();
  });
});

describe('readWorkbook row numbers (F14)', () => {
  it('numbers rows by sheet row when blank rows sit above the header', () => {
    const raw = readWorkbook(book({ Operations: [[], [], ['id', 'name'], ['op1', 'PCR'], ['', ''], ['op2', 'Gel']] }));
    expect(raw.sheets.operations!.rows.map((row) => [row.rowNumber, row.cells.name])).toEqual([[4, 'PCR'], [6, 'Gel']]);
  });

  it('still numbers rows from 2 when the header is the first row', () => {
    const raw = readWorkbook(book({ Operations: [['id', 'name'], ['op1', 'PCR']] }));
    expect(raw.sheets.operations!.rows[0].rowNumber).toBe(2);
  });
});

describe('readWorkbook (rule 8: recognised sheets, ignored sheets and columns)', () => {
  it('recognises the four sheets by name, case-insensitively, and names every other sheet as ignored', () => {
    const raw = readWorkbook(book({
      OPERATIONS: [['id', 'name'], ['op1', 'PCR']],
      'parameter list': [['parameterSet', 'parameter'], ['Buffers', 'Volume']],
      '(OLD Operations)': [['id'], ['x']],
      '(Syntax)': [['a'], ['b']],
      Bundles: [['BundleName', 'Order', 'Operation'], ['Cloning', 1, 'PCR']],
      'SOW Sections': [['sectionKey', 'name', 'text'], ['terms', 'Default', 'Net 30']]
    }));
    expect(Object.keys(raw.sheets).sort()).toEqual(['bundles', 'operations', 'parameterList', 'sowSections']);
    expect(raw.ignoredSheets).toEqual(['(OLD Operations)', '(Syntax)']);
  });

  it('skips the Lists helper sheet silently', () => {
    const raw = readWorkbook(book({ Operations: [['id', 'name'], ['op1', 'PCR']], Lists: [['categories'], ['A']] }));
    expect(raw.ignoredSheets).toEqual([]);
  });

  it('keeps known columns as trimmed text keyed by canonical name, and names unknown columns as ignored', () => {
    const raw = readWorkbook(book({
      'Parameter List': [
        ['parameterSet', 'Parameter', 'required', 'Notes', 'conditionalDisplayLogic', 'technicianVisibility'],
        [' Buffers ', 'Volume', true, 'x', 'y', 'z'],
        ['', '', '', 'only a note', '', ''],
        ['Buffers', 'pH', 'N', '', '', '']
      ]
    }));
    const sheet = raw.sheets.parameterList!;
    expect(sheet.columns).toEqual(['parameterSet', 'parameter', 'required']);
    expect(sheet.ignoredColumns).toEqual(['Notes', 'conditionalDisplayLogic', 'technicianVisibility']);
    expect(sheet.rows).toEqual([
      { rowNumber: 2, cells: { parameterSet: 'Buffers', parameter: 'Volume', required: 'true' } },
      { rowNumber: 4, cells: { parameterSet: 'Buffers', parameter: 'pH', required: 'N' } }
    ]);
  });

  it('an absent column is an absent key, a blank cell is an empty string (rule 6)', () => {
    const raw = readWorkbook(book({ Operations: [['id', 'name', 'unit'], ['op1', 'PCR', '']] }));
    expect(raw.sheets.operations!.rows[0].cells).toEqual({ id: 'op1', name: 'PCR', unit: '' });
    expect('description' in raw.sheets.operations!.rows[0].cells).toBe(false);
  });

  it('ignores a repeated header rather than letting it overwrite the first', () => {
    const raw = readWorkbook(book({ Operations: [['name', 'Name'], ['PCR', 'Other']] }));
    expect(raw.sheets.operations!.columns).toEqual(['name']);
    expect(raw.sheets.operations!.ignoredColumns).toEqual(['Name']);
    expect(raw.sheets.operations!.rows[0].cells).toEqual({ name: 'PCR' });
  });

  it('reads an empty recognised sheet as no rows', () => {
    const raw = readWorkbook(book({ Bundles: [['BundleName']] }));
    expect(raw.sheets.bundles!.rows).toEqual([]);
  });
});
