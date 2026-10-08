/**
 * The "Other" option: any dropdown (or checkbox-list) option named "Other" takes
 * free text. The text is stored beside the answer as its own formData entry
 * `{ id: '<parameterId>__otherText', value }`, and only while "Other" is selected.
 *
 * Mirrors damplab-backend/src/workflow/utils/other-option.util.ts (same suffix,
 * same name rule), the way RUN_COUNT_PARAM_ID is shared. Keep the two in step.
 */
export const OTHER_TEXT_SUFFIX = '__otherText';
/** The label on the text field shown under the control while "Other" is selected. */
export const OTHER_TEXT_LABEL = 'Please specify';

export const otherTextEntryId = (parameterId: string): string => `${parameterId}${OTHER_TEXT_SUFFIX}`;

export const isOtherTextEntryId = (id: unknown): boolean => typeof id === 'string' && id.length > OTHER_TEXT_SUFFIX.length && id.endsWith(OTHER_TEXT_SUFFIX);

export const otherTextParentId = (entryId: string): string => entryId.slice(0, -OTHER_TEXT_SUFFIX.length);

export const isOtherOptionName = (name: unknown): boolean => typeof name === 'string' && name.trim().toLowerCase() === 'other';

/** The id of the parameter's "Other" option, when it is a dropdown that has one. Works on a definition or a form entry (both carry type and options). */
export function otherOptionIdOf(param: unknown): string | null {
  const p = param as { type?: unknown; options?: unknown } | null | undefined;
  if (!p || p.type !== 'dropdown' || !Array.isArray(p.options)) return null;
  const option = (p.options as Array<{ id?: unknown; name?: unknown }>).find((o) => o && isOtherOptionName(o.name));
  return option && option.id !== undefined && option.id !== null ? String(option.id) : null;
}

export function selectsOther(param: unknown, value: unknown): boolean {
  const otherId = otherOptionIdOf(param);
  if (otherId === null) return false;
  const values = Array.isArray(value) ? value : [value];
  return values.some((v) => v !== null && v !== undefined && String(v) === otherId);
}

/** "Other: <text>" for the Other option with text; the name as it is otherwise. */
export function otherLabel(name: string, text: unknown): string {
  if (!isOtherOptionName(name)) return name;
  const trimmed = typeof text === 'string' ? text.trim() : '';
  return trimmed === '' ? name : `Other: ${trimmed}`;
}

/** The saved "Other" text for a parameter, from a formData list (or legacy object keyed by id). '' when there is none. */
export function otherTextFrom(formData: unknown, parameterId: string): string {
  const id = otherTextEntryId(parameterId);
  let value: unknown;
  if (Array.isArray(formData)) value = formData.find((entry: any) => entry && entry.id === id)?.value;
  else if (formData && typeof formData === 'object') value = (formData as Record<string, unknown>)[id];
  return typeof value === 'string' ? value : '';
}
