import { idFromName, makeUniqueIds } from '../../../utils/idFromName';
import { validateParameter } from './ParameterValidation';
import { conditionFromText } from '../../../utils/parameterConditionText';
import { expectedColumnsOf, hasStaffTemplate, isTableType, TABLE_PARAM_TYPE } from '../../../utils/sampleSheetValue';
import { columnNamesFromText, resolveTableColumns } from '../../../utils/tableColumns';
import { ConditionContext, NO_CONDITION_CONTEXT } from './showIfField';

export interface EditableParameter {
  _dragKey: string;
  /** The "Show only if" text being typed. Never saved: it becomes `showIf` in prepareParametersForSave. */
  _showIfText?: string;
  /** The Columns field of a Table as typed, one name per line. Never saved: it becomes `tableData.columns` in prepareParametersForSave. Undefined: not edited. */
  _columnsText?: string;
  /**
   * Set when a parameter is loaded as a Table: the type string (`table` or
   * `sampleSheet`) and the allowMultipleValues it is stored with. Never saved.
   * prepareParametersForSave writes both back as they were, because the price
   * of every job that already answered the parameter is computed from them.
   * `definition` is the columns and template it was loaded with, so a save can
   * tell whether this edit touched them (rule 12 holds only a touched Table).
   */
  _storedTable?: { type: string; allowMultipleValues?: unknown; definition?: string };
  id?: string;
  name?: string;
  type?: string;
  [key: string]: any;
}

/** What makes a Table answerable: its column headers and its staff template. Compared before and after an edit. */
const tableDefinitionOf = (parameter: any): string => JSON.stringify([expectedColumnsOf(parameter), hasStaffTemplate(parameter) ? parameter.templateFile.key : null]);

export const createDragKey = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function withDragKeys(parameters: ReadonlyArray<any>): EditableParameter[] {
  return parameters.map((p) => ({
    ...p,
    _dragKey: createDragKey(),
    ...(isTableType(p?.type) ? { _storedTable: { type: p.type, allowMultipleValues: p.allowMultipleValues, definition: tableDefinitionOf(p) } } : {})
  }));
}

/** A Table loaded from the server whose type, columns and template this edit left as they were. The server's rule (`tableDefinitionError`). */
const isStoredTableUntouched = (edited: EditableParameter | undefined, saved: any): boolean => {
  const stored = edited?._storedTable;
  return !!stored && stored.definition !== undefined && isTableType(stored.type) && isTableType(saved?.type) && stored.definition === tableDefinitionOf(saved);
};

export function prepareParametersForSave(
  parameters: ReadonlyArray<EditableParameter>,
  isIdLocked?: (p: EditableParameter) => boolean,
  conditionContext: ConditionContext = NO_CONDITION_CONTEXT
): { parameters: any[]; errors: string[] } {
  const columnErrors: string[] = [];
  const normalized = parameters.map((parameter, index) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _dragKey, _showIfText, _columnsText, _storedTable, ...rest } = parameter;
    const next: Record<string, any> = { ...rest };
    if (!next.id || String(next.id).trim() === '') next.id = idFromName(next.name ?? '');
    // Stored trimmed; a blank one is not stored. Only a Number carries a
    // validation and only a dropdown a display — the server refuses anything else.
    if (typeof next.validation === 'string') next.validation = next.validation.trim();
    if (next.type !== 'number' || !next.validation) delete next.validation;
    if (next.type !== 'dropdown' || next.display === undefined || next.display === null) delete next.display;
    if (next.rangeValueMin === undefined) delete next.rangeValueMin;
    if (next.rangeValueMax === undefined) delete next.rangeValueMax;
    if (isTableType(next.type)) {
      if (_storedTable && isTableType(_storedTable.type)) {
        // Already stored as a Table: it keeps the type string and the
        // allowMultipleValues it is stored with, whatever the editor did to
        // them meanwhile (the type list has one "Table" entry for both
        // strings; the flag is hidden). Pricing reads both, so rewriting
        // either would move the price of jobs that already answered it.
        next.type = _storedTable.type;
        if (_storedTable.allowMultipleValues === undefined) delete next.allowMultipleValues;
        else next.allowMultipleValues = _storedTable.allowMultipleValues;
      } else {
        // New, or another type turned into a Table: `table`, holding one file.
        next.type = TABLE_PARAM_TYPE;
        next.allowMultipleValues = false;
      }
      if (next.templateFile === null || next.templateFile === undefined) delete next.templateFile;
      // Only an edited Columns field rewrites the columns. `tableData.rows` and
      // anything else stored there is left exactly as it is; it is never read.
      if (typeof _columnsText === 'string') {
        const stored = Array.isArray(next.tableData?.columns) ? next.tableData.columns : [];
        const resolved = resolveTableColumns(columnNamesFromText(_columnsText), stored);
        columnErrors.push(...resolved.errors.map((error) => `Parameter ${index + 1}: Columns - ${error}`));
        next.tableData = { ...(next.tableData ?? {}), columns: resolved.columns };
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
    validateParameter(parameter as any, { tableUntouched: isStoredTableUntouched(parameters[index], parameter) }).map(
      (error) => `Parameter ${index + 1}: ${error.field} - ${error.errorMsg}`
    )
  );
  return { parameters: unique, errors: [...columnErrors, ...validationErrors, ...conditionErrors] };
}
