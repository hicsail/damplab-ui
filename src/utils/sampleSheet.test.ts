import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { countedRows, countSampleRows, countSampleSheetBytes, countSampleSheetFile, expectedColumnsOf, hasStaffTemplate, isTableParam, isTableType, parseSampleSheetValue, sampleCountLabel, SampleSheetError, SERVER_COUNTED, tableFileOf, tableIsSetUp } from './sampleSheet';

const xlsxBytes = (rows: unknown[][]): Uint8Array => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Samples');
  return new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
};

describe('countSampleRows', () => {
  it('counts every populated row below the header', () => {
    expect(countSampleRows([['Sample', 'Volume'], ['A1', 10], ['A2', 12], ['A3', 9]])).toBe(3);
  });

  it('ignores blank rows wherever they sit', () => {
    expect(countSampleRows([[], [null, ''], ['Sample', 'Volume'], ['A1', 10], [null, null], ['A2', 12], ['', '  ']])).toBe(2);
  });

  it('is zero for a header with nothing below it, and for an empty sheet', () => {
    expect(countSampleRows([['Sample', 'Volume']])).toBe(0);
    expect(countSampleRows([])).toBe(0);
  });

  it('counts a row that only has a value in a later column', () => {
    expect(countSampleRows([['Sample', 'Volume', 'Note'], [null, null, 'see tube']])).toBe(1);
  });
});

describe('countSampleSheetBytes', () => {
  it('counts an .xlsx workbook', () => {
    expect(countSampleSheetBytes(xlsxBytes([['Sample', 'Volume'], ['A1', 10], ['A2', 12]]))).toBe(2);
  });

  it('counts a .csv', () => {
    const csv = new TextEncoder().encode('Sample,Volume\nA1,10\nA2,12\n\nA3,7\n');
    expect(countSampleSheetBytes(csv)).toBe(3);
  });

  it('reads arbitrary bytes as text rather than refusing them, which is why the picker checks the extension', () => {
    expect(countSampleSheetBytes(new TextEncoder().encode('just one line'))).toBe(0);
  });
});

describe('countSampleSheetFile', () => {
  it('refuses a file that is not .xlsx or .csv before reading it', async () => {
    await expect(countSampleSheetFile(new File(['%PDF-1.4'], 'samples.pdf'))).rejects.toBeInstanceOf(SampleSheetError);
    await expect(countSampleSheetFile(new File(['a,b'], 'samples.xls'))).rejects.toThrow(/\.xlsx or \.csv/);
  });

  it('refuses a file over the size cap', async () => {
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'samples.csv');
    await expect(countSampleSheetFile(big)).rejects.toThrow(/10 MB/);
  });

  it('counts a small .csv file', async () => {
    await expect(countSampleSheetFile(new File(['Sample,Volume\nA1,10\nA2,12\n'], 'samples.csv'))).resolves.toBe(2);
  });
});

describe('parseSampleSheetValue', () => {
  it('reads the stored JSON string', () => {
    const value = JSON.stringify({ filename: 'samples.xlsx', key: 'workflow-parameters/u/x', sampleCount: 4 });
    expect(parseSampleSheetValue(value)).toMatchObject({ filename: 'samples.xlsx', sampleCount: 4 });
  });

  it('reads the object the server returns, and a pending file on the canvas', () => {
    expect(parseSampleSheetValue({ filename: 'a.xlsx', url: 'https://s3/x', sampleCount: 2 })).toMatchObject({ filename: 'a.xlsx', url: 'https://s3/x', sampleCount: 2 });
    expect(parseSampleSheetValue({ __kind: 'pending-file', filename: 'b.csv', sampleCount: 7 })?.sampleCount).toBe(7);
  });

  it('is null for nothing, junk, or a value with no filename', () => {
    expect(parseSampleSheetValue(null)).toBeNull();
    expect(parseSampleSheetValue('')).toBeNull();
    expect(parseSampleSheetValue('not json')).toBeNull();
    expect(parseSampleSheetValue({ key: 'x' })).toBeNull();
    expect(parseSampleSheetValue(['a'])).toBeNull();
  });

  it('drops a sampleCount that is not a number', () => {
    expect(parseSampleSheetValue({ filename: 'a.xlsx', sampleCount: '4' })?.sampleCount).toBeUndefined();
  });
});

describe('sampleCountLabel', () => {
  it('counts rows, pluralised', () => {
    expect(sampleCountLabel(0)).toBe('0 rows');
    expect(sampleCountLabel(1)).toBe('1 row');
    expect(sampleCountLabel(96)).toBe('96 rows');
  });
});

