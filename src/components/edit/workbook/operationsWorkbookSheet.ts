import { OperationLike, PRICING_COLUMNS, PricingColumn, tierPrice } from '../operationsSheet';
import { nearKey, normalizeEol, parseMoney, parseYesNo, sameList, yesNo } from './cells';
import { matchRows, rowList } from './matching';
import { CatalogCategory, CatalogOperation, CatalogSnapshot, Need, PlanRow, RawSheet, RowAction, rowKey, SHEET_COLUMNS, SheetPlan } from './types';

/**
 * The `Operations` sheet: one row per operation. Its category is the canvas
 * category it sits in (`serviceCategory`), and its parameter sets are one cell
 * each (`parameterSet1…N`). Operation-level pricing columns behave as the old
 * operations upload's did, and stay behind internal-fields:read.
 */
export const MIN_SET_COLUMNS = 5;
const SET_COLUMN = /^parameterSet(\d+)$/;
const isPricing = (column: string): column is PricingColumn => (PRICING_COLUMNS as readonly string[]).includes(column);

/** Rule 13: most sets on any operation, plus two spare, never fewer than five. */
export function setColumnCount(catalog: CatalogSnapshot): number {
  return Math.max(MIN_SET_COLUMNS, Math.max(0, ...catalog.operations.map((operation) => operation.parameterSetIds.length)) + 2);
}

/** The label of the first canvas category holding the operation; '' when none does. */
export function categoryLabelOf(operationId: string, categories: ReadonlyArray<CatalogCategory>): string {
  return categories.find((category) => category.serviceIds.includes(operationId))?.label.trim() ?? '';
}

function setNamesOf(operation: CatalogOperation, catalog: CatalogSnapshot): string[] {
  const nameById = new Map(catalog.sets.map((set) => [set.id, set.name.trim()] as const));
  return operation.parameterSetIds.map((id) => nameById.get(id)).filter((name): name is string => name !== undefined);
}

/** What the download writes for an operation — and what an uploaded row is compared against. */
function operationCells(operation: CatalogOperation, catalog: CatalogSnapshot): Record<string, string | number> {
  const cells: Record<string, string | number> = {
    id: operation.id,
    serviceCategory: categoryLabelOf(operation.id, catalog.categories),
    name: normalizeEol(operation.name).trim(),
    description: normalizeEol(operation.description).trim(),
    unit: normalizeEol(operation.unit).trim(),
    hiddenFromClients: yesNo(operation.hiddenFromClients),
    pricingMode: operation.pricingMode === 'PARAMETER' ? 'PARAMETER' : 'SERVICE'
  };
  for (const column of PRICING_COLUMNS) {
    const price = tierPrice(operation, column);
    cells[column] = price === null ? '' : price;
  }
  setNamesOf(operation, catalog).forEach((name, index) => {
    cells[`parameterSet${index + 1}`] = name;
  });
  return cells;
}

export function operationsExportRows(catalog: CatalogSnapshot, includePricing: boolean): Array<Array<string | number>> {
  const columns = [
    ...SHEET_COLUMNS.operations.filter((column) => includePricing || !isPricing(column)),
    ...Array.from({ length: setColumnCount(catalog) }, (_, index) => `parameterSet${index + 1}`)
  ];
  return [
    columns,
    ...catalog.operations.map((operation) => {
      const cells = operationCells(operation, catalog);
      return columns.map((column) => cells[column] ?? '');
    })
  ];
}

function parsePricingMode(raw: string): 'SERVICE' | 'PARAMETER' | 'invalid' {
  const v = raw.trim().toUpperCase();
  if (v === '' || v === 'SERVICE') return 'SERVICE';
  if (v === 'PARAMETER') return 'PARAMETER';
  return 'invalid';
}

