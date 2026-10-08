import { idFromName, makeUniqueIds } from '../../../utils/idFromName';
import { validateParameter } from './ParameterValidation';
import { conditionFromText } from '../../../utils/parameterConditionText';
import { ConditionContext, NO_CONDITION_CONTEXT } from './showIfField';

export interface EditableParameter {
  _dragKey: string;
  /** The "Show only if" text being typed. Never saved: it becomes `showIf` in prepareParametersForSave. */
  _showIfText?: string;
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

export function prepareParametersForSave(
  parameters: ReadonlyArray<EditableParameter>,
  tableDataText: Record<number, string>,
  isIdLocked?: (p: EditableParameter) => boolean,
  conditionContext: ConditionContext = NO_CONDITION_CONTEXT
): { parameters: any[]; errors: string[] } {
  const tableParseErrors: string[] = [];
  const normalized = parameters.map((parameter, index) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _dragKey, _showIfText, ...rest } = parameter;
    const next: Record<string, any> = { ...rest };
    if (!next.id || String(next.id).trim() === '') next.id = idFromName(next.name ?? '');
    // Stored trimmed; a blank one is not stored. Only a Number carries a
    // validation and only a dropdown a display — the server refuses anything else.
    if (typeof next.validation === 'string') next.validation = next.validation.trim();
    if (next.type !== 'number' || !next.validation) delete next.validation;
    if (next.type !== 'dropdown' || next.display === undefined || next.display === null) delete next.display;
    if (next.rangeValueMin === undefined) delete next.rangeValueMin;
    if (next.rangeValueMax === undefined) delete next.rangeValueMax;
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

  // "Show only if", last: a condition names other parameters of this list, and
  // is stored by their ids — which are final only now. A stored condition whose
  // text was not touched is left exactly as it is.
  const typed = parameters.map((parameter) => parameter._showIfText);
  // An edited condition replaces the stored one. All of them are dropped before
  // any is resolved, so a loop is judged among the conditions being saved.
  unique.forEach((parameter, index) => {
    if (typed[index] !== undefined) delete parameter.showIf;
  });
  const conditionErrors: string[] = [];
  unique.forEach((parameter, index) => {
    const text = typed[index];
    if (text === undefined) return;
    const resolved = conditionFromText(text, { list: unique, carrierIndex: index, setId: conditionContext.setId, sets: conditionContext.sets });
    if ('error' in resolved) conditionErrors.push(`Parameter ${index + 1}: Show only if - ${resolved.error}`);
    else if (resolved.condition !== undefined) parameter.showIf = resolved.condition;
  });

  const validationErrors = unique.flatMap((parameter, index) =>
    validateParameter(parameter as any).map(
      (error) => `Parameter ${index + 1}: ${error.field} - ${error.errorMsg}`
    )
  );
  return { parameters: unique, errors: [...tableParseErrors, ...validationErrors, ...conditionErrors] };
}
