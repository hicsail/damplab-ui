import { makeUniqueIds } from '../../../utils/idFromName';
import { effectiveValidation, parseValidation } from '../../../utils/parameterValidation';
import { nearKey, normalizeEol, parseYesNo, sameList, splitList, yesNo } from './cells';
import { matchRows } from './matching';
import { CatalogSnapshot, Need, PlanRow, RawRow, RawSheet, RowAction, rowKey, SHEET_COLUMNS, SheetPlan } from './types';

/**
 * The `Parameter List` sheet: one row per parameter, owned by a parameter set
 * (`parameterSet`) or by an operation itself (`operation`).
 *
 * What makes importing parameters safe: an upload never changes a parameter's
 * id, never removes a parameter, and leaves every stored field the sheet has no
 * column for — every price field included — exactly as it is.
 */
const TYPE_LABEL: Record<string, string> = {
  string: 'Text',
  number: 'Number',
  dropdown: 'Dropdown',
  boolean: 'True/False',
  table: 'Table',
  file: 'File Upload',
  sampleSheet: 'Sample Upload'
};
/** Types whose template (table layout, blank file, blank samples sheet) is set in the editor. */
const TEMPLATE_TYPES = new Set(['table', 'file', 'sampleSheet']);
/** The download's in-cell dropdown for the `type` column. */
export const TYPE_CHOICES: readonly string[] = ['Text', 'Number', 'Dropdown', 'Checkboxes', 'True/False', 'Table', 'File Upload', 'Sample Upload'];

const OWNER_COLUMNS = new Set(['parameterId', 'parameterSet', 'operation']);

export function typeLabelOf(parameter: any): string {
  if (parameter?.type === 'dropdown' && parameter?.display === 'checkboxes') return 'Checkboxes';
  const stored = String(parameter?.type ?? '');
  return TYPE_LABEL[stored] ?? stored;
}

/** A `type` cell as the stored type; accepts the friendly label and the stored name, any case. */
export function parseTypeCell(raw: string): { type: string; checkboxes: boolean } | null {
  const key = raw.trim().toLowerCase();
  if (key === 'checkboxes') return { type: 'dropdown', checkboxes: true };
  for (const [stored, label] of Object.entries(TYPE_LABEL)) {
    if (key === label.toLowerCase() || key === stored.toLowerCase()) return { type: stored, checkboxes: false };
  }
  return null;
}

const optionsOf = (parameter: any): any[] => (Array.isArray(parameter?.options) ? parameter.options : []);
const optionName = (option: any): string => normalizeEol(option?.name).trim();

/** What the download writes for a parameter — and what an uploaded row is compared against. */
export function parameterCells(parameter: any, owner: { set?: string; operation?: string }): Record<string, string> {
  const defaultValue = parameter?.defaultValue;
  return {
    parameterId: String(parameter?.id ?? ''),
    parameterSet: owner.set ?? '',
    operation: owner.operation ?? '',
    parameter: normalizeEol(parameter?.name).trim(),
    description: normalizeEol(parameter?.description).trim(),
    required: yesNo(parameter?.required),
    type: typeLabelOf(parameter),
    options: optionsOf(parameter).map(optionName).join('; '),
    validation: parameter?.type === 'number' ? effectiveValidation(parameter) : '',
    allowMultiple: yesNo(parameter?.allowMultipleValues),
    defaultValue: normalizeEol(defaultValue)
  };
}

/** Header, then every set parameter once under its set, then every operation's own parameters. Never the effective list. */
export function parameterListExportRows(catalog: CatalogSnapshot): string[][] {
  const columns = [...SHEET_COLUMNS.parameterList];
  const rows: string[][] = [columns];
  const push = (parameter: any, owner: { set?: string; operation?: string }): void => {
    const cells = parameterCells(parameter, owner);
    rows.push(columns.map((column) => cells[column]));
  };
  for (const set of catalog.sets) for (const parameter of set.parameters) push(parameter, { set: set.name.trim() });
  for (const operation of catalog.operations) for (const parameter of operation.ownParameters) push(parameter, { operation: operation.name.trim() });
  return rows;
}

