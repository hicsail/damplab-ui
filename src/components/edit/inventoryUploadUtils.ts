import { processExcelFile } from '../data-translation/utils';

/** A single parsed row from the uploaded spreadsheet. */
export interface ParsedInventoryRow {
  name: string;
  type: string;
  tag: string;
  stationName: string;
  quantity: number;
  uniqueId: string;
  modelNumber: string;
  serialNumber: string;
  hasServiceContract: boolean;
  serviceContractExpiration: string;
  /** Resolved station ObjectId (filled during station resolution). */
  resolvedStationId?: string;
  /** Whether this row matches an existing item (by uniqueId). */
  existingItemId?: string;
  /** Warnings to show in the preview (e.g. unknown type, station to be created). */
  warnings: string[];
}

export interface UploadSummary {
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

const VALID_TYPES = new Set(['EQUIPMENT', 'HOOD', 'STORAGE', 'CONSUMABLE']);

/** Normalize a header string for flexible matching. */
const norm = (s: unknown): string => String(s ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

/** Map of normalized header → field key. */
const HEADER_MAP: Record<string, keyof ParsedInventoryRow> = {
  name: 'name',
  type: 'type',
  tag: 'tag',
  tags: 'tag',
  station: 'stationName',
  stationname: 'stationName',
  quantity: 'quantity',
  qty: 'quantity',
  uniqueid: 'uniqueId',
  id: 'uniqueId',
  modelnumber: 'modelNumber',
  model: 'modelNumber',
  serialnumber: 'serialNumber',
  serial: 'serialNumber',
  servicecontractyn: 'hasServiceContract',
  servicecontract: 'hasServiceContract',
  hasservicecontract: 'hasServiceContract',
  servicecontractexpiration: 'serviceContractExpiration',
  contractexpiration: 'serviceContractExpiration'
};

function resolveHeaderIndices(headerRow: unknown[]): Record<string, number> {
  const indices: Record<string, number> = {};
  for (let i = 0; i < headerRow.length; i++) {
    const key = norm(headerRow[i]);
    if (key && HEADER_MAP[key]) {
      indices[HEADER_MAP[key] as string] = i;
    }
  }
  return indices;
}

function cellStr(row: unknown[], idx: number | undefined): string {
  if (idx === undefined) return '';
  const v = row[idx];
  return v !== undefined && v !== null ? String(v).trim() : '';
}

function parseType(raw: string): { type: string; warning?: string } {
  const upper = raw.toUpperCase().trim();
  if (VALID_TYPES.has(upper)) return { type: upper };
  if (!raw) return { type: 'EQUIPMENT' };
  return { type: 'EQUIPMENT', warning: `Unknown type "${raw}", defaulting to EQUIPMENT` };
}

function parseBool(raw: string): boolean {
  const v = raw.toLowerCase().trim();
  return v === 'y' || v === 'yes' || v === 'true' || v === '1';
}

function parseQuantity(raw: string): number {
  const n = Math.floor(Number(raw));
  return Number.isFinite(n) && n > 0 ? n : 1;
}

/** Parse an xlsx file into structured rows. */
export async function parseInventoryFile(file: File): Promise<{
  rows: ParsedInventoryRow[];
  headerWarnings: string[];
}> {
  const data = await processExcelFile(file);
  if (!data || data.length < 2) {
    throw new Error('Spreadsheet appears to be empty or missing data rows.');
  }

  const [headerRow, ...dataRows] = data;
  const indices = resolveHeaderIndices(headerRow);
  const headerWarnings: string[] = [];

  if (indices.name === undefined) {
    headerWarnings.push('No "Name" column found — rows without a uniqueId will be skipped.');
  }

  const rows: ParsedInventoryRow[] = [];

  for (const raw of dataRows) {
    const name = cellStr(raw, indices.name);
    const uniqueId = cellStr(raw, indices.uniqueId);
    // Skip rows that have neither name nor uniqueId (truly blank)
    if (!name && !uniqueId) continue;

    const rawType = cellStr(raw, indices.type);
    const { type, warning: typeWarning } = parseType(rawType);

    const warnings: string[] = [];
    if (!name) warnings.push('Name is blank — will be skipped if this is a new item.');

    const row: ParsedInventoryRow = {
      name,
      type,
      tag: cellStr(raw, indices.tag),
      stationName: cellStr(raw, indices.stationName),
      quantity: parseQuantity(cellStr(raw, indices.quantity)),
      uniqueId,
      modelNumber: cellStr(raw, indices.modelNumber),
      serialNumber: cellStr(raw, indices.serialNumber),
      hasServiceContract: parseBool(cellStr(raw, indices.hasServiceContract)),
      serviceContractExpiration: cellStr(raw, indices.serviceContractExpiration),
      warnings
    };

    if (typeWarning) row.warnings.push(typeWarning);

    rows.push(row);
  }

  return { rows, headerWarnings };
}

/**
 * Resolve station names to ObjectIds.
 * - Matches existing stations by name (case-insensitive).
 * - Auto-creates missing stations via the provided callback.
 * - Mutates rows in-place (sets resolvedStationId).
 */
export async function resolveStations(
  rows: ParsedInventoryRow[],
  existingStations: Array<{ id: string; name: string }>,
  createStation: (name: string) => Promise<string>
): Promise<{ createdStations: string[] }> {
  const lookup = new Map<string, string>();
  for (const s of existingStations) {
    lookup.set(s.name.trim().toLowerCase(), s.id);
  }

  const createdStations: string[] = [];

  for (const row of rows) {
    if (!row.stationName) continue;
    const key = row.stationName.trim().toLowerCase();

    let stationId = lookup.get(key);
    if (!stationId) {
      // Auto-create station
      try {
        stationId = await createStation(row.stationName.trim());
        lookup.set(key, stationId);
        createdStations.push(row.stationName.trim());
      } catch (e) {
        row.warnings.push(`Failed to create station "${row.stationName}": ${e instanceof Error ? e.message : String(e)}`);
        continue;
      }
    }
    row.resolvedStationId = stationId;
  }

  return { createdStations };
}

/**
 * Match parsed rows against existing inventory items by uniqueId.
 * Mutates rows in-place (sets existingItemId).
 */
export function matchExistingItems(
  rows: ParsedInventoryRow[],
  existingItems: Array<{ id: string; uniqueId?: string }>
): void {
  const idMap = new Map<string, string>();
  for (const item of existingItems) {
    if (item.uniqueId) {
      idMap.set(item.uniqueId.trim().toLowerCase(), item.id);
    }
  }

  for (const row of rows) {
    if (!row.uniqueId) continue;
    const existing = idMap.get(row.uniqueId.trim().toLowerCase());
    if (existing) {
      row.existingItemId = existing;
    }
  }
}

/** Selectable columns for the upload preview. "name" is always included (not optional). */
export const UPLOAD_COLUMNS = [
  { key: 'type', label: 'Type' },
  { key: 'tag', label: 'Tag' },
  { key: 'station', label: 'Station & Quantity' },
  { key: 'modelNumber', label: 'Model #' },
  { key: 'serialNumber', label: 'Serial #' },
  { key: 'hasServiceContract', label: 'Service Contract' }
] as const;

export type UploadColumnKey = (typeof UPLOAD_COLUMNS)[number]['key'];

/** Build the GraphQL input for creating a new inventory item. Returns null if name is blank (cannot create). */
export function buildCreateInput(row: ParsedInventoryRow, selectedColumns?: Set<UploadColumnKey>): Record<string, unknown> | null {
  if (!row.name) return null; // Name required for new items

  const include = (col: UploadColumnKey): boolean => !selectedColumns || selectedColumns.has(col);

  const input: Record<string, unknown> = {
    name: row.name,
    type: include('type') ? row.type : 'EQUIPMENT',
    tags: include('tag') ? (row.tag ? [row.tag] : []) : []
  };

  if (include('station') && row.resolvedStationId) {
    input.placements = [{ stationId: row.resolvedStationId, quantity: row.quantity }];
  }
  if (include('modelNumber')) input.modelNumber = row.modelNumber || undefined;
  if (include('serialNumber')) input.serialNumber = row.serialNumber || undefined;
  if (include('hasServiceContract')) {
    input.hasServiceContract = row.hasServiceContract;
    input.serviceContractExpiration = row.serviceContractExpiration || undefined;
  }

  return input;
}

/** Build the GraphQL changes for updating an existing inventory item. */
export function buildUpdateChanges(row: ParsedInventoryRow, selectedColumns?: Set<UploadColumnKey>): Record<string, unknown> {
  const include = (col: UploadColumnKey): boolean => !selectedColumns || selectedColumns.has(col);

  const changes: Record<string, unknown> = {};
  if (row.name) changes.name = row.name;

  if (include('type')) changes.type = row.type;
  if (include('tag')) changes.tags = row.tag ? [row.tag] : [];
  if (include('station') && row.resolvedStationId) {
    changes.placements = [{ stationId: row.resolvedStationId, quantity: row.quantity }];
  }
  if (include('modelNumber')) changes.modelNumber = row.modelNumber || null;
  if (include('serialNumber')) changes.serialNumber = row.serialNumber || null;
  if (include('hasServiceContract')) {
    changes.hasServiceContract = row.hasServiceContract;
    changes.serviceContractExpiration = row.serviceContractExpiration || null;
  }

  return changes;
}
