/**
 * What a Table parameter and its stored answer are, kept apart from
 * `sampleSheet.ts` so that pricing and the job cards can read them without
 * pulling the `xlsx` reader into their module graph.
 *
 * A Table parameter is one whose stored `type` is `table` or `sampleSheet`:
 * the two were separate types and are now one. A new Table is written as
 * `table`; a parameter already stored keeps the string it has, because pricing
 * prices its old answers by it. Twin of
 * `damplab-backend/src/workflow/utils/sample-sheet.util.ts`.
 */

export const TABLE_PARAM_TYPE = 'table';
export const SAMPLE_SHEET_PARAM_TYPE = 'sampleSheet';

/** Where staff-uploaded blank templates live in storage. */
export const SAMPLE_SHEET_TEMPLATE_KEY_PREFIX = 'sample-sheet-templates/';

export const isTableType = (type: unknown): boolean => type === TABLE_PARAM_TYPE || type === SAMPLE_SHEET_PARAM_TYPE;

export const isTableParam = (param: any): boolean => !!param && typeof param === 'object' && isTableType(param.type);

/** The columns an uploaded file must carry: each `tableData.columns[].header`, trimmed, in order. `tableData.rows` is never read. */
export const expectedColumnsOf = (param: any): string[] =>
  (Array.isArray(param?.tableData?.columns) ? param.tableData.columns : [])
    .map((column: any) => (typeof column?.header === 'string' ? column.header.trim() : ''))
    .filter((header: string) => header !== '');

/** A blank template file staff uploaded for this parameter (legacy; new Tables are defined by columns). */
export const hasStaffTemplate = (param: any): boolean => typeof param?.templateFile?.key === 'string' && param.templateFile.key.startsWith(SAMPLE_SHEET_TEMPLATE_KEY_PREFIX);

/** A Table can be answered only when it has a column or a staff template. */
export const tableIsSetUp = (param: any): boolean => expectedColumnsOf(param).length > 0 || hasStaffTemplate(param);

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

/** The row count on a stored value, or undefined when there is no file or no count. */
export const sampleCountFromValue = (value: unknown): number | undefined => parseSampleSheetValue(value)?.sampleCount;

export const sampleCountLabel = (count: number): string => `${count} ${count === 1 ? 'row' : 'rows'}`;

/**
 * The file record to show for a Table answer. A stored Table can still carry
 * `allowMultipleValues` (it is never rewritten — pricing reads it), and the
 * server wraps every answer to such a parameter in an array, so the one file a
 * Table holds may arrive as a one-element array. For display only: pricing
 * must keep using `sampleCountFromValue` and `countedRows`, which do not
 * unwrap — unwrapping there would change what old array answers bill.
 */
export const tableFileOf = (value: unknown): StoredSampleSheet | null => {
  if (!Array.isArray(value)) return parseSampleSheetValue(value);
  for (const element of value) {
    const file = parseSampleSheetValue(element);
    if (file) return file;
  }
  return null;
};

/** The mark the server puts on a Table value whose rows it counted itself (`countedBy`). Twin of the backend's SERVER_COUNTED. */
export const SERVER_COUNTED = 'server';

/**
 * The rows a Table answer is priced for: the `sampleCount` of a file the server
 * counted (`countedBy: 'server'`), or of a file just picked on the canvas and
 * not yet submitted (a pending file — the browser's count, a preview), summed
 * over an array. Undefined for anything else, which is every answer stored
 * before the server started counting: pricing leaves those to the code that
 * priced them before, so their price cannot have moved. Twin of the backend's
 * serverCountedRows.
 */
export const countedRows = (value: unknown): number | undefined => {
  let rows: number | undefined;
  for (const element of Array.isArray(value) ? value : [value]) {
    let record: any = element;
    if (typeof element === 'string') {
      try {
        record = JSON.parse(element);
      } catch {
        continue;
      }
    }
    if (!record || typeof record !== 'object' || Array.isArray(record)) continue;
    const counted = record.countedBy === SERVER_COUNTED || record.__kind === 'pending-file';
    const count = record.sampleCount;
    if (!counted || typeof count !== 'number' || !Number.isFinite(count) || count < 0) continue;
    rows = (rows ?? 0) + count;
  }
  return rows;
};
