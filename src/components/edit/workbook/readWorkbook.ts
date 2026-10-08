import * as XLSX from 'xlsx';
import { norm } from '../inventoryUploadUtils';
import { cellText } from './cells';
import { LISTS_SHEET_TITLE, RawRow, RawSheet, RawWorkbook, SHEET_COLUMNS, SHEET_KEYS, SHEET_TITLES, SheetKey } from './types';

const PARAMETER_SET_HEADER = /^parameterset(\d+)$/;

/** The canonical column a header means on a sheet, or null for a column that sheet does not have. */
export function canonicalColumn(sheet: SheetKey, header: unknown): string | null {
  const key = norm(header);
  if (key === '') return null;
  const fixed = SHEET_COLUMNS[sheet].find((column) => norm(column) === key);
  if (fixed) return fixed;
  if (sheet === 'operations') {
    const match = PARAMETER_SET_HEADER.exec(key);
    if (match) return `parameterSet${Number(match[1])}`;
  }
  return null;
}

function readSheet(sheet: SheetKey, title: string, worksheet: XLSX.WorkSheet): RawSheet {
  const aoa = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as unknown[][];
  const [header = [], ...body] = aoa;
  // sheet_to_json starts at the used range, so leading blank sheet rows are not in `aoa`: the header is sheet row firstRow + 1.
  const firstRow = worksheet['!ref'] ? XLSX.utils.decode_range(worksheet['!ref']).s.r : 0;
  const columnAt = new Map<number, string>();
  const ignoredColumns: string[] = [];
  header.forEach((raw, index) => {
    const text = cellText(raw);
    if (text === '') return;
    const column = canonicalColumn(sheet, text);
    if (!column || [...columnAt.values()].includes(column)) ignoredColumns.push(text);
    else columnAt.set(index, column);
  });

  const rows: RawRow[] = [];
  body.forEach((raw, index) => {
    const cells: Record<string, string> = {};
    for (const [i, column] of columnAt) cells[column] = cellText((raw as unknown[])?.[i]);
    // A row with nothing in any recognised column is not a row (a stray note, a formatted-but-empty line).
    if (Object.values(cells).every((v) => v === '')) return;
    rows.push({ rowNumber: firstRow + index + 2, cells });
  });
  return { title, columns: [...columnAt.values()], ignoredColumns, rows };
}

/** Recognised sheets by name (case-insensitive); every other sheet is named as ignored, except the download's own Lists sheet. */
export function readWorkbook(workbook: XLSX.WorkBook): RawWorkbook {
  const out: RawWorkbook = { sheets: {}, ignoredSheets: [] };
  for (const name of workbook.SheetNames) {
    const lowered = name.trim().toLowerCase();
    if (lowered === LISTS_SHEET_TITLE.toLowerCase()) continue;
    const sheet = SHEET_KEYS.find((key) => SHEET_TITLES[key].toLowerCase() === lowered);
    if (!sheet || out.sheets[sheet]) {
      out.ignoredSheets.push(name);
      continue;
    }
    out.sheets[sheet] = readSheet(sheet, name, workbook.Sheets[name]);
  }
  return out;
}

/** SheetJS, as the inventory upload reads its file. */
export async function readWorkbookFile(file: File): Promise<RawWorkbook> {
  return readWorkbook(XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true }));
}
