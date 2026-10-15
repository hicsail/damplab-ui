import * as XLSX from 'xlsx';

export {
  TABLE_PARAM_TYPE, SAMPLE_SHEET_PARAM_TYPE, SAMPLE_SHEET_TEMPLATE_KEY_PREFIX, SERVER_COUNTED, isTableType, isTableParam, expectedColumnsOf, hasStaffTemplate, tableIsSetUp,
  parseSampleSheetValue, sampleCountFromValue, sampleCountLabel, countedRows, tableFileOf
} from './sampleSheetValue';
export type { StoredSampleSheet } from './sampleSheetValue';

/**
 * The spreadsheet a customer uploads as a Table answer, read in the browser.
 *
 * A Table parameter is defined by a list of column names. The customer
 * downloads a template whose header row is those names, fills it in and
 * attaches it to the operation. What is read here when a file is picked — its
 * header row and how many rows sit below it — is a **preview**: the server
 * reads the stored file again, and its check and its count are the ones that
 * stand. The two must agree, so the rule and the messages below are the same
 * as `damplab-backend/src/workflow/utils/table-file.ts`, and both test suites
 * read the same fixture files.
 *
 * The rule, with nothing inferred: the first sheet is read; the first row with
 * any content is the header; every later row with any content in any cell is
 * one row of the count. The bytes are the only input — the file's name is
 * never consulted.
 */

/** `accept` for the file pickers. */
export const SAMPLE_SHEET_ACCEPT = '.xlsx,.csv';

export const SAMPLE_SHEET_MAX_BYTES = 10 * 1024 * 1024;

export const TABLE_FILE_UNREADABLE_MESSAGE = 'This file could not be read as a spreadsheet. Save it as .xlsx or .csv and try again.';
export const TABLE_FILE_NO_SHEETS_MESSAGE = 'This spreadsheet has no sheets in it.';
export const TABLE_FILE_TOO_LARGE_MESSAGE = 'This file must be smaller than 10 MB.';
export const TABLE_NOT_SET_UP_MESSAGE = 'This table has not been set up yet.';

export const missingColumnsMessage = (missing: readonly string[]): string => `This file is missing the columns: ${missing.join(', ')}.`;

/** A file this browser cannot accept, with a message meant for the person who picked it. */
export class SampleSheetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SampleSheetError';
  }
}

export interface TableFileContents {
  /** The cells of the header row, trimmed, blanks left out. */
  header: string[];
  /** Rows below the header that carry anything. */
  rowCount: number;
}

const cellText = (value: unknown): string => (value === null || value === undefined ? '' : String(value).trim());
const rowHasContent = (row: ReadonlyArray<unknown> | undefined): boolean => (row ?? []).some((cell) => cellText(cell) !== '');

/** Per cell rather than by the sheet's range, because a workbook styled down to row 500 reports those rows as part of the sheet. */
export const readTableRows = (rows: ReadonlyArray<ReadonlyArray<unknown>>): TableFileContents => {
  const list = rows ?? [];
  const headerIndex = list.findIndex(rowHasContent);
  if (headerIndex === -1) return { header: [], rowCount: 0 };
  let rowCount = 0;
  for (let i = headerIndex + 1; i < list.length; i++) if (rowHasContent(list[i])) rowCount++;
  return { header: (list[headerIndex] ?? []).map(cellText).filter((cell) => cell !== ''), rowCount };
};

const columnKey = (name: string): string => name.trim().toLowerCase();

/** The expected columns no header cell equals after trimming and ignoring case. Order and extra cells do not matter. */
export const missingColumns = (header: readonly string[], expected: readonly string[]): string[] => {
  const present = new Set(header.map(columnKey));
  return expected.filter((column) => !present.has(columnKey(column)));
};

/** Every `.xlsx` is a zip archive, which starts with these two bytes. */
const isZip = (bytes: Uint8Array): boolean => bytes.length >= 2 && bytes[0] === 0x50 && bytes[1] === 0x4b;

