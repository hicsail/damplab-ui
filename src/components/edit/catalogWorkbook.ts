import * as XLSX from 'xlsx';
import { operationExportFields, OPERATION_COLUMNS, OPERATIONS_SHEET_NAME } from './operationsSheet';
import { worksheetFor } from './exportFields';

export interface CatalogExportJson {
  services: any[];
  categories: any[];
  bundles: any[];
  parameterSets: any[];
  inventory: any[];
  sowSections: any[];
  exportedAt: string;
}

export const CATALOG_SHEET_NAMES = [OPERATIONS_SHEET_NAME, 'Categories', 'Bundles', 'Parameter Sets', 'Inventory', 'SOW Sections'] as const;

const pad = (n: number): string => String(n).padStart(2, '0');

/** Local date, not UTC — a caller downloading at 11pm gets today's date, not tomorrow's. */
export function catalogFileBaseName(date: Date): string {
  return `damplab-catalog-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Arrays of scalars → "a; b"; objects → JSON; scalars as-is. Column order = first-seen key order. */
function flatSheet(rows: ReadonlyArray<Record<string, unknown>>): XLSX.WorkSheet {
  const keys: string[] = [];
  for (const row of rows) for (const key of Object.keys(row)) if (!keys.includes(key)) keys.push(key);
  const cell = (v: unknown): string | number | boolean => {
    if (v === null || v === undefined) return '';
    if (Array.isArray(v)) return v.every((x) => typeof x !== 'object' || x === null) ? v.join('; ') : JSON.stringify(v);
    if (typeof v === 'object') return JSON.stringify(v);
    return v as string | number | boolean;
  };
  return XLSX.utils.aoa_to_sheet([keys, ...rows.map((row) => keys.map((key) => cell(row[key])))]);
}

/** Seed-shaped JSON catalog → the six-sheet archive workbook (pin 33/35). */
export function buildCatalogWorkbook(catalog: CatalogExportJson): XLSX.WorkBook {
  const setNameById = new Map<string, string>(catalog.parameterSets.map((s) => [String(s.id), String(s.name)]));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, worksheetFor(catalog.services, operationExportFields(setNameById), new Set<string>(OPERATION_COLUMNS)), OPERATIONS_SHEET_NAME);
  XLSX.utils.book_append_sheet(wb, flatSheet(catalog.categories), 'Categories');
  XLSX.utils.book_append_sheet(wb, flatSheet(catalog.bundles), 'Bundles');
  XLSX.utils.book_append_sheet(
    wb,
    flatSheet(catalog.parameterSets.map((s) => ({ id: s.id, name: s.name, description: s.description, parameters: (s.parameters ?? []).map((p: any) => p?.id) }))),
    'Parameter Sets'
  );
  XLSX.utils.book_append_sheet(wb, flatSheet(catalog.inventory), 'Inventory');
  XLSX.utils.book_append_sheet(wb, flatSheet(catalog.sowSections), 'SOW Sections');
  return wb;
}
