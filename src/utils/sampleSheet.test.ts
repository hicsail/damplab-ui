import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { buildTableTemplate, checkTableFile, countedRows, expectedColumnsOf, hasStaffTemplate, isTableParam, isTableType, missingColumns, missingColumnsMessage, parseSampleSheetValue, readTableBytes, readTableRows, sampleCountLabel, SampleSheetError, SERVER_COUNTED, tableFileOf, tableIsSetUp, tableTemplateFilename, TABLE_FILE_NO_SHEETS_MESSAGE, TABLE_FILE_TOO_LARGE_MESSAGE, TABLE_FILE_UNREADABLE_MESSAGE, TABLE_NOT_SET_UP_MESSAGE } from './sampleSheet';

/** Byte-for-byte the files in `damplab-backend/test-fixtures/sample-sheets/`; the hash test pins that without reading across repos. */
const fixture = (name: string): Uint8Array => new Uint8Array(readFileSync(resolve(__dirname, '../../test-fixtures/sample-sheets', name)));
const fileOf = (name: string, bytes: Uint8Array | string): File => new File([bytes as BlobPart], name);

const xlsxBytes = (rows: unknown[][]): Uint8Array => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), 'Samples');
  return new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
};

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

describe('the messages (identical in damplab-backend/src/workflow/utils/table-file.ts)', () => {
  it('are these exact strings', () => {
    expect(TABLE_FILE_UNREADABLE_MESSAGE).toBe('This file could not be read as a spreadsheet. Save it as .xlsx or .csv and try again.');
    expect(TABLE_FILE_NO_SHEETS_MESSAGE).toBe('This spreadsheet has no sheets in it.');
    expect(TABLE_FILE_TOO_LARGE_MESSAGE).toBe('This file must be smaller than 10 MB.');
    expect(TABLE_NOT_SET_UP_MESSAGE).toBe('This table has not been set up yet.');
    expect(missingColumnsMessage(['Concentration', 'Location'])).toBe('This file is missing the columns: Concentration, Location.');
    expect(missingColumnsMessage(['Location'])).toBe('This file is missing the columns: Location.');
  });
});

describe('readTableRows (rule 18)', () => {
  it('takes the first row with any content as the header and counts every later row with any content', () => {
    expect(readTableRows([[], ['', '  '], ['Inducer', ' Concentration ', ''], ['IPTG', '1'], [null, undefined], ['', '2'], ['  ']])).toEqual({ header: ['Inducer', 'Concentration'], rowCount: 2 });
  });

  it('is an empty header and zero rows for nothing at all, and zero rows for a header alone', () => {
    expect(readTableRows([])).toEqual({ header: [], rowCount: 0 });
    expect(readTableRows([['Inducer', 'Concentration']])).toEqual({ header: ['Inducer', 'Concentration'], rowCount: 0 });
  });

  it('does not look for the header: a title row above it is the header, and the real header is counted', () => {
    expect(readTableRows([['Plate map v3'], ['Inducer', 'Concentration'], ['IPTG', '1']])).toEqual({ header: ['Plate map v3'], rowCount: 2 });
  });
});

describe('missingColumns (rule 19)', () => {
  it('matches after trimming and ignoring case, in any order, with extra header cells ignored', () => {
    expect(missingColumns(['  location', 'NOTES', 'Inducer ', 'concentration'], ['Inducer', 'Concentration', 'Location'])).toEqual([]);
  });

  it('names every missing column in expected order and expected spelling', () => {
    expect(missingColumns(['inducer'], ['Inducer', 'Concentration', 'Location'])).toEqual(['Concentration', 'Location']);
  });

  it('is never missing anything when no columns are expected (rule 20)', () => {
    expect(missingColumns(['Anything'], [])).toEqual([]);
  });
});

