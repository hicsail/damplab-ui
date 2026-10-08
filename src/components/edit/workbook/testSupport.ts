import { CatalogSnapshot, RawSheet, SHEET_TITLES, SheetKey } from './types';

/** Test fixture: a parsed sheet from a header and rows of cell text. Row numbers start at 2, as in a spreadsheet. */
export function rawSheet(sheet: SheetKey, columns: string[], rows: string[][]): RawSheet {
  return {
    title: SHEET_TITLES[sheet],
    columns,
    ignoredColumns: [],
    rows: rows.map((values, index) => ({ rowNumber: index + 2, cells: Object.fromEntries(columns.map((column, i) => [column, values[i] ?? ''])) }))
  };
}

/** Test fixture: an empty catalog with the given parts filled in. */
export function catalogOf(over: Partial<CatalogSnapshot> = {}): CatalogSnapshot {
  return { operations: [], sets: [], categories: [], bundles: [], sowPresets: [], sowSectionKeys: [], ...over };
}
