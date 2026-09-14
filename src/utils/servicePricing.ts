export type ServicePricingMode = 'SERVICE' | 'PARAMETER';

/** Reserved formData entry id injected universally on every canvas node. */
export const RUN_COUNT_PARAM_ID = '__runCount';
/** Display name for the injected run-count entry. Kept in sync with the
 *  definitions in controllers/GraphHelpers.tsx and controllers/ReactFlowEvents.tsx. */
export const RUN_COUNT_PARAM_NAME = 'Number of runs';

/**
 * The five reserved equipment-use parameter ids. Injected into a node's formData at
 * creation like the run count, never stored in service.parameters — so pricing,
 * diffing and display all read them straight out of formData.
 * Must stay in sync with the constants of the same names in
 * damplab-backend/src/pricing/service-pricing.util.ts.
 */
export const EQUIPMENT_START_PARAM_ID = '__equipStart';
export const EQUIPMENT_END_PARAM_ID = '__equipEnd';
export const EQUIPMENT_OPEN_END_PARAM_ID = '__equipOpenEnd';
export const EQUIPMENT_HOURS_PER_WEEK_PARAM_ID = '__equipHoursPerWeek';
export const EQUIPMENT_BOOKERS_PARAM_ID = '__equipBookers';

/** The five, in the order the sidebar and the documents show them. */
export const EQUIPMENT_PARAM_IDS: readonly string[] = [
  EQUIPMENT_START_PARAM_ID,
  EQUIPMENT_END_PARAM_ID,
  EQUIPMENT_OPEN_END_PARAM_ID,
  EQUIPMENT_HOURS_PER_WEEK_PARAM_ID,
  EQUIPMENT_BOOKERS_PARAM_ID,
];

/** Fixed labels. Staff cannot rename these in this run. */
export const EQUIPMENT_PARAM_NAMES: Readonly<Record<string, string>> = {
  [EQUIPMENT_START_PARAM_ID]: 'Start Date',
  [EQUIPMENT_END_PARAM_ID]: 'End Date',
  [EQUIPMENT_OPEN_END_PARAM_ID]: 'Open End Date?',
  [EQUIPMENT_HOURS_PER_WEEK_PARAM_ID]: 'Projected Hours per Week',
  [EQUIPMENT_BOOKERS_PARAM_ID]: 'Authorized booker emails',
};

/**
 * Display name for a formData entry, or undefined if none can be determined.
 *
 * Submitted jobs store formData as `{ id, value }` only (see the backend's
 * normalizeFormDataToArray), so `entry.name` is absent once a job is loaded
 * back. The run-count entry is injected client-side and so is also missing
 * from `service.parameters`, leaving both usual sources empty -- hence the
 * explicit fallback to its known name. Callers supply their own last resort.
 */
export const resolveParameterName = (entry: any, paramDef?: any): string | undefined =>
  entry?.name ||
  paramDef?.name ||
  (entry?.id === RUN_COUNT_PARAM_ID ? RUN_COUNT_PARAM_NAME : undefined) ||
  (typeof entry?.id === 'string' ? EQUIPMENT_PARAM_NAMES[entry.id] : undefined);
import type { CustomerCategory } from './customerCategory';
export type { CustomerCategory };

interface ServiceParameterOption {
  id?: unknown;
  name?: unknown;
  price?: unknown;
  internalPrice?: unknown;
  externalPrice?: unknown;
  pricing?: {
    internal?: unknown;
    external?: unknown;
    externalAcademic?: unknown;
    externalMarket?: unknown;
    externalNoSalary?: unknown;
    legacy?: unknown;
  } | unknown;
}

interface ServiceParameterDefinition {
  id?: unknown;
  allowMultipleValues?: boolean;
  price?: unknown;
  internalPrice?: unknown;
  externalPrice?: unknown;
  pricing?: {
    internal?: unknown;
    external?: unknown;
    externalAcademic?: unknown;
    externalMarket?: unknown;
    externalNoSalary?: unknown;
    legacy?: unknown;
  } | unknown;
  type?: unknown;
  options?: ServiceParameterOption[] | unknown;
  isPriceMultiplier?: boolean;
}