const compact = (s: string): string => s.replace(/\s+/g, '').toLowerCase();

/** Whether an uploaded cell says the same thing as the download would for the stored parameter. */
function sameCell(column: string, cell: string, current: string): boolean {
  switch (column) {
    case 'required':
    case 'allowMultiple': {
      const a = parseYesNo(cell);
      return a !== 'invalid' && a === parseYesNo(current);
    }
    case 'type': {
      const a = parseTypeCell(cell);
      const b = parseTypeCell(current);
      return a && b ? a.type === b.type && a.checkboxes === b.checkboxes : cell === current;
    }
    case 'validation':
      return compact(cell) === compact(current);
    case 'options':
      return sameList(splitList(cell), splitList(current));
    default:
      return cell === current;
  }
}

/** Rule 19: a name equal (trimmed, case-insensitive) to a stored option keeps its id and fields; a new name gets a minted id. */
function resolveOptions(cell: string, stored: any[]): { options: any[]; errors: string[]; warnings: string[] } {
  const names = splitList(cell);
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const name of names) {
    if (seen.has(name.toLowerCase())) errors.push(`Option “${name}” is listed twice.`);
    seen.add(name.toLowerCase());
  }
  const keptIds: string[] = [];
  const resolved = names.map((name) => {
    const old = stored.find((option) => optionName(option).toLowerCase() === name.toLowerCase());
    if (!old) return { id: '', name };
    keptIds.push(String(old.id));
    return { ...old, name };
  });
  const minted = makeUniqueIds(resolved.filter((option) => option.id === ''), keptIds);
  let next = 0;
  const options = resolved.map((option) => (option.id === '' ? minted[next++] : option));
  const warnings = stored.filter((option) => !seen.has(optionName(option).toLowerCase())).map((option) => `Option “${optionName(option)}” will be removed`);
  return { options, errors, warnings };
}