/**
 * CSV the way the server reads it: commas only (no sniffing of `;`, tabs or a
 * `sep=` line), double quotes with `""` as an escaped quote, quoted cells may
 * hold newlines, and `\r\n`, `\n` or a bare `\r` end a line. Cells stay text.
 */
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  const body = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (quoted) {
      if (ch !== '"') cell += ch;
      else if (body[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = false;
    } else if (ch === '"' && cell === '') quoted = true;
    else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && body[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else cell += ch;
  }
  // A quote that never closes: the server refuses it as unreadable, so the preview does too.
  if (quoted) throw new SampleSheetError(TABLE_FILE_UNREADABLE_MESSAGE);
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
};

/**
 * A worksheet's rows from the cells it actually holds, each cell as its raw
 * value (so 7 formatted `000` is `7`, as the server's exceljs reads it). Not `sheet_to_json`, which walks the sheet's whole
 * range cell by cell: a range reaching column XFD is 16,384 cells a row. Rows
 * with no cell are left out, which the reader treats the same as empty ones.
 */
const sparseRows = (worksheet: XLSX.WorkSheet): unknown[][] => {
  const byRow = new Map<number, unknown[]>();
  for (const address of Object.keys(worksheet)) {
    if (address.charCodeAt(0) === 33) continue; // '!ref', '!merges' and the like
    const cell = worksheet[address] as XLSX.CellObject | undefined;
    if (!cell || cell.v === undefined || cell.v === null) continue;
    const { r, c } = XLSX.utils.decode_cell(address);
    const row = byRow.get(r) ?? [];
    row[c] = cell.v;
    byRow.set(r, row);
  }
  return [...byRow.keys()].sort((a, b) => a - b).map((r) => byRow.get(r)!);
};

/**
 * The header row and row count of a file held in memory, by what its bytes
 * are: `PK` magic is a workbook; anything else is CSV text, unless it holds a
 * NUL byte, which no text file does (that turns away `.xls`, PDFs and images).
 * Zip bytes never go through the text reader: SheetJS does not return from a
 * workbook decoded as CSV text.
 */
export const readTableBytes = (data: ArrayBuffer | Uint8Array): TableFileContents => {
  const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
  if (bytes.byteLength > SAMPLE_SHEET_MAX_BYTES) throw new SampleSheetError(TABLE_FILE_TOO_LARGE_MESSAGE);
  let workbook: XLSX.WorkBook;
  if (isZip(bytes)) {
    try {
      workbook = XLSX.read(bytes, { type: 'array' });
    } catch {
      throw new SampleSheetError(TABLE_FILE_UNREADABLE_MESSAGE);
    }
  } else {
    if (bytes.includes(0)) throw new SampleSheetError(TABLE_FILE_UNREADABLE_MESSAGE);
    return readTableRows(parseCsv(new TextDecoder().decode(bytes)));
  }
  const sheetMeta = workbook.Workbook?.Sheets ?? [];
  // The first *visible* sheet, as the server reads it; a sheet with no recorded visibility is visible.
  const sheetName = workbook.SheetNames.find((_name, index) => (sheetMeta[index]?.Hidden ?? 0) === 0) ?? workbook.SheetNames[0];
  const worksheet = sheetName ? workbook.Sheets[sheetName] : undefined;
  if (!worksheet) throw new SampleSheetError(TABLE_FILE_NO_SHEETS_MESSAGE);
  return readTableRows(sparseRows(worksheet));
};

/**
 * The preview made when a file is picked: its row count, or a SampleSheetError
 * saying why the server will refuse it. No columns expected (a legacy sample
 * sheet with only a staff template) means no column check.
 */
export const checkTableFile = async (file: File, expected: readonly string[]): Promise<number> => {
  if (file.size > SAMPLE_SHEET_MAX_BYTES) throw new SampleSheetError(TABLE_FILE_TOO_LARGE_MESSAGE);
  const { header, rowCount } = readTableBytes(await file.arrayBuffer());
  const missing = missingColumns(header, expected);
  if (missing.length > 0) throw new SampleSheetError(missingColumnsMessage(missing));
  return rowCount;
};

/** The template a customer downloads for a Table defined by columns: one sheet, one header row, nothing else. */
export const buildTableTemplate = (columns: readonly string[]): Uint8Array => {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([[...columns]]), 'Table');
  return new Uint8Array(XLSX.write(workbook, { type: 'array', bookType: 'xlsx' }));
};

/** `<parameter name> template.xlsx`, without the characters a filename cannot hold. */
export const tableTemplateFilename = (parameterName: string): string => {
  const name = String(parameterName ?? '').replace(/[\\/:*?"<>|]/g, '').trim();
  return `${name || 'Table'} template.xlsx`;
};
