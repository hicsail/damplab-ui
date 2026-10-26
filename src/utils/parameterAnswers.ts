import { isTableParam, tableIsSetUp } from './sampleSheetValue';
import { checkValue, effectiveValidation, parseValidation } from './parameterValidation';
import { isOtherTextEntryId, otherTextEntryId, otherTextFrom, selectsOther } from './otherOption';
import { withoutHiddenAnswers } from './parameterConditions';

/**
 * What is wrong with a node's answers beyond "required": a number that breaks
 * its parameter's validation, and "Other" selected with no text. Keyed by the
 * formData entry id the message belongs under.
 *
 * `parameters` is the node's parameter definitions (`node.data.parameters`). A
 * form entry copies only a fixed set of fields from its definition — not
 * `validation` — so the rule is read from the definition by id.
 */
export function answerProblems(formData: ReadonlyArray<any>, parameters: ReadonlyArray<any> | null | undefined): Record<string, string> {
  const problems: Record<string, string> = {};
  const definitions = new Map<string, any>((parameters ?? []).filter((p) => p && typeof p.id === 'string').map((p) => [p.id, p]));
  for (const entry of formData ?? []) {
    if (!entry || typeof entry.id !== 'string' || isOtherTextEntryId(entry.id) || entry.paramType === 'result') continue;
    const definition = definitions.get(entry.id);

    if (definition && definition.type === 'number') {
      const parsed = parseValidation(effectiveValidation(definition));
      if ('rules' in parsed && parsed.rules.length > 0) {
        for (const one of Array.isArray(entry.value) ? entry.value : [entry.value]) {
          const message = checkValue(parsed.rules, one);
          if (message) {
            problems[entry.id] = message;
            break;
          }
        }
      }
    }

    if (selectsOther(entry, entry.value) && otherTextFrom(formData, entry.id).trim() === '') {
      problems[otherTextEntryId(entry.id)] = 'Please specify “Other”';
    }
  }
  return problems;
}

/**
 * The formData list with its "Other" text entries made to match the answers:
 * every companion entry is removed, then one is inserted directly after each
 * entry whose answer selects "Other", carrying `texts[<companion id>]`.
 * Deselecting "Other" therefore discards its text.
 */
export function syncOtherTextEntries(formData: ReadonlyArray<any>, texts: Record<string, unknown>): any[] {
  const out: any[] = [];
  for (const entry of formData ?? []) {
    if (!entry || isOtherTextEntryId(entry.id)) continue;
    out.push(entry);
    if (typeof entry.id !== 'string' || !selectsOther(entry, entry.value)) continue;
    const id = otherTextEntryId(entry.id);
    const text = texts[id];
    out.push({
      id,
      nodeId: entry.nodeId,
      name: `${entry.name ?? entry.id} (Other)`,
      type: 'string',
      paramType: 'input',
      resultParamValue: '',
      value: typeof text === 'string' ? text : '',
      required: false,
      dynamicAdd: false
    });
  }
  return out;
}

/**
 * A multi-value dropdown's chosen option ids, without the blank placeholder a new node starts with.
 * A single id saved before the parameter allowed several is read as that one choice.
 */
export function chosenOptionIds(values: unknown): string[] {
  const list = Array.isArray(values) ? values : values === null || values === undefined ? [] : [values];
  return list.filter((v) => v !== null && v !== undefined && v !== '' && typeof v !== 'object').map(String);
}

/** A checkbox list's next answer: the ticked option ids, in tick order, without the blank placeholder. */
export function toggleChecked(values: unknown, optionId: string, checked: boolean): string[] {
  const current = chosenOptionIds(Array.isArray(values) ? values : []);
  if (checked) return current.includes(optionId) ? current : [...current, optionId];
  return current.filter((v) => v !== optionId);
}

/** A multi-value dropdown shown as tick-boxes. `display` lives on the definition, not on the form entry. */
export function isCheckboxList(entry: any, definition: any): boolean {
  return entry?.type === 'dropdown' && definition?.display === 'checkboxes';
}