function sameCell(column: string, cell: string, current: string | number): boolean {
  if (column === 'hiddenFromClients') {
    const a = parseYesNo(cell);
    return a !== 'invalid' && a === parseYesNo(String(current));
  }
  if (column === 'pricingMode') return parsePricingMode(cell) === current;
  if (column === 'serviceCategory') return nearKey(cell) === nearKey(String(current));
  if (isPricing(column)) {
    const a = parseMoney(cell);
    return a !== 'invalid' && a === (current === '' ? null : Number(current));
  }
  return cell === String(current);
}

const TIER_KEYS: Record<PricingColumn, { nested: string; flat: string }> = {
  pricingInternal: { nested: 'internal', flat: 'internalPrice' },
  pricingExternalAcademic: { nested: 'externalAcademic', flat: 'externalAcademicPrice' },
  pricingExternalMarket: { nested: 'externalMarket', flat: 'externalMarketPrice' },
  pricingExternalNoSalary: { nested: 'externalNoSalary', flat: 'externalNoSalaryPrice' },
  pricingLegacy: { nested: 'legacy', flat: 'price' }
};

/** The operation's current tiers as a clean input object — explicit keys only, so no `__typename`. */
function existingPricing(operation: OperationLike | undefined): Record<string, number | null> {
  return {
    internal: operation ? tierPrice(operation, 'pricingInternal') : null,
    external: operation?.pricing?.external ?? operation?.externalPrice ?? null,
    externalAcademic: operation ? tierPrice(operation, 'pricingExternalAcademic') : null,
    externalMarket: operation ? tierPrice(operation, 'pricingExternalMarket') : null,
    externalNoSalary: operation ? tierPrice(operation, 'pricingExternalNoSalary') : null,
    legacy: operation ? tierPrice(operation, 'pricingLegacy') : null
  };
}

/** A new operation before its cells are applied. Never carries `id`; `protocolIds` is required by CreateService. */
const newOperation = (name: string): Record<string, unknown> => ({
  name,
  icon: '',
  description: '',
  allowedConnections: [],
  parameters: [],
  paramGroups: [],
  deliverables: [],
  protocolIds: [],
  pricingMode: 'SERVICE'
});

export interface OperationRowWork {
  existingId?: string;
  name: string;
  /** createService input, or updateService changes — without parameterSetIds (see setNames). */
  fields: Record<string, unknown>;
  /** The stored value of every field an update changes, for the upload log. */
  before: Record<string, unknown>;
  /** Present when the row sets the operation's parameter sets: their names, in order. */
  setNames?: string[];
  /** Present when the row changes the category: the label to move to, or '' for none. */
  category?: string;
}

export interface OperationsWork {
  rows: Record<string, OperationRowWork>;
  hides: Record<string, { id: string; name: string }>;
}

/** An Operations row as another sheet's reference sees it: where it is, and what its id cell says. */
export interface OperationRowRef {
  rowKey: string;
  rowNumber: number;
  /** '' for a row that creates its operation. */
  id: string;
}

/** Every Operations row under its name cell as uploaded — with an id or without, an error or not. */
export function operationRowsByName(sheet: RawSheet | undefined): Map<string, OperationRowRef[]> {
  const out = new Map<string, OperationRowRef[]>();
  for (const row of sheet?.rows ?? []) {
    const name = row.cells.name ?? '';
    if (name === '') continue;
    out.set(name, [...(out.get(name) ?? []), { rowKey: rowKey('operations', row.rowNumber), rowNumber: row.rowNumber, id: row.cells.id ?? '' }]);
  }
  return out;
}

/** Said on a row that names an operation by a name a different stored operation holds; `untick` when nothing else holds the row back. */
export interface ReferenceWarning {
  text: string;
  untick: boolean;
}

export type OperationReference =
  /** An operation that exists. */
  | { kind: 'existing'; operation: CatalogOperation; warning?: ReferenceWarning }
  /** The operation this Operations row creates. */
  | { kind: 'row'; rowKey: string; rowNumber: number; warning?: ReferenceWarning }
  /** The rows of this upload cannot say which operation is meant. */
  | { kind: 'error'; message: string }
  /** No row carries the name, and this many (none, or two or more) stored operations do. */
  | { kind: 'catalog'; count: number };

