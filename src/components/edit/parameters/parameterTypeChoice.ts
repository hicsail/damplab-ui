import { isTableType, TABLE_PARAM_TYPE } from '../../../utils/sampleSheetValue';
import { effectiveValidation, parseValidation } from '../../../utils/parameterValidation';

/**
 * "Checkboxes" is a choice in the editor's type list but not a stored type: it
 * is a multi-value dropdown with `display: 'checkboxes'`, so everything keyed on
 * `type === 'dropdown'` (choices, option pricing, answers) keeps working.
 */
export const CHECKBOXES_CHOICE = 'checkboxes';

/**
 * A "Pick from list" that allows multiple selections is answered one of two ways,
 * its "Multiple selection type": a dropdown per choice added with +1 (no `display`,
 * the default), or one dropdown in which options are ticked (`display: 'multiselect'`).
 */
export type MultipleSelectionType = 'plusOne' | 'checkbox';

export function multipleSelectionTypeOf(parameter: { type?: string; display?: unknown; allowMultipleValues?: unknown }): MultipleSelectionType | null {
  if (parameter.type !== 'dropdown' || parameter.allowMultipleValues !== true || parameter.display === CHECKBOXES_CHOICE) return null;
  return parameter.display === 'multiselect' ? 'checkbox' : 'plusOne';
}

export function applyMultipleSelectionType(choice: MultipleSelectionType): Record<string, unknown> {
  return { display: choice === 'checkbox' ? 'multiselect' : undefined };
}

/** "Allow multiple selections?" — turning it off also drops the checkbox-dropdown display, which needs it. */
export function applyAllowMultiple(parameter: Record<string, any>, allow: boolean): Record<string, unknown> {
  return !allow && parameter.display === 'multiselect' ? { allowMultipleValues: false, display: undefined } : { allowMultipleValues: allow };
}

export function typeChoiceOf(parameter: { type?: string; display?: unknown }): string {
  if (parameter.type === 'dropdown' && parameter.display === 'checkboxes') return CHECKBOXES_CHOICE;
  // A stored `sampleSheet` is a Table: there is one entry for both in the type list.
  if (isTableType(parameter.type)) return TABLE_PARAM_TYPE;
  return parameter.type ?? 'string';
}

export function applyTypeChoice(choice: string): Record<string, unknown> {
  if (choice === CHECKBOXES_CHOICE) return { type: 'dropdown', display: 'checkboxes', allowMultipleValues: true };
  return { type: choice, display: undefined };
}

/** What the Validation field shows: the string being edited, else the legacy min/max written as rules. */
export function validationText(parameter: Record<string, any>): string {
  if (typeof parameter.validation === 'string') return parameter.validation;
  return effectiveValidation(parameter);
}

/** Editing the field takes over from the legacy min/max, which are no longer written. */
export function applyValidationText(text: string): Record<string, unknown> {
  return { validation: text, rangeValueMin: undefined, rangeValueMax: undefined };
}

export function validationError(parameter: Record<string, any>): string | null {
  if (parameter.type !== 'number' || typeof parameter.validation !== 'string') return null;
  const parsed = parseValidation(parameter.validation);
  return 'error' in parsed ? parsed.error : null;
}