interface FormDataEntry {
  id?: unknown;
  value?: unknown;
  allowMultipleValues?: boolean;
}

const normalizePricingMode = (value: unknown): ServicePricingMode => {
  if (typeof value === 'string') {
    const upper = value.toUpperCase();
    if (upper === 'PARAMETER') return 'PARAMETER';
  }
  return 'SERVICE';
};

const normalizePrice = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
};

const resolveCategoryPrice = (
  input:
    | {
        internalPrice?: unknown;
        externalPrice?: unknown;
        externalAcademicPrice?: unknown;
        externalMarketPrice?: unknown;
        externalNoSalaryPrice?: unknown;
        price?: unknown;
        pricing?: {
          internal?: unknown;
          external?: unknown;
          externalAcademic?: unknown;
          externalMarket?: unknown;
          externalNoSalary?: unknown;
          legacy?: unknown;
        } | unknown;
      }
    | null
    | undefined,
  category?: CustomerCategory
): number | undefined => {
  if (!input) return undefined;
  const pricing = input.pricing && typeof input.pricing === 'object' ? (input.pricing as any) : undefined;
  if (category === 'INTERNAL_CUSTOMERS') {
    const p = normalizePrice(pricing?.internal ?? input.internalPrice);
    if (p !== undefined) return p;
  } else if (category === 'EXTERNAL_CUSTOMER_ACADEMIC') {
    const p = normalizePrice(pricing?.externalAcademic ?? pricing?.external ?? input.externalAcademicPrice ?? input.externalPrice);
    if (p !== undefined) return p;
  } else if (category === 'EXTERNAL_CUSTOMER_MARKET') {
    const p = normalizePrice(pricing?.externalMarket ?? pricing?.external ?? input.externalMarketPrice ?? input.externalPrice);
    if (p !== undefined) return p;
  } else if (category === 'EXTERNAL_CUSTOMER_NO_SALARY') {
    const p = normalizePrice(pricing?.externalNoSalary ?? pricing?.external ?? input.externalNoSalaryPrice ?? input.externalPrice);
    if (p !== undefined) return p;
  }
  return normalizePrice(pricing?.legacy ?? input.price);
};

const getMultiValueParamIds = (parameters: unknown, rawFormData?: unknown): Set<string> => {
  const ids = new Set<string>();

  if (Array.isArray(parameters)) {
    for (const param of parameters as ServiceParameterDefinition[]) {
      if (!param || typeof param !== 'object') continue;
      if (param.allowMultipleValues !== true) continue;
      const id = typeof param.id === 'string' ? param.id : undefined;
      if (id) ids.add(id);
    }
  }

  if (Array.isArray(rawFormData)) {
    for (const entry of rawFormData as FormDataEntry[]) {
      if (!entry || typeof entry !== 'object') continue;
      if (entry.allowMultipleValues !== true) continue;
      const id = typeof entry.id === 'string' ? entry.id : undefined;
      if (id) ids.add(id);
    }
  }

  return ids;
};

const ensureArrayValue = (
  value: unknown,
  paramId: string,
  multiValueParamIds: Set<string>
): string | number | boolean | string[] | null => {
  const isMulti = multiValueParamIds.has(paramId);

  if (value === undefined || value === null) return isMulti ? [] : null;

  if (isMulti) {
    return Array.isArray(value) ? (value as string[]) : [value as string];
  }

  if (Array.isArray(value)) {
    return value.length ? (value[0] as string) : null;
  }

  return value as string | number | boolean;
};

