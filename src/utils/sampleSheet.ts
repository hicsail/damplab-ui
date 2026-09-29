import * as XLSX from 'xlsx';

/**
 * Samples spreadsheets.
 *
 * A `sampleSheet` catalog parameter carries a blank template staff attached
 * (`templateFile` on the parameter). The customer downloads it, fills in one
 * row per sample and attaches it to the operation. The count shown everywhere
 * is the number of rows below the header — read here, in the browser, when the
 * file is picked, and stored next to the file's key. It is informational, not
 * a price input, which is why a browser-side count is enough.
 *
 * The rule is the whole rule: the first row with anything in it is the header,
 * and every later row with anything in it is a sample. Nothing tries to tell a
 * title row from a header row — a sheet with a banner above its header reads
 * one high per banner row, which is why the lab's templates should not have
 * one, and why the number is shown to the person who packed the samples.
 */

export { SAMPLE_SHEET_PARAM_TYPE, isSampleSheetParam, parseSampleSheetValue, sampleCountFromValue, sampleCountLabel } from './sampleSheetValue';
export type { StoredSampleSheet } from './sampleSheetValue';

/** `accept` for the file pickers. Legacy `.xls` is not supported. */
export const SAMPLE_SHEET_ACCEPT = '.xlsx,.csv';

export const SAMPLE_SHEET_MAX_BYTES = 10 * 1024 * 1024;

/** A spreadsheet this browser cannot count, with a message meant for the customer. */
export class SampleSheetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SampleSheetError';
  }
}

const cellHasContent = (cell: unknown): boolean => cell !== null && cell !== undefined && String(cell).trim() !== '';

const rowHasContent = (row: ReadonlyArray<unknown> | undefined): boolean => (row ?? []).some(cellHasContent);

/**
 * Rows below the header that carry anything. The header is the first row with
 * content; per-cell rather than by the sheet's range, because a workbook styled
 * down to row 500 reports those rows as part of the sheet.
 */
export const countSampleRows = (rows: ReadonlyArray<ReadonlyArray<unknown>>): number => {
  const headerIndex = rows.findIndex(rowHasContent);
  if (headerIndex === -1) return 0;
  let count = 0;
  for (let i = headerIndex + 1; i < rows.length; i++) {
    if (rowHasContent(rows[i])) count++;
  }
  return count;
};

/** Counts the first sheet of an .xlsx or .csv held in memory. */
export const countSampleSheetBytes = (bytes: ArrayBuffer | Uint8Array): number => {
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes), { type: 'array' });
  } catch {
    throw new SampleSheetError('That file could not be read as a spreadsheet. Save it as .xlsx or .csv and try again.');
  }
  const first = workbook.SheetNames[0];
  if (!first) throw new SampleSheetError('That spreadsheet has no sheets in it.');
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[first], { header: 1, blankrows: false, defval: null });
  return countSampleRows(rows);
};

/** Checks the file's name and size, then counts it. */
export const countSampleSheetFile = async (file: File): Promise<number> => {
  if (!/\.(xlsx|csv)$/i.test(file.name)) throw new SampleSheetError('The samples spreadsheet must be an .xlsx or .csv file.');
  if (file.size > SAMPLE_SHEET_MAX_BYTES) throw new SampleSheetError('The samples spreadsheet must be smaller than 10 MB.');
  return countSampleSheetBytes(await file.arrayBuffer());
};
