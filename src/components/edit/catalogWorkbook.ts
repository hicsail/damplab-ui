import * as XLSX from 'xlsx';
import { operationExportFields, OPERATION_COLUMNS, OPERATIONS_SHEET_NAME, PARAMETERS_SHEET_NAME, parameterSheetRows } from './operationsSheet';
import { worksheetFor } from './exportFields';

export interface CatalogExportJson {
  services: any[];
  categories: any[];
  bundles: any[];
  parameterSets: any[];
  inventory: any[];
  sowSections: any[];
  /** Absent from a backend older than the one that added them. */
  stations?: any[];
  protocolMaps?: any[];
  exportedAt: string;
}

export const CATALOG_SHEET_NAMES = [OPERATIONS_SHEET_NAME, PARAMETERS_SHEET_NAME, 'Categories', 'Bundles', 'Parameter Sets', 'Inventory', 'SOW Sections', 'Stations', 'Protocol Maps'] as const;

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

/**
 * The catalog JSON carries each operation's OWN parameters; the Parameters sheet
 * lists the effective ones, as the operations download does. So each set's
 * parameters are appended here, labelled with the set they come from, skipping
 * an id the operation defines itself (the operation's own wins).
 */
function withSetParameters(catalog: CatalogExportJson): any[] {
  const setById = new Map<string, any>(catalog.parameterSets.map((s) => [String(s.id), s]));
  return catalog.services.map((service) => {
    const own: any[] = Array.isArray(service.parameters) ? service.parameters : [];
    const taken = new Set(own.map((p) => String(p?.id)));
    const fromSets: any[] = [];
    for (const setId of service.parameterSetIds ?? []) {
      const set = setById.get(String(setId));
      for (const p of set?.parameters ?? []) {
        if (taken.has(String(p?.id))) continue;
        taken.add(String(p?.id));
        fromSets.push({ ...p, fromParameterSetName: set.name });
      }
    }
    return { ...service, parameters: [...own, ...fromSets] };
  });
}

/**
 * Seed-shaped JSON catalog → the archive workbook (pin 33/35). The workbook is
 * the readable summary; the JSON beside it in the download is the full record —
 * a parameter's options, prices and rules do not fit a cell.
 */
export function buildCatalogWorkbook(catalog: CatalogExportJson): XLSX.WorkBook {
  const setNameById = new Map<string, string>(catalog.parameterSets.map((s) => [String(s.id), String(s.name)]));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, worksheetFor(catalog.services, operationExportFields(setNameById), new Set<string>(OPERATION_COLUMNS)), OPERATIONS_SHEET_NAME);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(parameterSheetRows(withSetParameters(catalog))), PARAMETERS_SHEET_NAME);
  XLSX.utils.book_append_sheet(wb, flatSheet(catalog.categories), 'Categories');
  XLSX.utils.book_append_sheet(wb, flatSheet(catalog.bundles), 'Bundles');
  XLSX.utils.book_append_sheet(
    wb,
    flatSheet(catalog.parameterSets.map((s) => ({ id: s.id, name: s.name, description: s.description, parameters: (s.parameters ?? []).map((p: any) => p?.id) }))),
    'Parameter Sets'
  );
  XLSX.utils.book_append_sheet(wb, flatSheet(catalog.inventory), 'Inventory');
  XLSX.utils.book_append_sheet(wb, flatSheet(catalog.sowSections), 'SOW Sections');
  XLSX.utils.book_append_sheet(wb, flatSheet(catalog.stations ?? []), 'Stations');
  XLSX.utils.book_append_sheet(wb, flatSheet(catalog.protocolMaps ?? []), 'Protocol Maps');
  return wb;
}

/**
 * One download: `<base>.zip` holding `<base>.json` (the full record) and
 * `<base>.xlsx` (the workbook). Two separate downloads from one click is what a
 * browser blocks as "multiple downloads", so the second file went missing.
 * The zip is written by SheetJS's own container code — no extra dependency.
 */
export function buildCatalogZip(catalog: CatalogExportJson, base: string): Uint8Array<ArrayBuffer> {
  const container = XLSX.CFB.utils.cfb_new();
  const json = new TextEncoder().encode(JSON.stringify(catalog, null, 2));
  const workbook = new Uint8Array(XLSX.write(buildCatalogWorkbook(catalog), { type: 'array', bookType: 'xlsx' }));
  XLSX.CFB.utils.cfb_add(container, `/${base}.json`, json);
  XLSX.CFB.utils.cfb_add(container, `/${base}.xlsx`, workbook);
  const bytes = XLSX.CFB.write(container, { fileType: 'zip', type: 'array' }) as ArrayLike<number>;
  // Copied into a buffer of its own so the result is a plain BlobPart.
  const zip = new Uint8Array(new ArrayBuffer(bytes.length));
  zip.set(bytes);
  return zip;
}
