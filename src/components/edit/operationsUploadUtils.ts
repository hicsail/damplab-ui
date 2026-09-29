import * as XLSX from 'xlsx';
import { norm } from './inventoryUploadUtils';
import { OPERATION_COLUMNS, OperationColumn, OperationLike, OPERATIONS_SHEET_NAME, PRICING_COLUMNS, PricingColumn, tierPrice } from './operationsSheet';
import type { SetRef } from '../../utils/serviceParameters';

/**
 * The operations spreadsheet upload, as pure functions: which sheet, which rows
 * do what, and the exact mutation inputs. Parameters are never imported — ids
 * key recorded job answers — so the Parameters sheet is ignored.
 */
export interface ParsedOperationRow {
  /** 1-based spreadsheet row, header = 1. */
  rowNumber: number;
  id: string;
  /** Trimmed cell text for the columns present in the sheet. Absent column ⇒ absent key. */
  values: Partial<Record<OperationColumn, string>>;
  action: 'create' | 'update' | 'skip';
  existingId?: string;
  errors: string[];
  warnings: string[];
  selectedByDefault: boolean;
}

export interface ParsedOperationsSheet {
  presentColumns: OperationColumn[];
  rows: ParsedOperationRow[];
}

export interface OperationsParseContext {
  existing: ReadonlyArray<OperationLike>;
  deletedIds: ReadonlySet<string>;
  sets: ReadonlyArray<SetRef>;
  allowPricing: boolean;
}

export const OPTIONAL_UPLOAD_COLUMNS: OperationColumn[] = OPERATION_COLUMNS.filter((c) => c !== 'id' && c !== 'name');

const COLUMN_BY_NORM = new Map<string, OperationColumn>(OPERATION_COLUMNS.map((c) => [norm(c), c]));
const isPricing = (c: OperationColumn): c is PricingColumn => (PRICING_COLUMNS as readonly string[]).includes(c);
const cellText = (v: unknown): string => (v instanceof Date ? v.toISOString().slice(0, 10) : v === null || v === undefined ? '' : String(v).trim());

export function pickOperationsSheet(workbook: XLSX.WorkBook): unknown[][] {
  const name = workbook.SheetNames.find((n) => n.trim().toLowerCase() === OPERATIONS_SHEET_NAME.toLowerCase()) ?? workbook.SheetNames[0];
  if (!name) return [];
  return XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, defval: '' }) as unknown[][];
}

/** SheetJS, never a comma split (F3). */
export async function readOperationsFile(file: File): Promise<unknown[][]> {
  return pickOperationsSheet(XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true }));
}

/** '' → null (clear); a negative or non-number → 'invalid'. Accepts "$1,200.50". */
function parseMoney(raw: string): number | null | 'invalid' {
  if (raw === '') return null;
  const n = Number(raw.replace(/[$,\s]/g, ''));
  return Number.isFinite(n) && n >= 0 ? n : 'invalid';
}

function parseYesNo(raw: string): boolean | 'invalid' {
  const v = raw.trim().toLowerCase();
  if (['', 'n', 'no', 'false', '0'].includes(v)) return false;
  if (['y', 'yes', 'true', '1'].includes(v)) return true;
  return 'invalid';
}

function parsePricingMode(raw: string): 'SERVICE' | 'PARAMETER' | 'invalid' {
  const v = raw.trim().toUpperCase();
  if (v === '' || v === 'SERVICE') return 'SERVICE';
  if (v === 'PARAMETER') return 'PARAMETER';
  return 'invalid';
}

function resolveSetNames(raw: string, sets: ReadonlyArray<SetRef>): { ids: string[]; unknown: string[] } {
  const byName = new Map(sets.map((s) => [s.name.trim().toLowerCase(), s.id]));
  const ids: string[] = [];
  const unknown: string[] = [];
  for (const name of raw.split(';').map((n) => n.trim()).filter(Boolean)) {
    const id = byName.get(name.toLowerCase());
    if (id) ids.push(id);
    else unknown.push(name);
  }
  return { ids, unknown };
}

