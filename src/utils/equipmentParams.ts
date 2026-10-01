import {
  EQUIPMENT_BOOKERS_PARAM_ID,
  EQUIPMENT_END_PARAM_ID,
  EQUIPMENT_HOURS_PER_WEEK_PARAM_ID,
  EQUIPMENT_PARAM_IDS,
  EQUIPMENT_PARAM_NAMES,
  EQUIPMENT_START_PARAM_ID,
} from './servicePricing';

/** The caption the right sidebar prints above the pinned group. */
export const EQUIPMENT_SIDEBAR_CAPTION =
  'This operation books equipment. Dates and hours set the estimate; booking opens after the SOW is signed.';

/**
 * The catalog editor's inline copy of the server-side rule. Kept identical to
 * EQUIPMENT_USE_NEEDS_BOOKABLE_MESSAGE in
 * damplab-backend/src/services/equipment-use.validation.ts so staff read the same
 * sentence whether the editor caught it or the save did.
 */
export const EQUIPMENT_USE_NEEDS_BOOKABLE_MESSAGE =
  'An equipment-use operation needs at least one bookable inventory item in Required inventory.';

const DATE_ONLY_RE = /^\d{4}-\d{2}-\d{2}$/;

const EQUIPMENT_ID_SET = new Set<string>(EQUIPMENT_PARAM_IDS);

const isBlank = (value: unknown): boolean =>
  value === '' || value === null || value === undefined || (Array.isArray(value) && value.length === 0);

/**
 * The submission gate for the four reserved parameters, keyed by parameter id.
 *
 * Returns nothing at all for a node that carries none of them, so Params.tsx can
 * merge it into formik's errors unconditionally. The pricer deliberately does not
 * throw on the same inputs — blocking submission is this function's job alone.
 */
export const validateEquipmentValues = (values: Record<string, any>): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!Object.keys(values ?? {}).some((key) => EQUIPMENT_ID_SET.has(key))) return errors;

  const start = values[EQUIPMENT_START_PARAM_ID];
  const end = values[EQUIPMENT_END_PARAM_ID];
  const hours = values[EQUIPMENT_HOURS_PER_WEEK_PARAM_ID];

  for (const [id, value] of [
    [EQUIPMENT_START_PARAM_ID, start],
    [EQUIPMENT_END_PARAM_ID, end],
    [EQUIPMENT_HOURS_PER_WEEK_PARAM_ID, hours],
  ] as const) {
    if (isBlank(value)) errors[id] = 'Required';
  }

  for (const [id, value] of [
    [EQUIPMENT_START_PARAM_ID, start],
    [EQUIPMENT_END_PARAM_ID, end],
  ] as const) {
    if (errors[id]) continue;
    if (typeof value !== 'string' || !DATE_ONLY_RE.test(value.trim())) errors[id] = 'Use a date in YYYY-MM-DD form.';
  }

  if (!errors[EQUIPMENT_START_PARAM_ID] && !errors[EQUIPMENT_END_PARAM_ID] && String(end).trim() < String(start).trim()) {
    // Lexicographic comparison is exact for zero-padded YYYY-MM-DD.
    errors[EQUIPMENT_END_PARAM_ID] = `${EQUIPMENT_PARAM_NAMES[EQUIPMENT_END_PARAM_ID]} must be on or after ${EQUIPMENT_PARAM_NAMES[EQUIPMENT_START_PARAM_ID]}.`;
  }

  if (!errors[EQUIPMENT_HOURS_PER_WEEK_PARAM_ID]) {
    const n = typeof hours === 'number' ? hours : Number(String(hours).trim());
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1) {
      errors[EQUIPMENT_HOURS_PER_WEEK_PARAM_ID] = `${EQUIPMENT_PARAM_NAMES[EQUIPMENT_HOURS_PER_WEEK_PARAM_ID]} must be a whole number of 1 or more.`;
    }
  }

  return errors;
};

/** The four first, in their pinned order; everything else in the order it arrived. */
export const orderEquipmentFirst = <T extends { id?: unknown }>(entries: T[]): T[] => {
  const pinned: T[] = [];
  for (const id of EQUIPMENT_PARAM_IDS) {
    const match = entries.find((e) => e?.id === id);
    if (match) pinned.push(match);
  }
  if (pinned.length === 0) return entries;
  return [...pinned, ...entries.filter((e) => !(typeof e?.id === 'string' && EQUIPMENT_ID_SET.has(e.id)))];
};

export const hasEquipmentParams = (entries: Array<{ id?: unknown }> | undefined): boolean =>
  Array.isArray(entries) && entries.some((e) => typeof e?.id === 'string' && EQUIPMENT_ID_SET.has(e.id));

/**
 * Whether a form entry is the retired booker list. The form never renders it — an
 * old job, or a canvas draft from before the retirement, can still carry one — and
 * nothing validates it, so a stored typo can never block a submission it cannot show.
 */
export const isRetiredEquipmentParam = (entry: { id?: unknown } | null | undefined): boolean =>
  entry?.id === EQUIPMENT_BOOKERS_PARAM_ID;