const normalizeFormDataToArray = (
  input: unknown,
  multiValueParamIds: Set<string>
): Array<{ id: string; value: string | number | boolean | string[] | null }> => {
  if (input == null) return [];

  if (Array.isArray(input)) {
    return (input as FormDataEntry[])
      .filter(
        (item): item is FormDataEntry & { id: string } =>
          item != null && typeof item === 'object' && typeof item.id === 'string'
      )
      .map((item) => ({
        id: item.id as string,
        value: ensureArrayValue(item.value, item.id as string, multiValueParamIds),
      }));
  }

  if (typeof input === 'object') {
    return Object.entries(input).map(([id, value]) => ({
      id,
      value: ensureArrayValue(value, id, multiValueParamIds),
    }));
  }

  return [];
};

const countValue = (value: unknown, isMulti: boolean): number => {
  if (isMulti) {
    if (Array.isArray(value)) return value.length;
    if (value === null || value === undefined) return 0;
    return 1;
  }
  return value === null || value === undefined ? 0 : 1;
};

export const calculateParameterCost = (parameters: unknown, rawFormData: unknown): number => {
  return calculateParameterCostWithCategory(parameters, rawFormData, undefined);
};

export const calculateParameterCostWithCategory = (
  parameters: unknown,
  rawFormData: unknown,
  customerCategory?: CustomerCategory
): number => {
  if (!Array.isArray(parameters)) return 0;

  const paramsById = new Map<string, ServiceParameterDefinition>();
  for (const param of parameters as ServiceParameterDefinition[]) {
    if (!param || typeof param !== 'object') continue;
    const id = typeof param.id === 'string' ? param.id : undefined;
    if (!id) continue;
    paramsById.set(id, param);
  }

  const multiValueParamIds = getMultiValueParamIds(parameters, rawFormData);
  const formData = normalizeFormDataToArray(rawFormData, multiValueParamIds);

  let total = 0;

  for (const entry of formData) {
    const param = paramsById.get(entry.id);
    if (!param) continue;

    const isDropdown =
      typeof param.type === 'string' &&
      (param.type === 'dropdown' || param.type === 'enum');

    const options = Array.isArray(param.options)
      ? (param.options as ServiceParameterOption[])
      : undefined;

    const hasOptionPricing =
      isDropdown &&
      !!options &&
      options.some((opt) => resolveCategoryPrice(opt, customerCategory) !== undefined);

    // When option-level pricing is configured, use that instead of parameter-level price.
    if (hasOptionPricing && options) {
      const rawValue = entry.value;
      const values: unknown[] = Array.isArray(rawValue) ? rawValue : [rawValue];

      for (const v of values) {
        if (v === null || v === undefined || v === '') continue;
        const id = typeof v === 'string' ? v : String(v);
        const option = options.find((opt) => typeof opt.id === 'string' && opt.id === id);
        if (!option) continue;
        const price = resolveCategoryPrice(option, customerCategory);
        if (price === undefined) continue;
        total += price;
      }

      continue;
    }

    const unitPrice = resolveCategoryPrice(param, customerCategory);
    if (unitPrice === undefined) continue;

    // A multiplier parameter that carries its own price is billed `price x value`
    // and is excluded from the line's global multiplier below — otherwise the
    // hours would scale every other parameter too. Mirrors
    // calculateParameterCostWithCategory in the backend's service-pricing.util.ts,
    // which is the source of truth; the canvas has to agree with it or the price
    // shown while building a job differs from the one the SOW bills.
    if (param.isPriceMultiplier === true && entry.id !== RUN_COUNT_PARAM_ID) {
      const qty = resolveQty(entry.value);
      if (qty === undefined || qty === 0) continue;
      total += unitPrice * qty;
      continue;
    }

    // Fallback: original parameter-level pricing behavior.
    const count = countValue(entry.value, multiValueParamIds.has(entry.id));
    total += unitPrice * count;
  }

  return total;
};

const resolveQty = (rawValue: unknown): number | undefined => {
  if (Array.isArray(rawValue)) {
    let sum = 0, hasAny = false;
    for (const v of rawValue) {
      const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
      if (!Number.isFinite(n)) continue;
      hasAny = true;
      sum += n;
    }
    return hasAny ? sum : undefined;
  }
  const n =
    typeof rawValue === 'number' ? rawValue
    : typeof rawValue === 'string' && rawValue.trim() !== '' ? Number(rawValue)
    : NaN;
  return Number.isFinite(n) ? n : undefined;
};