function validateValues(row: ParsedOperationRow, sets: ReadonlyArray<SetRef>): void {
  const v = row.values;
  if (row.action === 'update' && v.name !== undefined && v.name === '') row.errors.push('Name cannot be blank.');
  for (const c of PRICING_COLUMNS) {
    if (v[c] !== undefined && parseMoney(v[c]!) === 'invalid') row.errors.push(`${c}: "${v[c]}" is not a valid price.`);
  }
  if (v.pricingMode !== undefined && parsePricingMode(v.pricingMode) === 'invalid') row.errors.push(`pricingMode: "${v.pricingMode}" must be SERVICE or PARAMETER.`);
  if (v.hiddenFromClients !== undefined && parseYesNo(v.hiddenFromClients) === 'invalid') row.errors.push(`hiddenFromClients: "${v.hiddenFromClients}" must be Y or N.`);
  if (v.parameterSets !== undefined) for (const name of resolveSetNames(v.parameterSets, sets).unknown) row.errors.push(`Unknown parameter set "${name}".`);
}

export function parseOperationsSheet(aoa: unknown[][], ctx: OperationsParseContext): ParsedOperationsSheet {
  if (aoa.length === 0) throw new Error('The spreadsheet is empty.');
  const [header, ...body] = aoa;
  const columnAt = new Map<number, OperationColumn>();
  (header ?? []).forEach((h, i) => {
    const column = COLUMN_BY_NORM.get(norm(h));
    if (!column || [...columnAt.values()].includes(column)) return;
    if (isPricing(column) && !ctx.allowPricing) return;
    columnAt.set(i, column);
  });
  const present = new Set(columnAt.values());
  const presentColumns = OPERATION_COLUMNS.filter((c) => present.has(c));
  if (!present.has('id') && !present.has('name')) throw new Error('The Operations sheet needs an "id" or a "name" column.');

  const byId = new Map(ctx.existing.map((o) => [String(o.id), o]));
  const takenNames = new Set(ctx.existing.map((o) => o.name.trim().toLowerCase()));
  const firstRowForId = new Map<string, number>();
  const rows: ParsedOperationRow[] = [];

  body.forEach((raw, index) => {
    const values: Partial<Record<OperationColumn, string>> = {};
    for (const [i, column] of columnAt) values[column] = cellText((raw as unknown[])?.[i]);
    if (Object.values(values).every((v) => v === '')) return;

    const rowNumber = index + 2;
    const id = values.id ?? '';
    const row: ParsedOperationRow = { rowNumber, id, values, action: 'create', errors: [], warnings: [], selectedByDefault: true };

    if (id) {
      const earlier = firstRowForId.get(id);
      if (earlier !== undefined) {
        row.action = 'skip';
        row.selectedByDefault = false;
        row.warnings.push(`Duplicate id "${id}" — row ${earlier} already has it; skipped.`);
        rows.push(row);
        return;
      }
      firstRowForId.set(id, rowNumber);
      if (byId.has(id)) {
        row.action = 'update';
        row.existingId = id;
      } else if (ctx.deletedIds.has(id)) {
        row.action = 'skip';
        row.warnings.push(`Operation "${id}" was deleted; skipped.`);
      } else {
        row.action = 'skip';
        row.errors.push(`No operation has id "${id}".`);
      }
    } else if (!values.name) {
      row.errors.push('A new operation needs a name.');
    } else if (takenNames.has(values.name.toLowerCase())) {
      row.warnings.push(`An operation named "${values.name}" already exists.`);
      row.selectedByDefault = false;
    }

    if (row.action !== 'skip') validateValues(row, ctx.sets);
    if (row.errors.length > 0) row.action = 'skip';
    if (row.action === 'skip') row.selectedByDefault = false;
    rows.push(row);
  });

  return { presentColumns, rows };
}