/**
 * Which operation a name on another sheet means. The rows of this upload come
 * first: exactly one Operations row with that name is that row's operation —
 * the stored one when the row has an id (so a renamed operation is found by its
 * new name), the one the row creates when it has none; two or more cannot say
 * which. Only a name no row carries is looked up among the stored operations.
 *
 * When a row settles the name while a *different* stored operation is the one
 * currently called that, the reference comes with a warning for the rows that
 * use it: they would write to another operation than the name means today.
 * They are unticked by default too, unless the row creates its operation and
 * the stored namesake has no row here — then they already wait for that
 * create, which is itself unticked.
 */
export function resolveOperationName(name: string, operationRows: ReadonlyMap<string, ReadonlyArray<OperationRowRef>>, catalog: CatalogSnapshot): OperationReference {
  const rows = operationRows.get(name) ?? [];
  if (rows.length > 1) return { kind: 'error', message: `Rows ${rowList(rows.map((row) => row.rowNumber))} are both named “${name}” — rename one so this row can say which.` };
  if (rows.length === 1) {
    const [row] = rows;
    const namesakes = catalog.operations.filter((candidate) => candidate.name.trim() === name && candidate.id !== row.id);
    const renamedAway = namesakes.some((namesake) => [...operationRows].some(([other, others]) => other !== name && others.some((candidate) => candidate.id === namesake.id)));
    const warning: ReferenceWarning | undefined =
      namesakes.length === 0
        ? undefined
        : row.id === '' && !renamedAway
          ? { text: `“${name}” means the new operation in row ${row.rowNumber}, not the existing operation named “${name}”.`, untick: false }
          : { text: `“${name}” now means the operation in row ${row.rowNumber}, not the operation currently named “${name}”.`, untick: true };
    if (row.id === '') return { kind: 'row', rowKey: row.rowKey, rowNumber: row.rowNumber, warning };
    const operation = catalog.operations.find((candidate) => candidate.id === row.id);
    return operation ? { kind: 'existing', operation, warning } : { kind: 'error', message: `Row ${row.rowNumber} is named “${name}”, but no operation has its id.` };
  }
  const stored = catalog.operations.filter((operation) => operation.name.trim() === name);
  return stored.length === 1 ? { kind: 'existing', operation: stored[0] } : { kind: 'catalog', count: stored.length };
}