describe('readTableBytes', () => {
  it('reads an .xlsx workbook and a .csv', () => {
    expect(readTableBytes(xlsxBytes([['Inducer', 'Concentration'], ['IPTG', 1], ['aTc', 2]]))).toEqual({ header: ['Inducer', 'Concentration'], rowCount: 2 });
    expect(readTableBytes(new TextEncoder().encode('Inducer,Concentration\nIPTG,1\n\n"aTc, fresh",2\n,\n'))).toEqual({ header: ['Inducer', 'Concentration'], rowCount: 2 });
  });

  it('reads the first sheet only, skipping a hidden first sheet', () => {
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Ignore'], ['x1'], ['x2']]), 'Hidden');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Inducer'], ['IPTG']]), 'Table');
    workbook.Workbook = { Sheets: [{ Hidden: 1 }, { Hidden: 0 }] };
    const bytes = new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
    expect(readTableBytes(bytes)).toEqual({ header: ['Inducer'], rowCount: 1 });
  });

  // Review Focus 1: Excel's "CSV UTF-8" starts with a byte-order mark.
  it('ignores a UTF-8 byte-order mark, so the first header cell still matches its column', () => {
    const bytes = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('Inducer,Concentration\nIPTG,1\n')]);
    const contents = readTableBytes(bytes);
    expect(contents).toEqual({ header: ['Inducer', 'Concentration'], rowCount: 1 });
    expect(missingColumns(contents.header, ['Inducer', 'Concentration'])).toEqual([]);
  });

  // The server's exceljs reads CSV on commas only; these pin the same outcomes byte for byte.
  it('reads CSV on commas only, as the server does', () => {
    const text = (t: string) => readTableBytes(new TextEncoder().encode(t));
    expect(text('Sample ID;Volume\nS1;10\n')).toEqual({ header: ['Sample ID;Volume'], rowCount: 1 });
    expect(text('Sample ID\tVolume\nS1\t10\n')).toEqual({ header: ['Sample ID\tVolume'], rowCount: 1 });
    expect(text('Sample ID|Volume\nS1|10\n')).toEqual({ header: ['Sample ID|Volume'], rowCount: 1 });
    expect(text('sep=,\nA,B\n1,2')).toEqual({ header: ['sep='], rowCount: 2 });
    expect(text('{\\rtf1 hello,world\n')).toEqual({ header: ['{\\rtf1 hello', 'world'], rowCount: 0 });
  });

  it('honours quotes: a quoted comma, a doubled quote and a quoted newline stay in one cell', () => {
    const text = (t: string) => readTableBytes(new TextEncoder().encode(t));
    expect(text('"A, one","B ""q"""\nx,y\n')).toEqual({ header: ['A, one', 'B "q"'], rowCount: 1 });
    expect(text('A,B\n"line1\nline2",y\nz,w\n')).toEqual({ header: ['A', 'B'], rowCount: 2 });
  });

  it('accepts \\r\\n, \\n and bare \\r line ends', () => {
    const text = (t: string) => readTableBytes(new TextEncoder().encode(t));
    expect(text('A,B\r1,2\r3,4\r')).toEqual({ header: ['A', 'B'], rowCount: 2 });
    expect(text('A,B\r\n1,2\r\n3,4\r\n')).toEqual({ header: ['A', 'B'], rowCount: 2 });
  });

  it('keeps CSV cells as plain text, never as numbers or dates', () => {
    expect(readTableBytes(new TextEncoder().encode('1/2/2020,007\nx,y\n'))).toEqual({ header: ['1/2/2020', '007'], rowCount: 1 });
    expect(readTableBytes(new TextEncoder().encode('2024-01-05,007,1.50\nx,y,z\n')).header).toEqual(['2024-01-05', '007', '1.50']);
  });

  it('refuses bytes that are neither a workbook nor text (rule 21)', () => {
    const xls = new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0, 0, 0, 0]);
    expect(() => readTableBytes(xls)).toThrow(TABLE_FILE_UNREADABLE_MESSAGE);
    expect(() => readTableBytes(xls)).toThrow(SampleSheetError);
    expect(() => readTableBytes(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x0a, 0x00, 0x01]))).toThrow(TABLE_FILE_UNREADABLE_MESSAGE);
  });

  it('refuses a zip that is not a workbook', () => {
    expect(() => readTableBytes(new Uint8Array([0x50, 0x4b, ...new Array(40).fill(7)]))).toThrow(SampleSheetError);
  });

  it('reads the shared fixtures exactly as the server does', () => {
    expect(readTableBytes(fixture('samples-96.xlsx'))).toEqual({ header: ['Sample ID', 'Volume (uL)', 'Notes'], rowCount: 96 });
    expect(readTableBytes(fixture('samples-with-gaps.csv'))).toEqual({ header: ['Sample ID', 'Volume'], rowCount: 3 });
    expect(readTableBytes(fixture('samples-with-banner.xlsx')).rowCount).toBe(5);
    expect(readTableBytes(fixture('template-with-banner.xlsx')).rowCount).toBe(1);
  });

  // M1: both readers agree on a numeric header cell and on an unterminated quote.
  it('reads numeric .xlsx header cells as their value’s text, as the server does (shared fixture)', () => {
    expect(readTableBytes(fixture('numeric-header.xlsx'))).toEqual({ header: ['Sample ID', '2024', '7', '1.5'], rowCount: 2 });
  });

  it('refuses a CSV with an unterminated quote as unreadable, as the server does', () => {
    const text = (t: string) => readTableBytes(new TextEncoder().encode(t));
    expect(() => text('Inducer,"Concentration\nIPTG,1\n')).toThrow(TABLE_FILE_UNREADABLE_MESSAGE);
    expect(() => text('Inducer,"Concentration\nIPTG,1\n')).toThrow(SampleSheetError);
    expect(text('Inducer,"Concentration"\nIPTG,1\n').header).toEqual(['Inducer', 'Concentration']);
  });

  it('keeps the fixtures byte-identical to the backend copy (pinned hashes)', () => {
    const expected: Record<string, string> = {
      'samples-96.xlsx': '65f9e17b5e998608381f5979a4a96021ca8440227fc92d38b17426c931f90bfc',
      'samples-with-gaps.csv': '4b2fd83ec9429a8704a4243db216a0834d402386df7e532aece603315e4dcc70',
      'template-with-banner.xlsx': 'd86034e74901ca53b82d59b0d657f6c14a0395531bc2f1759bffcbc51371211a',
      'samples-with-banner.xlsx': 'a0447dc38ae4007ab9f03885c10b42f872743ddb17139b3fbee2306699a815fd',
      'numeric-header.xlsx': '6ea2cb9ee9f6255f3279026643fa30e3c6d124e20931d2084ebc8516027ad660'
    };
    for (const [name, hash] of Object.entries(expected)) expect(createHash('sha256').update(fixture(name)).digest('hex')).toBe(hash);
  });
});