const TIER_KEYS: Record<PricingColumn, { nested: string; flat: string }> = {
  pricingInternal: { nested: 'internal', flat: 'internalPrice' },
  pricingExternalAcademic: { nested: 'externalAcademic', flat: 'externalAcademicPrice' },
  pricingExternalMarket: { nested: 'externalMarket', flat: 'externalMarketPrice' },
  pricingExternalNoSalary: { nested: 'externalNoSalary', flat: 'externalNoSalaryPrice' },
  pricingLegacy: { nested: 'legacy', flat: 'price' }
};

/** The operation's current tiers as a clean input object — explicit keys only, so no `__typename`. */
export function existingPricing(op: OperationLike | undefined): Record<'internal' | 'external' | 'externalAcademic' | 'externalMarket' | 'externalNoSalary' | 'legacy', number | null> {
  const external = op?.pricing?.external ?? op?.externalPrice ?? null;
  return {
    internal: op ? tierPrice(op, 'pricingInternal') : null,
    external,
    externalAcademic: op ? tierPrice(op, 'pricingExternalAcademic') : null,
    externalMarket: op?.pricing?.externalMarket ?? op?.externalMarketPrice ?? external,
    externalNoSalary: op ? tierPrice(op, 'pricingExternalNoSalary') : null,
    legacy: op ? tierPrice(op, 'pricingLegacy') : null
  };
}

const NULLABLE_TEXT: OperationColumn[] = ['serviceCategoryNumber', 'serviceCategoryName', 'unit'];

/** Fields for ticked, present columns. Parse errors were already turned into skipped rows. */
function applyFields(row: ParsedOperationRow, selected: ReadonlySet<OperationColumn>, sets: ReadonlyArray<SetRef>, existing: OperationLike | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const has = (c: OperationColumn): boolean => selected.has(c) && row.values[c] !== undefined;
  const v = row.values;

  if (has('description')) out.description = v.description ?? '';
  for (const c of NULLABLE_TEXT) if (has(c)) out[c] = v[c] === '' ? null : v[c];
  if (has('pricingMode')) out.pricingMode = parsePricingMode(v.pricingMode!);
  if (has('hiddenFromClients')) out.hiddenFromClients = parseYesNo(v.hiddenFromClients!) === true;
  if (has('parameterSets')) out.parameterSetIds = resolveSetNames(v.parameterSets!, sets).ids;

  const tiers = PRICING_COLUMNS.filter(has);
  if (tiers.length > 0) {
    const pricing: Record<string, number | null> = existingPricing(existing);
    for (const c of tiers) {
      const value = parseMoney(v[c]!) as number | null;
      pricing[TIER_KEYS[c].nested] = value;
      out[TIER_KEYS[c].flat] = value;
      if (c === 'pricingExternalMarket') {
        pricing.external = value;
        out.externalPrice = value;
      }
    }
    out.pricing = pricing;
  }
  return out;
}

/** A new operation. Never carries `id` — CreateService has none (F2). */
export function buildOperationCreateInput(row: ParsedOperationRow, selected: ReadonlySet<OperationColumn>, sets: ReadonlyArray<SetRef>): Record<string, unknown> {
  return {
    name: row.values.name,
    icon: '',
    description: '',
    allowedConnections: [],
    parameters: [],
    paramGroups: [],
    deliverables: [],
    // Required by CreateService (`[String!]!`, no default) — the old CSV create omitted it (F2).
    protocolIds: [],
    pricingMode: 'SERVICE',
    ...applyFields(row, selected, sets, undefined)
  };
}

export function buildOperationUpdateChanges(row: ParsedOperationRow, selected: ReadonlySet<OperationColumn>, existing: OperationLike, sets: ReadonlyArray<SetRef>): Record<string, unknown> {
  const out = applyFields(row, selected, sets, existing);
  const name = row.values.name;
  if (name !== undefined && name !== '' && name !== existing.name) out.name = name;
  return out;
}

/** Upload-log "before": the existing value of every field the change sets. */
export function beforeSnapshot(existing: OperationLike, changes: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(changes)) {
    out[key] = key === 'pricing' ? existingPricing(existing) : ((existing as any)[key] ?? null);
  }
  return out;
}
