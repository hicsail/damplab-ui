export type ServicePricingMode = 'SERVICE' | 'PARAMETER';
export type CustomerCategory = 'INTERNAL' | 'EXTERNAL';

interface ServiceParameterOption {
  id?: unknown;
  name?: unknown;
  price?: unknown;
  internalPrice?: unknown;
  externalPrice?: unknown;
  pricing?: { internal?: unknown; external?: unknown; legacy?: unknown } | unknown;
}

interface ServiceParameterDefinition {
  id?: unknown;
  allowMultipleValues?: boolean;
  price?: unknown;
  internalPrice?: unknown;
  externalPrice?: unknown;
  pricing?: { internal?: unknown; external?: unknown; legacy?: unknown } | unknown;
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
        price?: unknown;
        pricing?: { internal?: unknown; external?: unknown; legacy?: unknown } | unknown;
      }
    | null
    | undefined,
  category?: CustomerCategory
): number | undefined => {
  if (!input) return undefined;
  const pricing = input.pricing && typeof input.pricing === 'object' ? (input.pricing as any) : undefined;
  if (category === 'INTERNAL') {
    const p = normalizePrice(pricing?.internal ?? input.internalPrice);
    if (p !== undefined) return p;
  } else if (category === 'EXTERNAL') {
    const p = normalizePrice(pricing?.external ?? input.externalPrice);
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

    // Fallback: original parameter-level pricing behavior.
    const unitPrice = resolveCategoryPrice(param, customerCategory);
    if (unitPrice === undefined) continue;

    const count = countValue(entry.value, multiValueParamIds.has(entry.id));
    total += unitPrice * count;
  }

  return total;
};

const getMultiplier = (parameters: unknown, rawFormData: unknown): number => {
  if (!Array.isArray(parameters)) return 1;

  const multiValueParamIds = getMultiValueParamIds(parameters, rawFormData);
  const formData = normalizeFormDataToArray(rawFormData, multiValueParamIds);
  const formDataMap = new Map(formData.map((entry) => [entry.id, entry.value]));

  let multiplier = 1;

  for (const param of parameters as ServiceParameterDefinition[]) {
    if (!param || typeof param !== 'object') continue;
    if (param.isPriceMultiplier !== true) continue;
    const id = typeof param.id === 'string' ? param.id : undefined;
    if (!id) continue;

    const rawValue = formDataMap.get(id);
    if (rawValue === null || rawValue === undefined) continue;

    let qty: number | undefined;

    if (Array.isArray(rawValue)) {
      let sum = 0;
      let hasAny = false;
      for (const v of rawValue) {
        const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
        if (!Number.isFinite(n)) continue;
        hasAny = true;
        sum += n;
      }
      qty = hasAny ? sum : undefined;
    } else {
      const n =
        typeof rawValue === 'number'
          ? rawValue
          : typeof rawValue === 'string' && rawValue.trim() !== ''
          ? Number(rawValue)
          : NaN;
      qty = Number.isFinite(n) ? n : undefined;
    }

    if (qty === undefined) continue;
    multiplier *= qty;
  }

  return multiplier;
};

export const calculateServiceCost = (
  service: {
    pricingMode?: unknown;
    price?: unknown;
    internalPrice?: unknown;
    externalPrice?: unknown;
    pricing?: { internal?: unknown; external?: unknown; legacy?: unknown } | unknown;
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

  const multiplier = getMultiplier(service?.parameters, rawFormData);
  return baseCost * (Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1);
};
