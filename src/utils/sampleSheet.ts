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

export const SAMPLE_SHEET_PARAM_TYPE = 'sampleSheet';

/** `accept` for the file pickers. Legacy `.xls` is not supported. */
export const SAMPLE_SHEET_ACCEPT = '.xlsx,.csv';

export const SAMPLE_SHEET_MAX_BYTES = 10 * 1024 * 1024;

export const isSampleSheetParam = (param: any): boolean => !!param && typeof param === 'object' && param.type === SAMPLE_SHEET_PARAM_TYPE;

/** A spreadsheet this browser cannot count, with a message meant for the customer. */
export class SampleSheetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SampleSheetError';
  }
}

/** The stored value of a sampleSheet parameter, once it has been uploaded. */
export interface StoredSampleSheet {
  filename: string;
  key?: string;
  contentType?: string;
  size?: number;
  sampleCount?: number;
  uploadedAt?: string;
  /** Short-lived download URL, added by the server when the job is read. */
  url?: string;
}

/**
 * The file record behind a formData value. Stored as a JSON string (like a
 * `file` parameter); comes back from the server as an object with `url`; and
 * on the canvas, before submission, is a pending-file object carrying the
 * chosen `File`. All three answer here.
 */
export const parseSampleSheetValue = (value: unknown): StoredSampleSheet | null => {
  if (value === null || value === undefined || value === '') return null;
  let parsed: any = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || typeof parsed.filename !== 'string') return null;
  const sampleCount = typeof parsed.sampleCount === 'number' && Number.isFinite(parsed.sampleCount) ? parsed.sampleCount : undefined;
  return { ...parsed, sampleCount };
};

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

export const sampleCountLabel = (count: number): string => `${count} ${count === 1 ? 'sample' : 'samples'}`;
