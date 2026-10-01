import { ExportField } from './exportFields';

export function formatDimension(d: { value?: number | null; unit?: string | null } | null | undefined): string {
  if (!d || d.value === null || d.value === undefined) return '';
  return !d.unit || d.unit === 'm' ? String(d.value) : `${d.value} ${d.unit}`;
}

const yesNo = (v: unknown): string => (v === true ? 'Y' : 'N');

/**
 * Every exportable inventory field, in download order. The first thirteen use
 * headers `inventoryUploadUtils`' header map reads back, so an untouched
 * download re-uploads as a no-op; the rest are informational and ignored on
 * upload. `internal` fields need internal-fields:read — the server nulls them
 * otherwise, so offering them would only produce empty columns.
 */
export function inventoryExportFields(stationName: (stationId: string) => string | undefined): ExportField<any>[] {
  const first = (row: any) => row.placements?.[0];
  return [
    { key: 'name', label: 'Name', width: 38, value: (r) => r.name },
    { key: 'type', label: 'Type', value: (r) => r.type },
    { key: 'tags', label: 'Tags', width: 30, value: (r) => (r.tags ?? []).join(', ') },
    { key: 'station', label: 'Station', width: 20, value: (r) => (first(r) ? stationName(first(r).stationId) ?? '' : '') },
    { key: 'quantity', label: 'Quantity', value: (r) => first(r)?.quantity },
    { key: 'uniqueId', label: 'Unique ID', internal: true, value: (r) => r.uniqueId },
    { key: 'modelNumber', label: 'Model #', value: (r) => r.modelNumber },
    { key: 'serialNumber', label: 'Serial #', internal: true, value: (r) => r.serialNumber },
    { key: 'hasServiceContract', label: 'Service Contract Y/N', internal: true, value: (r) => yesNo(r.hasServiceContract) },
    { key: 'serviceContractExpiration', label: 'Service Contract Expiration', internal: true, width: 26, value: (r) => (r.serviceContractExpiration ? String(r.serviceContractExpiration).slice(0, 10) : '') },
    { key: 'dimensionL', label: 'L (m)', value: (r) => formatDimension(r.dimensionL) },
    { key: 'dimensionW', label: 'W (m)', value: (r) => formatDimension(r.dimensionW) },
    { key: 'dimensionH', label: 'H (m)', value: (r) => formatDimension(r.dimensionH) },
    { key: 'description', label: 'Description', width: 40, value: (r) => r.description },
    { key: 'location', label: 'Location', value: (r) => r.location },
    { key: 'bookable', label: 'Bookable', value: (r) => yesNo(r.bookable) },
    { key: 'rateType', label: 'Rate Type', internal: true, value: (r) => r.rateType },
    { key: 'priceInternal', label: 'Internal price', internal: true, value: (r) => r.pricing?.internal },
    { key: 'priceExternalAcademic', label: 'External academic price', internal: true, value: (r) => r.pricing?.externalAcademic },
    { key: 'priceExternalMarket', label: 'External market price', internal: true, value: (r) => r.pricing?.externalMarket ?? r.pricing?.external },
    { key: 'priceExternalNoSalary', label: 'External no-salary price', internal: true, value: (r) => r.pricing?.externalNoSalary },
    { key: 'priceLegacy', label: 'Fallback price', internal: true, value: (r) => r.pricing?.legacy }
  ];
}
