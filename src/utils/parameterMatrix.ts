/**
 * "Matrix": a parameter may carry `matrix: "<name>;<column>"`, which lays it out
 * in a grid with the other parameters of that matrix instead of one under another.
 *
 * Rows come from column 1. A +1 dropdown there gives one row per choice; any
 * other parameter there gives one row. A parameter in a later column sits on the
 * row of the column-1 choice its "show only if" names (AFP Dilution, shown when
 * "Assays".includes("AFP"), sits on the AFP row), so rows line up whatever order
 * the choices were made in. A parameter with no such link stacks into the first
 * free cell of its column, in parameter order. Only shown parameters take part:
 * a hidden one leaves no gap.
 *
 * Mirrors the server's rule in damplab-backend/src/services/parameter-validation.ts.
 */
import { isTableType } from './sampleSheetValue';
import { optionIdsNamedBy } from './parameterConditions';

export interface MatrixPlace {
  /** Compared case-insensitively, trimmed. */
  name: string;
  column: number;
}

const MATRIX_PATTERN = /^([^;]+);\s*(\d+)$/;

/** The parameter's place, or null when it has none or the text is malformed. */
export function parseMatrix(raw: unknown): MatrixPlace | null {
  if (typeof raw !== 'string') return null;
  const match = MATRIX_PATTERN.exec(raw.trim());
  if (!match) return null;
  const name = match[1].trim();
  const column = Number(match[2]);
  if (!name || !Number.isInteger(column) || column < 1) return null;
  return { name, column };
}

/** Why a parameter's matrix text may not be saved, or null. A blank one is no matrix. */
export function matrixError(parameter: { matrix?: unknown; type?: unknown; name?: unknown }): string | null {
  const text = typeof parameter.matrix === 'string' ? parameter.matrix.trim() : '';
  if (parameter.matrix !== undefined && parameter.matrix !== null && typeof parameter.matrix !== 'string') return 'Write the matrix as name;column, e.g. matrixA;2.';
  if (text === '') return null;
  if (!parseMatrix(text)) return 'Write the matrix as name;column, e.g. matrixA;2 (the column is 1 or more).';
  if (isTableType(parameter.type)) return 'A Table cannot be placed in a matrix.';
  return null;
}

export interface MatrixCell {
  paramId: string;
  /** For a +1 dropdown in column 1: which of its choices this cell is. */
  entryIndex?: number;
}

export interface MatrixRow {
  /** Index = column - 1. */
  cells: Array<MatrixCell | null>;
  /** The +1 choice the row stands for; removing it removes the row. */
  choice?: { paramId: string; entryIndex: number };
}

export interface MatrixLayout {
  name: string;
  columns: number;
  rows: MatrixRow[];
  /** The +1 dropdowns in column 1: each gets a +1 under the matrix. */
  adders: string[];
  /** Every shown parameter laid out in this matrix, in parameter order. */
  memberIds: string[];
}

/** A dropdown answered by +1 rows: multi-value, and neither shown as checkboxes nor as a checkbox dropdown. */
export function isPlusOneDropdown(entry: any, definition: any): boolean {
  if (entry?.type !== 'dropdown') return false;
  if (!(entry.allowMultipleValues === true || Array.isArray(entry.value))) return false;
  return definition?.display !== 'checkboxes' && definition?.display !== 'multiselect';
}

/** A +1 answer as its rows: never empty, a blank placeholder included. */
export function plusOneValues(value: unknown): unknown[] {
  if (Array.isArray(value)) return value.length > 0 ? value : [''];
  return [value ?? ''];
}

type Leaf = { parameterId?: unknown; op?: unknown; optionIds?: unknown; value?: unknown };

function leavesOf(condition: unknown): Leaf[] {
  if (!condition || typeof condition !== 'object') return [];
  const c = condition as Record<string, unknown>;
  if (Array.isArray(c.all)) return c.all.flatMap(leavesOf);
  if (Array.isArray(c.any)) return c.any.flatMap(leavesOf);
  return [c as Leaf];
}

