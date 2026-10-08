import { conditionFromText, ConditionScope, conditionText, effectiveScope, missingReferences, ScopeSet } from '../../../utils/parameterConditionText';

/**
 * The "Show only if" field of the parameter form.
 *
 * What is stored on a parameter is `showIf`, a tree keyed by ids. The field
 * shows it as text with today's names; while someone types, the text is held
 * beside it as `_showIfText` (never saved — like `_dragKey`) and turned into a
 * tree when the list is saved (prepareParametersForSave), once every
 * parameter in the list has its final id.
 */
export const SHOW_IF_EXAMPLE = '"Sample Type"=="Bacteria" && "Volume">5';
export const SHOW_IF_HELP = `Leave blank to always show this parameter. Example: ${SHOW_IF_EXAMPLE}`;

/** What the editor knows beyond the list being edited. */
export interface ConditionContext {
  /** The id of the parameter set being edited; absent on an operation's parameter page and for a set not created yet. */
  setId?: string;
  /** Every parameter set, with its parameters — for "Set"."Parameter" references. */
  sets: ReadonlyArray<ScopeSet>;
}

export const NO_CONDITION_CONTEXT: ConditionContext = { sets: [] };

type Row = { showIf?: unknown; _showIfText?: string; [key: string]: any };

export function showIfScope(parameters: ReadonlyArray<Row>, index: number, context: ConditionContext): ConditionScope {
  return { list: parameters, carrierIndex: index, setId: context.setId, sets: context.sets };
}

/** The field's value: what is being typed, else the stored condition written with current names. */
export function showIfText(parameters: ReadonlyArray<Row>, index: number, context: ConditionContext): string {
  const parameter = parameters[index];
  if (!parameter) return '';
  if (typeof parameter._showIfText === 'string') return parameter._showIfText;
  return conditionText(parameter.showIf as any, showIfScope(parameters, index, context));
}

/** Why the typed condition cannot be saved, or null. Only text that was typed is judged. */
export function showIfError(parameters: ReadonlyArray<Row>, index: number, context: ConditionContext): string | null {
  const text = parameters[index]?._showIfText;
  if (typeof text !== 'string') return null;
  const result = conditionFromText(text, showIfScope(parameters, index, context));
  return 'error' in result ? result.error : null;
}

/** A stored condition that no longer resolves: what is missing. It does not block Save. */
export function showIfWarning(parameters: ReadonlyArray<Row>, index: number, context: ConditionContext): string | null {
  const parameter = parameters[index];
  if (!parameter || typeof parameter._showIfText === 'string') return null;
  const missing = missingReferences(parameter.showIf as any, showIfScope(parameters, index, context));
  if (missing.length === 0) return null;
  return `This condition refers to ${missing.join(' and ')}. Until it is corrected the parameter is always shown.`;
}

/** "Show only if: …" for a read-only view of a parameter, or null when it has no condition (rule 33). */
export function showIfSummary(condition: unknown, scope: ConditionScope): string | null {
  const text = conditionText(condition as any, scope);
  return text === '' ? null : `Show only if: ${text}`;
}

/** The same line for one parameter of an operation's effective list, where no set list is at hand (the staff catalog dialog). */
export function effectiveShowIfSummary(parameter: any, effectiveParameters: ReadonlyArray<any>): string | null {
  if (!parameter?.showIf) return null;
  return showIfSummary(parameter.showIf, effectiveScope(parameter, effectiveParameters));
}

/** A description (or whatever a view already shows under a name) followed by the condition line. */
export function withShowIfSummary(existing: string | undefined | null, summary: string | null): string | undefined {
  const parts = [existing, summary].filter((part): part is string => typeof part === 'string' && part !== '');
  return parts.length > 0 ? parts.join(' — ') : undefined;
}
