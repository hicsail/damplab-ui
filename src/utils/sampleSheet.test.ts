import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { countSampleRows, countSampleSheetBytes, countSampleSheetFile, parseSampleSheetValue, sampleCountLabel, SampleSheetError } from './sampleSheet';

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
  it('pluralises', () => {
    expect(sampleCountLabel(0)).toBe('0 samples');
    expect(sampleCountLabel(1)).toBe('1 sample');
    expect(sampleCountLabel(96)).toBe('96 samples');
  });
});