describe('checkTableFile (rule 17: the same check the server makes, as a preview)', () => {
  it('returns the row count when every expected column is in the header', async () => {
    await expect(checkTableFile(fileOf('samples.xlsx', fixture('samples-96.xlsx')), ['sample id', 'Notes'])).resolves.toBe(96);
    await expect(checkTableFile(fileOf('samples.csv', fixture('samples-with-gaps.csv')), ['Volume', 'Sample ID'])).resolves.toBe(3);
  });

  it('refuses with the message naming every missing column', async () => {
    await expect(checkTableFile(fileOf('samples.csv', fixture('samples-with-gaps.csv')), ['Sample ID', 'Concentration', 'Location'])).rejects.toThrow('This file is missing the columns: Concentration, Location.');
    await expect(checkTableFile(fileOf('samples.csv', 'Strain\nBL21\n'), ['Inducer'])).rejects.toBeInstanceOf(SampleSheetError);
  });

  it('refuses a sheet with a title row above its header when columns are expected', async () => {
    await expect(checkTableFile(fileOf('banner.xlsx', fixture('samples-with-banner.xlsx')), ['Sample ID'])).rejects.toThrow('This file is missing the columns: Sample ID.');
  });

  it('has no column check when no columns are expected (rule 20), and accepts a header with zero rows', async () => {
    await expect(checkTableFile(fileOf('banner.xlsx', fixture('samples-with-banner.xlsx')), [])).resolves.toBe(5);
    await expect(checkTableFile(fileOf('empty.csv', 'Inducer,Concentration\n'), ['Inducer', 'Concentration'])).resolves.toBe(0);
  });

  it('judges the file by its bytes, never its name', async () => {
    await expect(checkTableFile(fileOf('really-a-workbook.csv', fixture('samples-96.xlsx')), ['Sample ID'])).resolves.toBe(96);
    await expect(checkTableFile(fileOf('really-text.xlsx', 'Inducer\nIPTG\n'), ['Inducer'])).resolves.toBe(1);
  });

  it('refuses a file over the size cap without reading it', async () => {
    await expect(checkTableFile(fileOf('big.csv', new Uint8Array(10 * 1024 * 1024 + 1)), [])).rejects.toThrow(TABLE_FILE_TOO_LARGE_MESSAGE);
  });
});

describe('buildTableTemplate / tableTemplateFilename (rule 15)', () => {
  it('is an .xlsx with one sheet holding one header row of the columns in order and nothing else', () => {
    const bytes = buildTableTemplate(['Inducer', 'Concentration', 'Location']);
    expect([bytes[0], bytes[1]]).toEqual([0x50, 0x4b]);
    const workbook = XLSX.read(bytes, { type: 'array' });
    expect(workbook.SheetNames).toHaveLength(1);
    expect(XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { header: 1 })).toEqual([['Inducer', 'Concentration', 'Location']]);
  });

  it('round-trips through the reader: the template itself passes its own column check with zero rows', () => {
    const contents = readTableBytes(buildTableTemplate(['Inducer', 'Concentration']));
    expect(contents).toEqual({ header: ['Inducer', 'Concentration'], rowCount: 0 });
  });

  it('names the file after the parameter, without characters a filename cannot hold', () => {
    expect(tableTemplateFilename('Plate map')).toBe('Plate map template.xlsx');
    expect(tableTemplateFilename('  Inducers / doses?  ')).toBe('Inducers  doses template.xlsx');
    expect(tableTemplateFilename('')).toBe('Table template.xlsx');
  });
});