export function planOperations(
  sheet: RawSheet,
  catalog: CatalogSnapshot,
  ctx: { newSetRows: ReadonlyMap<string, string[]>; allowPricing: boolean; hideMissing: boolean }
): SheetPlan<OperationsWork> {
  const setColumns = sheet.columns.filter((column) => SET_COLUMN.test(column)).sort((a, b) => Number(SET_COLUMN.exec(a)![1]) - Number(SET_COLUMN.exec(b)![1]));
  const blockedPricing: string[] = ctx.allowPricing ? [] : sheet.columns.filter(isPricing);
  const fieldColumns = sheet.columns.filter((column) => column !== 'id' && column !== 'serviceCategory' && !SET_COLUMN.test(column) && !blockedPricing.includes(column));
  const hasCategoryColumn = sheet.columns.includes('serviceCategory');
  const existingSetNames = new Set(catalog.sets.map((set) => set.name.trim()));

  const matches = matchRows(
    sheet.rows.map((raw) => ({ rowNumber: raw.rowNumber, id: raw.cells.id ?? '', name: raw.cells.name ?? '' })),
    catalog.operations.map((operation) => ({ id: operation.id, name: operation.name })),
    'operation'
  );

  const rows: PlanRow[] = [];
  const work: OperationsWork = { rows: {}, hides: {} };

  sheet.rows.forEach((raw, index) => {
    const match = matches[index];
    const key = rowKey('operations', raw.rowNumber);
    const errors = [...match.errors];
    const warnings = [...match.warnings];
    const needs: Need[] = [];
    const cell = (column: string): string => raw.cells[column] ?? '';
    const existing = match.existingId !== undefined ? catalog.operations.find((operation) => operation.id === match.existingId) : undefined;
    let action: RowAction = match.action;
    let changed: string[] = [];

    if (errors.length === 0) {
      const current = existing ? operationCells(existing, catalog) : undefined;
      changed = current ? fieldColumns.filter((column) => !sameCell(column, cell(column), current[column] ?? '')) : fieldColumns.filter((column) => cell(column) !== '');
      const fields: Record<string, unknown> = existing ? {} : newOperation(cell('name'));
      const before: Record<string, unknown> = {};

      const tiers: PricingColumn[] = [];
      for (const column of changed) {
        if (column === 'name') {
          if (cell('name') === '') errors.push('Name cannot be blank.');
          else fields.name = cell('name');
        } else if (column === 'description') {
          fields.description = cell('description');
        } else if (column === 'unit') {
          fields.unit = cell('unit') === '' ? null : cell('unit');
        } else if (column === 'hiddenFromClients') {
          const value = parseYesNo(cell(column));
          if (value === 'invalid') errors.push(`hiddenFromClients: “${cell(column)}” must be Y or N.`);
          else fields.hiddenFromClients = value;
        } else if (column === 'pricingMode') {
          const value = parsePricingMode(cell(column));
          if (value === 'invalid') errors.push(`pricingMode: “${cell(column)}” must be SERVICE or PARAMETER.`);
          else fields.pricingMode = value;
        } else if (isPricing(column)) {
          tiers.push(column);
        }
        if (existing && !isPricing(column)) before[column] = (existing as unknown as Record<string, unknown>)[column] ?? null;
      }
      if (tiers.length > 0) {
        const pricing = existingPricing(existing);
        if (existing) before.pricing = existingPricing(existing);
        for (const column of tiers) {
          const value = parseMoney(cell(column));
          if (value === 'invalid') {
            errors.push(`${column}: “${cell(column)}” is not a valid price.`);
            continue;
          }
          pricing[TIER_KEYS[column].nested] = value;
          fields[TIER_KEYS[column].flat] = value;
          // The generic external tier follows market, as the editor writes it.
          if (column === 'pricingExternalMarket') {
            pricing.external = value;
            fields.externalPrice = value;
          }
        }
        fields.pricing = pricing;
      }

      let category: string | undefined;
      if (hasCategoryColumn) {
        const label = cell('serviceCategory');
        const moved = !current || !sameCell('serviceCategory', label, current.serviceCategory);
        // Only a row that writes a blank category warns: an untouched download of an uncategorised operation is quiet.
        if (label === '' && moved) warnings.push('will not appear in any canvas dropdown');
        if (moved) {
          if (existing) {
            changed.push('serviceCategory');
            before.serviceCategory = current!.serviceCategory;
          }
          // An existing category keeps its own spelling; a new label is used as typed.
          category = label === '' ? '' : (catalog.categories.find((c) => nearKey(c.label) === nearKey(label))?.label.trim() ?? label);
          fields.serviceCategoryName = category === '' ? null : category;
        }
      }

      let setNames: string[] | undefined;
      if (setColumns.length > 0) {
        const names = setColumns.map(cell).filter((name) => name !== '');
        const currentNames = existing ? setNamesOf(existing, catalog) : [];
        if (!existing || !sameList(names, currentNames)) {
          if (existing) {
            changed.push('parameterSets');
            before.parameterSets = currentNames;
          }
          const seen = new Set<string>();
          for (const name of names) {
            if (seen.has(name)) errors.push(`Parameter set “${name}” is listed twice.`);
            seen.add(name);
            if (existingSetNames.has(name)) continue;
            const providers = ctx.newSetRows.get(name);
            if (providers) needs.push({ what: `parameter set “${name}”`, anyOf: providers });
            else errors.push(`Unknown parameter set “${name}”.`);
          }
          setNames = names;
        }
      }

      if (existing && changed.length === 0) action = 'unchanged';
      else if (errors.length === 0) work.rows[key] = { existingId: existing?.id, name: existing ? existing.name.trim() : cell('name'), fields, before, setNames, category };
    }

    if (errors.length > 0) action = 'skip';
    const writes = action === 'create' || action === 'update';
    rows.push({
      key, sheet: 'operations', rowNumber: raw.rowNumber, label: cell('name') || existing?.name.trim() || cell('id'), action,
      changed: writes ? changed : [], errors, warnings,
      selectedByDefault: writes && match.selectedByDefault, needs: writes ? needs : []
    });
  });

  if (ctx.hideMissing) {
    // "No sheet row matched" — a matched row with an error still mentions its operation.
    // A row without an id creates an operation of its own, but its name still mentions every stored operation
    // of that name: a hand-authored sheet (no ids) must never offer to hide the operations it lists.
    const mentioned = new Set(matches.map((match) => match.existingId).filter((id): id is string => id !== undefined));
    sheet.rows.forEach((raw) => {
      if ((raw.cells.id ?? '') !== '' || (raw.cells.name ?? '') === '') return;
      for (const operation of catalog.operations) if (operation.name.trim() === raw.cells.name) mentioned.add(operation.id);
    });
    for (const operation of catalog.operations) {
      if (mentioned.has(operation.id) || operation.hiddenFromClients === true) continue;
      const key = `hide:${operation.id}`;
      work.hides[key] = { id: operation.id, name: operation.name.trim() };
      rows.push({ key, sheet: 'operations', rowNumber: null, label: operation.name.trim(), action: 'hide', changed: ['hiddenFromClients'], errors: [], warnings: [], selectedByDefault: true, needs: [] });
    }
  }

  return {
    sheet: 'operations',
    rowCount: sheet.rows.length,
    rows,
    ignoredColumns: [...sheet.ignoredColumns, ...blockedPricing.map((column) => `${column} (needs internal-fields:read)`)],
    work
  };
}

