import { idFromName } from '../../../utils/idFromName';
import { validateParameter } from './ParameterValidation';

export interface EditableParameter {
  _dragKey: string;
  id?: string;
  name?: string;
  type?: string;
  [key: string]: any;
}

export const createDragKey = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function withDragKeys(parameters: ReadonlyArray<any>): EditableParameter[] {
  return parameters.map((p) => ({ ...p, _dragKey: createDragKey() }));
}

/**
 * Like `makeUniqueIds`, but a locked parameter's id is reserved up front and
 * never renamed — an unlocked parameter colliding with it (or with another
 * unlocked one) is the one that gets suffixed. With every `locked` entry
 * `false` this is exactly `makeUniqueIds`'s own sequential dedup.
 */
function makeUniqueIdsWithLocks<T extends { id?: string; name?: string }>(items: T[], locked: boolean[]): T[] {
  const used = new Set<string>();

  items.forEach((item, index) => {
    if (!locked[index]) return;
    const base = item.id?.trim() || idFromName(item.name ?? '');
    if (base) used.add(base);
  });

  return items.map((item, index) => {
    const base = item.id?.trim() || idFromName(item.name ?? '');
    if (!base) return item;

    if (locked[index]) {
      return item.id === base ? item : { ...item, id: base };
    }

    let next = base;
    let i = 2;
    while (used.has(next)) {
      next = `${base}_${i}`;
      i += 1;
    }
    used.add(next);
    return item.id === next ? item : { ...item, id: next };
  });
}

export function prepareParametersForSave(
  parameters: ReadonlyArray<EditableParameter>,
  tableDataText: Record<number, string>,
  isIdLocked?: (p: EditableParameter) => boolean
): { parameters: any[]; errors: string[] } {
  const tableParseErrors: string[] = [];
  const normalized = parameters.map((parameter, index) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _dragKey, ...rest } = parameter;
    const next: Record<string, any> = { ...rest };
    if (!next.id || String(next.id).trim() === '') next.id = idFromName(next.name ?? '');
    if (next.type === 'table') {
      const raw = tableDataText[index];
      if (raw && raw.trim()) {
        try {
          next.tableData = JSON.parse(raw);
        } catch {
          tableParseErrors.push(`Parameter ${index + 1} table setup must be valid JSON.`);
        }
      }
    }
    return next;
  });
  const locked = parameters.map((p) => isIdLocked?.(p) === true);
  const unique = makeUniqueIdsWithLocks(normalized as Array<{ id?: string; name?: string }>, locked);
  const validationErrors = unique.flatMap((parameter, index) =>
    // validateParameter's declared return type is the single-item interface, not an array,
    // though it returns an array at runtime (pre-existing mismatch — see baseline).
    (validateParameter(parameter as any) as unknown as any[]).map((error: any) => `Parameter ${index + 1}: ${error.field} - ${error.errorMsg}`)
  );
  return { parameters: unique, errors: [...tableParseErrors, ...validationErrors] };
}