/** A Table that has not been set up (no columns, no staff template) cannot be answered, so it is never required. The staff template lives on the definition, not on the form entry. */
function unanswerableTable(entry: any, definitions: ReadonlyMap<string, any>): boolean {
  if (!isTableParam(entry)) return false;
  return !tableIsSetUp({ ...entry, ...(definitions.get(entry.id) ?? {}) });
}

const definitionsById = (parameters: ReadonlyArray<any> | null | undefined): Map<string, any> =>
  new Map<string, any>((parameters ?? []).filter((p) => p && typeof p.id === 'string').map((p) => [p.id, p]));

/** Whether a Table has been answered: any value that is not null, undefined or blank text, or an array with one such element. It does not check that the value is a file; the file's shape is the server's to judge. */
const hasTableFile = (value: unknown): boolean => (Array.isArray(value) ? value : [value]).some((v) => v !== null && v !== undefined && !(typeof v === 'string' && v.trim() === ''));

/** Whether every required entry of a form-data list has a value. */
function requiredAnswersFilled(formData: ReadonlyArray<any>, parameters?: ReadonlyArray<any> | null): boolean {
  const definitions = definitionsById(parameters);
  for (const entry of formData ?? []) {
    if (!entry) continue;
    if (entry.paramType === 'result') {
      if (entry.value === false && entry.required === true && (entry.resultParamValue === null || entry.resultParamValue === '')) return false;
    } else if (entry.required === true) {
      if (isTableParam(entry)) {
        if (!unanswerableTable(entry, definitions) && !hasTableFile(entry.value)) return false;
        continue;
      }
      const isMulti = entry.allowMultipleValues === true || Array.isArray(entry.value);
      if (isMulti) {
        if (!(Array.isArray(entry.value) && entry.value.some((v: any) => v != null && String(v).trim() !== ''))) return false;
      } else if (entry.value === '' || entry.value === undefined || entry.value === null) {
        return false;
      }
    }
  }
  return true;
}

/**
 * The canvas node's completeness badge: no required value is missing and no
 * answer breaks a rule — among the parameters that are shown. A hidden
 * parameter (its "show only if" is false) never counts against the node.
 */
export function nodeAnswersComplete(formData: ReadonlyArray<any> | null | undefined, parameters: ReadonlyArray<any> | null | undefined): boolean {
  const shown = withoutHiddenAnswers(parameters, formData ?? []);
  return requiredAnswersFilled(shown, parameters) && Object.keys(answerProblems(shown, parameters)).length === 0;
}

/**
 * The form's "Required" messages, keyed by entry id. `values` is the form's
 * current values by entry id; `formData` the entries to check — pass only the
 * shown ones (withoutHiddenAnswers), so a hidden parameter is never required.
 * `parameters` (optional) are the node's definitions: a Table is set up by a staff
 * template that only the definition carries.
 */
export function requiredProblems(formData: ReadonlyArray<any>, values: Record<string, any>, parameters?: ReadonlyArray<any> | null): Record<string, string> {
  const problems: Record<string, string> = {};
  const definitions = definitionsById(parameters);
  for (const entry of formData ?? []) {
    if (!entry || entry.paramType === 'result' || isOtherTextEntryId(entry.id) || !entry.required) continue;
    const value = values[entry.id];
    // A Table holds one file whatever allowMultipleValues says, and one that is not set up is never required.
    if (isTableParam(entry)) {
      if (!unanswerableTable(entry, definitions) && !hasTableFile(value)) problems[entry.id] = 'Required';
      continue;
    }
    const isFile = entry.type === 'file';
    if (entry.allowMultipleValues === true || Array.isArray(entry.value)) {
      const hasValue = isFile ? Array.isArray(value) && value.length > 0 : Array.isArray(value) && value.some((v: any) => v != null && String(v).trim() !== '');
      if (!hasValue) problems[entry.id] = 'Required (at least one value)';
    } else if (isFile ? !value : value === '' || value === undefined || value === null) {
      problems[entry.id] = 'Required';
    }
  }
  return problems;
}
