import { nearKey } from './cells';

export interface MatchResult {
  action: 'create' | 'update';
  existingId?: string;
  /** The matched record's position in `existing` — what tells two records without an id apart. */
  existingIndex?: number;
  errors: string[];
  warnings: string[];
  selectedByDefault: boolean;
}

/** `a and b`, `a, b and c`: sheet row numbers in a sentence. */
export const rowList = (numbers: ReadonlyArray<number>): string => `${numbers.slice(0, -1).join(', ')} and ${numbers[numbers.length - 1]}`;

/**
 * Which record each row means, for one scope: all operations, one owner's
 * parameters, all bundles, all SOW text blocks. A row is matched by id only.
 *
 * - a non-blank id that matches is an update; one that matches nothing is an error;
 * - a blank id is always a create, never an update of the record with that name —
 *   except that a record which itself has no id has nothing else to be matched
 *   on: the one such record of exactly the row's name is that row's, an update;
 * - a create whose name equals an existing record's exactly (trimmed) would make a
 *   second record of that name: a warning, unticked by default;
 * - a create whose name equals an existing record's, or another new row's, only
 *   after lower-casing and collapsing whitespace is a near-duplicate: a warning,
 *   unticked by default;
 * - two rows with the same id, or two that create the same name, are both errors.
 */
export function matchRows(
  rows: ReadonlyArray<{ rowNumber: number; id: string; name: string }>,
  existing: ReadonlyArray<{ id: string; name: string }>,
  noun: string
): MatchResult[] {
  const results: MatchResult[] = rows.map((row) => {
    const result: MatchResult = { action: 'create', errors: [], warnings: [], selectedByDefault: true };
    if (row.id !== '') {
      const index = existing.findIndex((e) => e.id === row.id);
      if (index >= 0) {
        result.action = 'update';
        result.existingId = row.id;
        result.existingIndex = index;
      } else {
        result.errors.push(`No ${noun} has id “${row.id}”.`);
      }
      return result;
    }
    if (row.name === '') {
      result.errors.push(`A new ${noun} needs a name.`);
      return result;
    }
    const withoutId = existing.map((e, index) => ({ e, index })).filter(({ e }) => e.id === '' && e.name.trim() === row.name);
    if (withoutId.length === 1) {
      result.action = 'update';
      result.existingId = '';
      result.existingIndex = withoutId[0].index;
      return result;
    }
    if (existing.some((e) => e.name.trim() === row.name)) {
      result.warnings.push(`Same name as an existing ${noun} — this row creates a second one. Add the id to update it instead.`);
      result.selectedByDefault = false;
      return result;
    }
    const near = existing.find((e) => nearKey(e.name) === nearKey(row.name));
    if (near) {
      result.warnings.push(`Looks like “${near.name.trim()}” — a near-duplicate`);
      result.selectedByDefault = false;
    }
    return result;
  });

  const isCreate = (i: number): boolean => results[i].action === 'create' && results[i].errors.length === 0;

  // Two new rows that differ only by case or spacing.
  rows.forEach((row, i) => {
    if (!isCreate(i)) return;
    const other = rows.find((r, j) => j !== i && isCreate(j) && r.name !== row.name && nearKey(r.name) === nearKey(row.name));
    if (other) {
      results[i].warnings.push(`Looks like “${other.name}” — a near-duplicate`);
      results[i].selectedByDefault = false;
    }
  });

  // Two rows, one record.
  const groups = new Map<string, number[]>();
  rows.forEach((row, i) => {
    if (results[i].errors.length > 0) return;
    const key = results[i].action === 'update' ? `update:${results[i].existingIndex}` : `create:${row.name}`;
    groups.set(key, [...(groups.get(key) ?? []), i]);
  });
  for (const [key, indexes] of groups) {
    if (indexes.length < 2) continue;
    const list = rowList(indexes.map((i) => rows[i].rowNumber));
    const name = key.startsWith('update:') ? existing[results[indexes[0]].existingIndex!].name.trim() : rows[indexes[0]].name;
    const message = key.startsWith('update:') ? `Rows ${list} both resolve to “${name}”.` : `Rows ${list} both create “${name}”.`;
    for (const i of indexes) results[i].errors.push(message);
  }

  for (const result of results) if (result.errors.length > 0) result.selectedByDefault = false;
  return results;
}