/** The parameter after the given columns are applied to `base`. Columns not named are left exactly as stored. */
function applyCells(base: Record<string, any>, cells: Record<string, string>, columns: ReadonlySet<string>, isNew: boolean): { next: Record<string, any>; errors: string[]; warnings: string[] } {
  const next: Record<string, any> = { ...base };
  const errors: string[] = [];
  const warnings: string[] = [];
  const has = (column: string): boolean => columns.has(column);
  const cell = (column: string): string => cells[column] ?? '';

  if (has('parameter')) {
    if (cell('parameter') === '') errors.push('Parameter name cannot be blank.');
    else next.name = cell('parameter');
  }
  if (has('description')) next.description = cell('description');
  if (has('required')) {
    const value = parseYesNo(cell('required'));
    if (value === 'invalid') errors.push(`required: “${cell('required')}” must be Y or N.`);
    else next.required = value;
  }
  if (has('type')) {
    const parsed = parseTypeCell(cell('type'));
    if (!parsed) errors.push(cell('type') === '' ? 'type cannot be blank.' : `Unknown type “${cell('type')}”.`);
    else {
      next.type = parsed.type;
      if (parsed.checkboxes) {
        next.display = 'checkboxes';
        next.allowMultipleValues = true;
      } else {
        delete next.display;
      }
      if (TEMPLATE_TYPES.has(parsed.type)) warnings.push(`Set the ${TYPE_LABEL[parsed.type]} template in the editor.`);
    }
  }
  const isCheckboxes = next.type === 'dropdown' && next.display === 'checkboxes';
  if (has('allowMultiple')) {
    const value = parseYesNo(cell('allowMultiple'));
    if (value === 'invalid') errors.push(`allowMultiple: “${cell('allowMultiple')}” must be Y or N.`);
    else if (!isCheckboxes) next.allowMultipleValues = value;
    else if (value === false && cell('allowMultiple') !== '') warnings.push('Checkboxes always allow multiple; allowMultiple is ignored.');
  }
  if (next.type !== 'dropdown') delete next.display;

  if (has('options')) {
    const stored = optionsOf(base);
    if (next.type !== 'dropdown') {
      if (cell('options') !== '') warnings.push(`options ignored: ${typeLabelOf(next)} parameters have none.`);
    } else if (stored.some((option) => optionName(option).includes(';'))) {
      warnings.push('An existing option name contains “;”, so its options can only be edited in the editor; the options cell is ignored.');
    } else {
      const resolved = resolveOptions(cell('options'), stored);
      next.options = resolved.options;
      errors.push(...resolved.errors);
      warnings.push(...resolved.warnings);
    }
  }
  // Only a create, or a row that touches type or options, is held to this: an unrelated edit to a stored zero-option dropdown goes through.
  if (next.type === 'dropdown' && optionsOf(next).length === 0 && (isNew || has('type') || has('options'))) errors.push('A Dropdown or Checkboxes parameter needs at least one option.');

  const validationCell = has('validation') ? cell('validation') : '';
  if (has('validation') && validationCell !== '') {
    if (next.type !== 'number') errors.push('Only Number parameters can have a validation.');
    else {
      const parsed = parseValidation(validationCell);
      if ('error' in parsed) errors.push(`validation: ${parsed.error}`);
      else {
        next.validation = validationCell;
        delete next.rangeValueMin;
        delete next.rangeValueMax;
      }
    }
  } else if (has('validation') || next.type !== 'number') {
    // A cleared cell, or a parameter that is no longer a Number: no rule survives.
    const had = next.validation !== undefined || next.rangeValueMin !== undefined || next.rangeValueMax !== undefined;
    delete next.validation;
    delete next.rangeValueMin;
    delete next.rangeValueMax;
    if (had && !has('validation')) warnings.push('Validation removed: the parameter is not a Number.');
  }

  if (has('defaultValue')) {
    const text = cell('defaultValue');
    if (text === '') delete next.defaultValue;
    else if (next.type === 'number') {
      const n = Number(text);
      if (Number.isFinite(n)) next.defaultValue = n;
      else errors.push(`defaultValue: “${text}” is not a number.`);
    } else next.defaultValue = text;
  }
  return { next, errors, warnings };
}

/** A new parameter before its cells are applied. Price 0; the id is minted when the owner's list is built. */
const newParameter = (): Record<string, any> => ({
  id: '',
  name: '',
  description: '',
  type: 'string',
  paramType: 'input',
  required: false,
  allowMultipleValues: false,
  isPriceMultiplier: false,
  price: 0
});

export interface ParameterEntry {
  rowKey: string;
  /** Present for an update. */
  existingParamId?: string;
  /** The whole parameter after this row is applied. A create's id is '' until minted. */
  next: Record<string, any>;
}

export interface OwnerWork {
  kind: 'set' | 'operation';
  name: string;
  /** Absent for a set this upload creates, and for an operation this upload creates. */
  existingId?: string;
  /** The Operations row that creates the owning operation, when it does not exist yet. */
  operationRowKey?: string;
  /** The owner's parameters as stored. */
  stored: any[];
  /** Ids a minted id must also avoid: for an operation, its parameter sets' parameter ids. */
  reservedIds: string[];
  entries: ParameterEntry[];
}

export interface ParameterListWork {
  owners: OwnerWork[];
}

/** Sets this sheet creates: a `parameterSet` name with no existing set, with the rows that carry it. */
export function newSetRowKeys(sheet: RawSheet | undefined, catalog: CatalogSnapshot): Map<string, string[]> {
  const out = new Map<string, string[]>();
  if (!sheet) return out;
  const existing = new Set(catalog.sets.map((set) => set.name.trim()));
  for (const row of sheet.rows) {
    const name = row.cells.parameterSet ?? '';
    if (name === '' || (row.cells.operation ?? '') !== '' || existing.has(name)) continue;
    out.set(name, [...(out.get(name) ?? []), rowKey('parameterList', row.rowNumber)]);
  }
  return out;
}