const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * A `YYYY-MM-DD` string as UTC midnight in ms, or undefined. UTC deliberately: the
 * difference between two of these has to be a whole number of days on both sides of
 * the wire and across a DST boundary, and the backend twin parses the same way.
 */
const dateOnlyToUtcMs = (value: unknown): number | undefined => {
  if (typeof value !== 'string') return undefined;
  const m = DATE_ONLY_RE.exec(value.trim());
  if (!m) return undefined;
  const ms = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isFinite(ms) ? ms : undefined;
};

/**
 * Whole weeks from start to end, any partial week rounded up, never below one.
 * Undefined when either date is missing or malformed, or the end precedes the start.
 * Twin of equipmentWeeks in damplab-backend/src/pricing/service-pricing.util.ts.
 */
export const equipmentWeeks = (start: unknown, end: unknown): number | undefined => {
  const s = dateOnlyToUtcMs(start);
  const e = dateOnlyToUtcMs(end);
  if (s === undefined || e === undefined) return undefined;
  const days = Math.round((e - s) / 86400000);
  if (days < 0) return undefined;
  return Math.max(1, Math.ceil(days / 7));
};

/**
 * The estimate multiplier for an equipment-use operation: projected hours per week
 * times weeks in the window. Undefined when the node is not an equipment one, or its
 * window/hours are incomplete — the submission validator blocks those, not the pricer.
 * Twin of equipmentFactor in damplab-backend/src/pricing/service-pricing.util.ts.
 */
export const equipmentFactor = (rawFormData: unknown): number | undefined => {
  const formData = normalizeFormDataToArray(rawFormData, new Set<string>());
  const byId = new Map(formData.map((entry) => [entry.id, entry.value]));
  const weeks = equipmentWeeks(byId.get(EQUIPMENT_START_PARAM_ID), byId.get(EQUIPMENT_END_PARAM_ID));
  if (weeks === undefined) return undefined;
  const hours = resolveQty(byId.get(EQUIPMENT_HOURS_PER_WEEK_PARAM_ID));
  if (hours === undefined || !(hours > 0)) return undefined;
  return hours * weeks;
};

/** Everything `equipmentLineDescription` appends, so it can also be recognised. */
const EQUIPMENT_DESCRIPTION_SUFFIX_RE = / — \d+(?:\.\d+)? hrs\/wk x \d+ wks \(estimate; billed on actual hours\)$/;

/**
 * Whether a SOW/invoice line describes equipment time.
 * Twin of `isEquipmentLineDescription` in
 * damplab-backend/src/pricing/service-pricing.util.ts — must stay in sync.
 */
export const isEquipmentLineDescription = (description: string | null | undefined): boolean => {
  return EQUIPMENT_DESCRIPTION_SUFFIX_RE.test(String(description ?? ''));
};

/** The shape both halves of the split need: a description to classify by and a cost to sum. */
export interface CostLineLike {
  description?: string | null;
  cost?: number | null;
}

/**
 * THE split between what a SOW contracts for and what it merely estimates.
 * Twin of `splitContractedLines` in
 * damplab-backend/src/pricing/service-pricing.util.ts — must stay in sync.
 */
export const splitContractedLines = <T extends CostLineLike>(lines: readonly T[] | null | undefined): { contracted: T[]; equipment: T[] } => {
  const contracted: T[] = [];
  const equipment: T[] = [];
  for (const line of lines ?? []) {
    (isEquipmentLineDescription(line?.description) ? equipment : contracted).push(line);
  }
  return { contracted, equipment };
};

/**
 * Σ cost, rounded to cents so a float sum cannot put noise into a stored total.
 * Twin of `sumLineCosts` in damplab-backend/src/pricing/service-pricing.util.ts —
 * must stay in sync.
 */
