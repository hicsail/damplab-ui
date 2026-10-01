import { idFromName, makeUniqueIds } from '../../../utils/idFromName';
import { validateParameter } from './ParameterValidation';

export interface EditableParameter {
  _dragKey: string;
  id?: string;
  name?: string;
  type?: string;
  [key: string]: any;
}

// Mirrors ParameterValidation.tsx's own (unexported) shape. validateParameter's
// declared return type is the single-item interface, not an array, though it
// returns an array at runtime (pre-existing mismatch — see typecheck baseline).
interface ParameterValidationError {
  field: string;
  errorMsg: string;
}

export const createDragKey = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function withDragKeys(parameters: ReadonlyArray<any>): EditableParameter[] {
  return parameters.map((p) => ({ ...p, _dragKey: createDragKey() }));
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

  // A locked parameter's id is reserved up front and never touched by dedup;
  // only the unlocked ones are run through makeUniqueIds, seeded with the
  // reserved ids, so a colliding unlocked parameter is the one suffixed.
  const locked = parameters.map((p) => isIdLocked?.(p) === true);
  const reservedIds = normalized.filter((_, index) => locked[index]).map((p) => p.id).filter((id): id is string => !!id);
  const unlockedWithIndex = normalized.map((p, index) => ({ p, index })).filter(({ index }) => !locked[index]);
  const dedupedUnlocked = makeUniqueIds(unlockedWithIndex.map(({ p }) => p), reservedIds);

  const unique = normalized.slice();
  unlockedWithIndex.forEach(({ index }, k) => {
    unique[index] = dedupedUnlocked[k];
  });

  const validationErrors = unique.flatMap((parameter, index) =>
    (validateParameter(parameter as any) as unknown as ParameterValidationError[]).map(
      (error) => `Parameter ${index + 1}: ${error.field} - ${error.errorMsg}`
    )
  );
  return { parameters: unique, errors: [...tableParseErrors, ...validationErrors] };
}