export function planParameterList(sheet: RawSheet, catalog: CatalogSnapshot, ctx: { newOperationRows: ReadonlyMap<string, string> }): SheetPlan<ParameterListWork> {
  const dataColumns = sheet.columns.filter((column) => !OWNER_COLUMNS.has(column));
  const planned = new Map<number, PlanRow>();
  const owners: OwnerWork[] = [];
  const labelOf = (owner: string, raw: RawRow): string => `${owner} › ${raw.cells.parameter || raw.cells.parameterId || ''}`;

  const groups = new Map<string, { kind: 'set' | 'operation'; name: string; rows: RawRow[] }>();
  for (const raw of sheet.rows) {
    const set = raw.cells.parameterSet ?? '';
    const operation = raw.cells.operation ?? '';
    if ((set === '') === (operation === '')) {
      planned.set(raw.rowNumber, {
        key: rowKey('parameterList', raw.rowNumber), sheet: 'parameterList', rowNumber: raw.rowNumber, label: labelOf(set || operation || '?', raw),
        action: 'skip', matchedByName: false, changed: [], errors: ['Fill exactly one of parameterSet / operation.'], warnings: [], selectedByDefault: false, needs: []
      });
      continue;
    }
    const kind = set !== '' ? 'set' : 'operation';
    const name = set || operation;
    const key = `${kind}:${name}`;
    if (!groups.has(key)) groups.set(key, { kind, name, rows: [] });
    groups.get(key)!.rows.push(raw);
  }

  for (const group of groups.values()) {
    const ownerErrors: string[] = [];
    const ownerWarnings: string[] = [];
    const needs: Need[] = [];
    const owner: OwnerWork = { kind: group.kind, name: group.name, stored: [], reservedIds: [], entries: [] };
    let tickedByDefault = true;

    if (group.kind === 'set') {
      const sameName = catalog.sets.filter((s) => s.name.trim() === group.name);
      const set = sameName[0];
      if (sameName.length > 1) {
        ownerErrors.push(`${sameName.length} parameter sets are named “${group.name}” — its parameters cannot say which.`);
      } else if (set) {
        owner.existingId = set.id;
        owner.stored = set.parameters;
      } else {
        if (group.name.includes(';')) ownerErrors.push('A parameter set name cannot contain “;”.');
        const near = catalog.sets.find((s) => nearKey(s.name) === nearKey(group.name));
        if (near) {
          ownerWarnings.push(`Looks like “${near.name.trim()}” — a near-duplicate`);
          tickedByDefault = false;
        }
      }
    } else {
      const matches = catalog.operations.filter((o) => o.name.trim() === group.name);
      if (matches.length === 1) {
        owner.existingId = matches[0].id;
        owner.stored = matches[0].ownParameters;
        const setIds = new Set(matches[0].parameterSetIds);
        owner.reservedIds = catalog.sets.filter((s) => setIds.has(s.id)).flatMap((s) => s.parameters.map((p) => String(p?.id ?? '')));
      } else if (matches.length > 1) {
        ownerErrors.push(`${matches.length} operations are named “${group.name}” — its parameters cannot say which.`);
      } else if (ctx.newOperationRows.has(group.name)) {
        owner.operationRowKey = ctx.newOperationRows.get(group.name);
        needs.push({ what: `operation “${group.name}”`, anyOf: [owner.operationRowKey!] });
      } else {
        ownerErrors.push(`No operation named “${group.name}”.`);
      }
    }

    const matches = matchRows(
      group.rows.map((raw) => ({ rowNumber: raw.rowNumber, id: raw.cells.parameterId ?? '', name: raw.cells.parameter ?? '' })),
      owner.stored.map((p) => ({ id: String(p?.id ?? ''), name: String(p?.name ?? '') })),
      'parameter'
    );

    group.rows.forEach((raw, index) => {
      const match = matches[index];
      const key = rowKey('parameterList', raw.rowNumber);
      const errors = [...ownerErrors, ...match.errors];
      const warnings = [...ownerWarnings, ...match.warnings];
      let action: RowAction = match.action;
      let changed: string[] = [];

      if (errors.length === 0) {
        const stored = match.existingId !== undefined ? owner.stored.find((p) => String(p?.id ?? '') === match.existingId) : undefined;
        if (stored) {
          const current = parameterCells(stored, {});
          changed = dataColumns.filter((column) => !sameCell(column, raw.cells[column] ?? '', current[column]));
        } else {
          changed = dataColumns.filter((column) => (raw.cells[column] ?? '') !== '');
        }
        if (stored && changed.length === 0) {
          action = 'unchanged';
        } else {
          const applied = applyCells(stored ?? newParameter(), raw.cells, new Set(changed), stored === undefined);
          errors.push(...applied.errors);
          warnings.push(...applied.warnings);
          if (applied.errors.length === 0) {
            // A cell can differ and still change nothing (an ignored options cell, allowMultiple on a checkbox list).
            if (stored && JSON.stringify(applied.next) === JSON.stringify(stored)) action = 'unchanged';
            else owner.entries.push({ rowKey: key, existingParamId: match.existingId, next: applied.next });
          }
        }
      }
      if (errors.length > 0) action = 'skip';
      const writes = action === 'create' || action === 'update';
      planned.set(raw.rowNumber, {
        key, sheet: 'parameterList', rowNumber: raw.rowNumber, label: labelOf(group.name, raw), action,
        matchedByName: match.matchedByName && action !== 'skip', changed: writes ? changed : [], errors, warnings,
        selectedByDefault: writes && match.selectedByDefault && tickedByDefault, needs: writes ? needs : []
      });
    });
    owners.push(owner);
  }

  const rows = [...planned.values()].sort((a, b) => (a.rowNumber ?? 0) - (b.rowNumber ?? 0));
  return { sheet: 'parameterList', rowCount: sheet.rows.length, rows, ignoredColumns: sheet.ignoredColumns, work: { owners } };
}