/** The column-1 +1 dropdown and the option ids a later-column parameter's condition ties it to, if any. */
function linkOf(definition: any, plusOneDefs: ReadonlyMap<string, any>): { paramId: string; optionIds: Set<string> } | null {
  for (const leaf of leavesOf(definition?.showIf)) {
    if (typeof leaf.parameterId !== 'string') continue;
    const controller = plusOneDefs.get(leaf.parameterId);
    if (!controller) continue;
    if (leaf.op === 'includes' && typeof leaf.value === 'string') return { paramId: leaf.parameterId, optionIds: optionIdsNamedBy(controller.options, leaf.value) };
    if ((leaf.op === 'eq' || leaf.op === 'in') && Array.isArray(leaf.optionIds)) return { paramId: leaf.parameterId, optionIds: new Set(leaf.optionIds.map(String)) };
  }
  return null;
}

/**
 * The step's matrices, from its shown form entries (in order), the parameter
 * definitions (where `matrix`, `display` and `showIf` live) and the current answers.
 */
export function matrixLayouts(entries: ReadonlyArray<any>, definitions: ReadonlyArray<any> | null | undefined, values: Record<string, unknown>): MatrixLayout[] {
  const definitionById = new Map<string, any>((definitions ?? []).filter((d) => d && typeof d.id === 'string').map((d) => [d.id, d]));
  const groups = new Map<string, { name: string; members: Array<{ entry: any; definition: any; column: number }> }>();
  for (const entry of entries) {
    if (!entry || typeof entry.id !== 'string' || entry.paramType === 'result') continue;
    const definition = definitionById.get(entry.id);
    const place = parseMatrix(definition?.matrix);
    if (!place || isTableType(entry.type)) continue;
    const key = place.name.toLowerCase();
    if (!groups.has(key)) groups.set(key, { name: place.name, members: [] });
    groups.get(key)!.members.push({ entry, definition, column: place.column });
  }

  const layouts: MatrixLayout[] = [];
  for (const { name, members } of groups.values()) {
    const columns = Math.max(...members.map((m) => m.column));
    const rows: MatrixRow[] = [];
    const newRow = (): MatrixRow => ({ cells: Array.from({ length: columns }, () => null) });
    const adders: string[] = [];
    const plusOneDefs = new Map<string, any>();
    // Which option each +1 row chose, to seat linked cells on it.
    const chosenOn = new Map<MatrixRow, { paramId: string; optionId: string }>();

    for (const { entry, definition } of members.filter((m) => m.column === 1)) {
      if (isPlusOneDropdown(entry, definition)) {
        adders.push(entry.id);
        plusOneDefs.set(entry.id, { ...entry, ...(definition ?? {}) });
        plusOneValues(values[entry.id]).forEach((value, entryIndex) => {
          const row = newRow();
          row.cells[0] = { paramId: entry.id, entryIndex };
          row.choice = { paramId: entry.id, entryIndex };
          chosenOn.set(row, { paramId: entry.id, optionId: String(value ?? '') });
          rows.push(row);
        });
      } else {
        const row = newRow();
        row.cells[0] = { paramId: entry.id };
        rows.push(row);
      }
    }

    const firstFree = (index: number): MatrixRow => {
      const free = rows.find((row) => row.cells[index] === null);
      if (free) return free;
      const row = newRow();
      rows.push(row);
      return row;
    };
    for (const { entry, definition, column } of members.filter((m) => m.column > 1)) {
      const index = column - 1;
      const link = linkOf(definition, plusOneDefs);
      const linked = link
        ? rows.find((row) => {
            const chosen = chosenOn.get(row);
            return row.cells[index] === null && chosen?.paramId === link.paramId && link.optionIds.has(chosen.optionId);
          })
        : undefined;
      (linked ?? firstFree(index)).cells[index] = { paramId: entry.id };
    }

    layouts.push({ name, columns, rows, adders, memberIds: members.map((m) => m.entry.id) });
  }
  return layouts;
}
