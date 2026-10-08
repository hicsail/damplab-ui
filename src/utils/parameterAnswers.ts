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

/** A checkbox list's next answer: the ticked option ids, in tick order, without the blank placeholder. */
export function toggleChecked(values: unknown, optionId: string, checked: boolean): string[] {
  const current = (Array.isArray(values) ? values : []).filter((v) => v !== null && v !== undefined && v !== '').map(String);
  if (checked) return current.includes(optionId) ? current : [...current, optionId];
  return current.filter((v) => v !== optionId);
}

/** A multi-value dropdown shown as tick-boxes. `display` lives on the definition, not on the form entry. */
export function isCheckboxList(entry: any, definition: any): boolean {
  return entry?.type === 'dropdown' && definition?.display === 'checkboxes';
}

/** Whether every required entry of a form-data list has a value. */
function requiredAnswersFilled(formData: ReadonlyArray<any>): boolean {
  for (const entry of formData ?? []) {
    if (!entry) continue;
    if (entry.paramType === 'result') {
      if (entry.value === false && entry.required === true && (entry.resultParamValue === null || entry.resultParamValue === '')) return false;
    } else if (entry.required === true) {
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
  return requiredAnswersFilled(shown) && Object.keys(answerProblems(shown, parameters)).length === 0;
}

/**
 * The form's "Required" messages, keyed by entry id. `values` is the form's
 * current values by entry id; `formData` the entries to check — pass only the
 * shown ones (withoutHiddenAnswers), so a hidden parameter is never required.
 */
export function requiredProblems(formData: ReadonlyArray<any>, values: Record<string, any>): Record<string, string> {
  const problems: Record<string, string> = {};
  for (const entry of formData ?? []) {
    if (!entry || entry.paramType === 'result' || isOtherTextEntryId(entry.id) || !entry.required) continue;
    const value = values[entry.id];
    const isFile = entry.type === 'file' || entry.type === 'sampleSheet';
    if (entry.allowMultipleValues === true || Array.isArray(entry.value)) {
      const hasValue = entry.type === 'file' ? Array.isArray(value) && value.length > 0 : Array.isArray(value) && value.some((v: any) => v != null && String(v).trim() !== '');
      if (!hasValue) problems[entry.id] = 'Required (at least one value)';
    } else if (isFile ? !value : value === '' || value === undefined || value === null) {
      problems[entry.id] = 'Required';
    }
  }
  return problems;
}