describe('one Table type (rule 1)', () => {
  it('reads both stored strings as a Table', () => {
    expect(isTableType('table')).toBe(true);
    expect(isTableType('sampleSheet')).toBe(true);
    expect(isTableType('file')).toBe(false);
    expect(isTableParam({ id: 'a', type: 'table' })).toBe(true);
    expect(isTableParam({ id: 'a', type: 'sampleSheet' })).toBe(true);
    expect(isTableParam({ id: 'a', type: 'string' })).toBe(false);
    expect(isTableParam(null)).toBe(false);
  });

  it('expected columns are the trimmed, non-blank headers of tableData.columns, in order; rows are never read', () => {
    const param = { type: 'table', tableData: { columns: [{ header: ' Inducer ', field: 'inducer' }, { header: '' }, { field: 'x' }, { header: 'Location', field: 'location' }], rows: [{ id: 1 }] } };
    expect(expectedColumnsOf(param)).toEqual(['Inducer', 'Location']);
    expect(expectedColumnsOf({ type: 'table', tableData: null })).toEqual([]);
    expect(expectedColumnsOf({ type: 'table' })).toEqual([]);
  });

  it('a staff template is a templateFile key under sample-sheet-templates/', () => {
    expect(hasStaffTemplate({ templateFile: { key: 'sample-sheet-templates/a.xlsx' } })).toBe(true);
    expect(hasStaffTemplate({ templateFile: { key: 'workflow-parameters/u/a.xlsx' } })).toBe(false);
    expect(hasStaffTemplate({ templateFile: '' })).toBe(false);
    expect(hasStaffTemplate({})).toBe(false);
  });

  it('is set up with a column or a staff template, and not otherwise', () => {
    expect(tableIsSetUp({ type: 'table', tableData: { columns: [{ header: 'A', field: 'a' }] } })).toBe(true);
    expect(tableIsSetUp({ type: 'sampleSheet', templateFile: { key: 'sample-sheet-templates/a.xlsx' } })).toBe(true);
    expect(tableIsSetUp({ type: 'table', tableData: { columns: [], rows: [{ a: 1 }] } })).toBe(false);
  });
});

// R2c leaves `allowMultipleValues` set on a stored Table, and the server wraps every answer to
// such a parameter in an array — so a file uploaded to it comes back as a one-element array.
describe('tableFileOf — the file to show for a Table answer', () => {
  const file = { filename: 'plate.xlsx', key: 'workflow-parameters/u/plate.xlsx', sampleCount: 7, countedBy: 'server' };

  it('reads a single value exactly as parseSampleSheetValue does', () => {
    expect(tableFileOf(JSON.stringify(file))).toMatchObject({ filename: 'plate.xlsx', sampleCount: 7 });
    expect(tableFileOf({ ...file, url: 'https://s3/x' })).toMatchObject({ filename: 'plate.xlsx', url: 'https://s3/x' });
    expect(tableFileOf('')).toBeNull();
    expect(tableFileOf(null)).toBeNull();
  });

  it('reads the first file inside an array, skipping what is not a file', () => {
    expect(tableFileOf([JSON.stringify(file)])).toMatchObject({ filename: 'plate.xlsx', sampleCount: 7 });
    expect(tableFileOf(['', { ...file, url: 'https://s3/x' }])).toMatchObject({ url: 'https://s3/x' });
    expect(tableFileOf([''])).toBeNull();
    expect(tableFileOf([])).toBeNull();
  });

  it('leaves parseSampleSheetValue alone: an array is still not a file to it (pricing depends on that)', () => {
    expect(parseSampleSheetValue([JSON.stringify(file)])).toBeNull();
  });
});

describe('countedRows (R2d — twin of the backend’s serverCountedRows)', () => {
  const counted = (sampleCount: unknown, extra: Record<string, unknown> = {}) => ({ filename: 'a.csv', key: 'workflow-parameters/u/a.csv', sampleCount, countedBy: 'server', ...extra });

  it('reads the rows of a file the server counted, as a stored string or a parsed object', () => {
    expect(SERVER_COUNTED).toBe('server');
    expect(countedRows(JSON.stringify(counted(12)))).toBe(12);
    expect(countedRows({ ...counted(3), url: 'https://s3/x' })).toBe(3);
    expect(countedRows(JSON.stringify(counted(0)))).toBe(0);
  });

  it('reads the previewed rows of a file just picked on the canvas', () => {
    expect(countedRows({ __kind: 'pending-file', filename: 'a.csv', sampleCount: 4 })).toBe(4);
  });

  it('sums the counted elements of an array', () => {
    expect(countedRows([JSON.stringify(counted(12)), JSON.stringify(counted(3)), ''])).toBe(15);
  });

  it('is undefined for anything else — every shape stored before table-upload', () => {
    const unmarked = { filename: 'a.csv', key: 'workflow-parameters/u/a.csv', sampleCount: 12 };
    for (const value of [undefined, null, '', 'legacy', 3, true, [], [''], JSON.stringify(unmarked), unmarked, [JSON.stringify(unmarked)], JSON.stringify([{ id: 1 }]), { rows: [] }]) {
      expect(countedRows(value)).toBeUndefined();
    }
  });

  it('does not trust a mark without a usable count, or a different mark', () => {
    expect(countedRows(JSON.stringify(counted('12')))).toBeUndefined();
    expect(countedRows(JSON.stringify(counted(-1)))).toBeUndefined();
    expect(countedRows(JSON.stringify(counted(12, { countedBy: 'client' })))).toBeUndefined();
  });
});
