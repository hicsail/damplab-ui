export type ServicePricingMode = 'SERVICE' | 'PARAMETER';

interface ServiceParameterOption {
  id?: unknown;
  name?: unknown;
  price?: unknown;
}

interface ServiceParameterDefinition {
  id?: unknown;
  allowMultipleValues?: boolean;
  price?: unknown;
  type?: unknown;
  options?: ServiceParameterOption[] | unknown;
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
      options.some((opt) => normalizePrice(opt.price) !== undefined);

    // When option-level pricing is configured, use that instead of parameter-level price.
    if (hasOptionPricing && options) {
      const rawValue = entry.value;
      const values: unknown[] = Array.isArray(rawValue) ? rawValue : [rawValue];

      for (const v of values) {
        if (v === null || v === undefined || v === '') continue;
        const id = typeof v === 'string' ? v : String(v);
        const option = options.find((opt) => typeof opt.id === 'string' && opt.id === id);
        if (!option) continue;
        const price = normalizePrice(option.price);
        if (price === undefined) continue;
        total += price;
      }

      continue;
    }

    // Fallback: original parameter-level pricing behavior.
    const unitPrice = normalizePrice(param.price);
    if (unitPrice === undefined) continue;

    const count = countValue(entry.value, multiValueParamIds.has(entry.id));
    total += unitPrice * count;
  }

  return total;
};

export const calculateServiceCost = (
  service: { pricingMode?: unknown; price?: unknown; parameters?: unknown } | null | undefined,
  rawFormData: unknown,
  fallbackCost?: unknown
): number => {
  const pricingMode = normalizePricingMode(service?.pricingMode);
  if (pricingMode === 'PARAMETER') {
    return calculateParameterCost(service?.parameters, rawFormData);
  }

  const servicePrice = normalizePrice(service?.price);
  if (servicePrice !== undefined) {
    return servicePrice;
  }

  const fallbackPrice = normalizePrice(fallbackCost);
  return fallbackPrice ?? 0;
};