/**
 * The owner's whole parameter list for the rows being applied: stored
 * parameters in stored order, updates swapped in by id, then creates in sheet
 * order with ids minted by the editor's rule (idFromName + makeUniqueIds).
 * A stored parameter no row mentions — or whose row is not applied — is untouched.
 *
 * `reservedIds` are the ids a minted id must also avoid. They default to the
 * operation's stored sets' parameter ids; the apply step passes the ids of the
 * operation's *resulting* set list, which is what rule 17 means.
 */
export function buildOwnerParameters(owner: OwnerWork, liveRowKeys: ReadonlySet<string>, reservedIds: readonly string[] = owner.reservedIds): any[] {
  return planOwnerParameters(owner, liveRowKeys, reservedIds).parameters;
}

/** `buildOwnerParameters`, plus which row each created parameter came from and the id it was minted. */
export function planOwnerParameters(owner: OwnerWork, liveRowKeys: ReadonlySet<string>, reservedIds: readonly string[] = owner.reservedIds): { parameters: any[]; created: Array<{ rowKey: string; id: string }> } {
  const live = owner.entries.filter((entry) => liveRowKeys.has(entry.rowKey));
  const updates = new Map(live.filter((entry) => entry.existingParamId !== undefined).map((entry) => [entry.existingParamId, entry.next] as const));
  const kept = owner.stored.map((parameter) => updates.get(String(parameter?.id ?? '')) ?? parameter);
  const createEntries = live.filter((entry) => entry.existingParamId === undefined);
  const minted = makeUniqueIds(createEntries.map((entry) => ({ ...entry.next, id: '' })), [...kept.map((parameter) => String(parameter?.id ?? '')), ...reservedIds]);
  return { parameters: [...kept, ...minted], created: createEntries.map((entry, index) => ({ rowKey: entry.rowKey, id: minted[index].id })) };
}