export interface CategoryWrites {
  creates: Array<{ label: string; services: string[] }>;
  updates: Array<{ id: string; label: string; services: string[] }>;
}

/**
 * Rule 12 as writes: each move takes the operation out of every category and
 * puts it in the one with that label (matched ignoring case and spacing),
 * creating the category when none has it. A move to '' only removes.
 * One update per category whose list changed; one create per new label.
 */
export function categoryWrites(categories: ReadonlyArray<CatalogCategory>, moves: ReadonlyArray<{ operationId: string; label: string }>): CategoryWrites {
  const lists = new Map<string, string[]>(categories.map((category) => [category.id, [...category.serviceIds]]));
  const created = new Map<string, { label: string; services: string[] }>();
  for (const move of moves) {
    for (const [id, list] of lists) lists.set(id, list.filter((serviceId) => serviceId !== move.operationId));
    for (const entry of created.values()) entry.services = entry.services.filter((serviceId) => serviceId !== move.operationId);
    if (move.label === '') continue;
    const target = categories.find((category) => nearKey(category.label) === nearKey(move.label));
    if (target) {
      lists.get(target.id)!.push(move.operationId);
      continue;
    }
    const key = nearKey(move.label);
    if (!created.has(key)) created.set(key, { label: move.label, services: [] });
    created.get(key)!.services.push(move.operationId);
  }
  return {
    creates: [...created.values()],
    updates: categories
      .filter((category) => !sameList(category.serviceIds, lists.get(category.id)!))
      .map((category) => ({ id: category.id, label: category.label, services: lists.get(category.id)! }))
  };
}
