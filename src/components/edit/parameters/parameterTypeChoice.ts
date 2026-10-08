import { effectiveValidation, parseValidation } from '../../../utils/parameterValidation';

/**
 * "Checkboxes" is a choice in the editor's type list but not a stored type: it
 * is a multi-value dropdown with `display: 'checkboxes'`, so everything keyed on
 * `type === 'dropdown'` (choices, option pricing, answers) keeps working.
 */
export const CHECKBOXES_CHOICE = 'checkboxes';

export function typeChoiceOf(parameter: { type?: string; display?: unknown }): string {
  if (parameter.type === 'dropdown' && parameter.display === 'checkboxes') return CHECKBOXES_CHOICE;
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
