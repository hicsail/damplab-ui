export type ServicePricingMode = 'SERVICE' | 'PARAMETER';

interface ServiceParameterDefinition {
  id?: unknown;
  allowMultipleValues?: boolean;
  price?: unknown;
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
      const isMultiValue = entry.allowMultipleValues === true || Array.isArray(entry.value);
      if (!isMultiValue) continue;
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

const buildParameterPriceMap = (parameters: unknown): Map<string, number> => {
  const map = new Map<string, number>();
  if (!Array.isArray(parameters)) return map;

  for (const param of parameters as ServiceParameterDefinition[]) {
    if (!param || typeof param !== 'object') continue;
    const id = typeof param.id === 'string' ? param.id : undefined;
    if (!id) continue;
    const price = normalizePrice(param.price);
    if (price !== undefined) {
      map.set(id, price);
    }
  }

  return map;
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
  const priceMap = buildParameterPriceMap(parameters);
  if (priceMap.size === 0) return 0;

  const multiValueParamIds = getMultiValueParamIds(parameters, rawFormData);
  const formData = normalizeFormDataToArray(rawFormData, multiValueParamIds);
  const formDataMap = new Map(formData.map((entry) => [entry.id, entry.value]));

  let total = 0;
  for (const [id, unitPrice] of priceMap) {
    const value = formDataMap.get(id);
    const count = countValue(value, multiValueParamIds.has(id));
    total += unitPrice * count;
  }

  return total;
};

export interface ParameterLineItem {
  id: string;
  name: string;
  count: number;
  unitPrice: number;
  total: number;
}

export const calculateParameterLineItems = (
  parameters: unknown,
  rawFormData: unknown
): ParameterLineItem[] => {
  const priceMap = buildParameterPriceMap(parameters);
  if (priceMap.size === 0) return [];

  const multiValueParamIds = getMultiValueParamIds(parameters, rawFormData);
  const formData = normalizeFormDataToArray(rawFormData, multiValueParamIds);
  const formDataMap = new Map(formData.map((entry) => [entry.id, entry.value]));

  const lineItems: ParameterLineItem[] = [];

  if (!Array.isArray(parameters)) return lineItems;

  for (const param of parameters as ServiceParameterDefinition[]) {
    if (!param || typeof param !== 'object') continue;
    const id = typeof param.id === 'string' ? param.id : undefined;
    if (!id) continue;

    const unitPrice = priceMap.get(id);
    if (unitPrice === undefined) continue;

    const value = formDataMap.get(id);
    const count = countValue(value, multiValueParamIds.has(id));
    if (count === 0) continue;

    const paramWithName = param as any;
    const name = typeof paramWithName.name === 'string' ? paramWithName.name : id;
    const total = unitPrice * count;

    lineItems.push({
      id,
      name,
      count,
      unitPrice,
      total,
    });
  }

  return lineItems;
};

export const calculateServiceCost = (
  service: { pricingMode?: unknown; price?: unknown; parameters?: unknown } | null | undefined,
  rawFormData: unknown,
  fallbackCost?: unknown
): number => {
  const pricingMode = normalizePricingMode(service?.pricingMode);
  if (pricingMode === 'PARAMETER') {
    const parameterPriceMap = buildParameterPriceMap(service?.parameters);
    if (parameterPriceMap.size > 0) {
      return calculateParameterCost(service?.parameters, rawFormData);
    }
    // If there are no priced parameters, fall through to service-level or fallback pricing.
  }

  const servicePrice = normalizePrice(service?.price);
  if (servicePrice !== undefined) {
    return servicePrice;
  }

  const fallbackPrice = normalizePrice(fallbackCost);
  return fallbackPrice ?? 0;
};