export const sumLineCosts = (lines: readonly CostLineLike[] | null | undefined): number => {
  const total = (lines ?? []).reduce((sum, line) => sum + (Number(line?.cost) || 0), 0);
  return Math.round(total * 100) / 100;
};

const getMultiplier = (
  parameters: unknown,
  rawFormData: unknown,
  opts?: { skipSelfPriced?: boolean; customerCategory?: CustomerCategory }
): number => {
  const multiValueParamIds = getMultiValueParamIds(parameters, rawFormData);
  const formData = normalizeFormDataToArray(rawFormData, multiValueParamIds);
  const formDataMap = new Map(formData.map((entry) => [entry.id, entry.value]));

  let multiplier = 1;

  // Universal run count: read directly from formData so it works even when parameter
  // definitions are unavailable (e.g. after loading a submitted job from the backend,
  // where `parameters` is stripped before storage).
  const runCountRaw = formDataMap.get(RUN_COUNT_PARAM_ID);
  if (runCountRaw !== null && runCountRaw !== undefined) {
    const qty = resolveQty(runCountRaw);
    if (qty !== undefined) multiplier *= qty;
  }

  // Equipment use, also read straight from formData. Stacks with the run count:
  // 2 runs of a 40-hour booking bills 80 hours.
  const equipmentQty = equipmentFactor(rawFormData);
  if (equipmentQty !== undefined) multiplier *= equipmentQty;

  // Additional isPriceMultiplier params from service parameter definitions.
  // RUN_COUNT_PARAM_ID is excluded here (already handled above) to prevent double-counting.
  if (Array.isArray(parameters)) {
    for (const param of parameters as ServiceParameterDefinition[]) {
      if (!param || typeof param !== 'object') continue;
      if (param.isPriceMultiplier !== true) continue;
      const id = typeof param.id === 'string' ? param.id : undefined;
      if (!id || id === RUN_COUNT_PARAM_ID) continue;

      // Already billed as `price x value` in the base — see the note in
      // calculateParameterCostWithCategory above.
      if (opts?.skipSelfPriced && resolveCategoryPrice(param, opts.customerCategory) !== undefined) continue;

      const rawValue = formDataMap.get(id);
      if (rawValue === null || rawValue === undefined) continue;

      const qty = resolveQty(rawValue);
      if (qty === undefined) continue;
      multiplier *= qty;
    }
  }

  return multiplier;
};

export const calculateServiceCost = (
  service: {
    pricingMode?: unknown;
    price?: unknown;
    internalPrice?: unknown;
    externalPrice?: unknown;
    pricing?: {
      internal?: unknown;
      external?: unknown;
      externalAcademic?: unknown;
      externalMarket?: unknown;
      externalNoSalary?: unknown;
      legacy?: unknown;
    } | unknown;
    externalAcademicPrice?: unknown;
    externalMarketPrice?: unknown;
    externalNoSalaryPrice?: unknown;
    parameters?: unknown;
  } | null | undefined,
  rawFormData: unknown,
  fallbackCost?: unknown,
  customerCategory?: CustomerCategory
): number => {
  const pricingMode = normalizePricingMode(service?.pricingMode);
  let baseCost = 0;

  if (pricingMode === 'PARAMETER') {
    baseCost = calculateParameterCostWithCategory(service?.parameters, rawFormData, customerCategory);
  } else {
    const servicePrice = resolveCategoryPrice(service, customerCategory);
    if (servicePrice !== undefined) {
      baseCost = servicePrice;
    } else {
      const fallbackPrice = normalizePrice(fallbackCost);
      baseCost = fallbackPrice ?? 0;
    }
  }

  const multiplier = getMultiplier(service?.parameters, rawFormData, {
    // Only PARAMETER mode reads a parameter's own price, so only there can one
    // already have been billed into the base.
    skipSelfPriced: pricingMode === 'PARAMETER',
    customerCategory
  });
  return baseCost * (Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1);
};
