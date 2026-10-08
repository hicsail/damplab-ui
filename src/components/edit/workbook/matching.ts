import { nearKey } from './cells';

export interface MatchResult {
  action: 'create' | 'update';
  existingId?: string;
  matchedByName: boolean;
  errors: string[];
  warnings: string[];
  selectedByDefault: boolean;
}

/**
 * Which record each row means (design rules 3–5), for one scope: all operations,
 * one owner's parameters, all bundles, all SOW text blocks.
 *
 * - a non-blank id that matches is an update; one that matches nothing is an error;
 * - with a blank id, a record whose trimmed name equals the row's is an update
 *   "matched by name"; two such records is an error; none is a create;
 * - a create whose name equals an existing record's, or another new row's, only
 *   after lower-casing and collapsing whitespace is a near-duplicate: a warning,
 *   unticked by default;
 * - two rows that resolve to the same record, or create the same name, are both errors.
 */
export function matchRows(
  rows: ReadonlyArray<{ rowNumber: number; id: string; name: string }>,
  existing: ReadonlyArray<{ id: string; name: string }>,
  noun: string
): MatchResult[] {
  const results: MatchResult[] = rows.map((row) => {
    const result: MatchResult = { action: 'create', matchedByName: false, errors: [], warnings: [], selectedByDefault: true };
    if (row.id !== '') {
      const found = existing.find((e) => e.id === row.id);
      if (found) {
        result.action = 'update';
        result.existingId = found.id;
      } else {
        result.errors.push(`No ${noun} has id “${row.id}”.`);
      }
      return result;
    }
    if (row.name === '') {
      result.errors.push(`A new ${noun} needs a name.`);
      return result;
    }
    const sameName = existing.filter((e) => e.name.trim() === row.name);
    if (sameName.length === 1) {
      result.action = 'update';
      result.existingId = sameName[0].id;
      result.matchedByName = true;
    } else if (sameName.length > 1) {
      result.errors.push(`${sameName.length} ${noun}s are named “${row.name}” — add the id to say which.`);
    } else {
      const near = existing.find((e) => nearKey(e.name) === nearKey(row.name));
      if (near) {
        result.warnings.push(`Looks like “${near.name.trim()}” — a near-duplicate`);
        result.selectedByDefault = false;
      }
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
    const key = results[i].action === 'update' ? `update:${results[i].existingId}` : `create:${row.name}`;
    groups.set(key, [...(groups.get(key) ?? []), i]);
  });
  for (const [key, indexes] of groups) {
    if (indexes.length < 2) continue;
    const numbers = indexes.map((i) => rows[i].rowNumber);
    const list = `${numbers.slice(0, -1).join(', ')} and ${numbers[numbers.length - 1]}`;
    const name = key.startsWith('update:') ? (existing.find((e) => `update:${e.id}` === key)?.name.trim() ?? '') : rows[indexes[0]].name;
    const message = key.startsWith('update:') ? `Rows ${list} both resolve to “${name}”.` : `Rows ${list} both create “${name}”.`;
    for (const i of indexes) results[i].errors.push(message);
  }

  for (const result of results) if (result.errors.length > 0) result.selectedByDefault = false;
  return results;
}
