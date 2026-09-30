import * as XLSX from 'xlsx';
import { ExportCell, ExportField, worksheetFor } from './exportFields';

export const OPERATION_COLUMNS = [
  'id', 'name', 'description', 'serviceCategoryNumber', 'serviceCategoryName', 'unit', 'pricingMode',
  'pricingInternal', 'pricingExternalAcademic', 'pricingExternalMarket', 'pricingExternalNoSalary', 'pricingLegacy',
  'hiddenFromClients', 'parameterSets'
] as const;
export type OperationColumn = (typeof OPERATION_COLUMNS)[number];
export type PricingColumn = 'pricingInternal' | 'pricingExternalAcademic' | 'pricingExternalMarket' | 'pricingExternalNoSalary' | 'pricingLegacy';
export const PRICING_COLUMNS: readonly PricingColumn[] = ['pricingInternal', 'pricingExternalAcademic', 'pricingExternalMarket', 'pricingExternalNoSalary', 'pricingLegacy'];

export const OPERATIONS_SHEET_NAME = 'Operations';
export const PARAMETERS_SHEET_NAME = 'Parameters';
export const OPERATIONS_FILE_NAME = 'damplab-operations.xlsx';
export const PARAMETER_SHEET_COLUMNS = ['operationId', 'operationName', 'parameterId', 'name', 'type', 'required', 'source', 'options'] as const;

export interface OperationLike {
  id: string;
  name: string;
  description?: string | null;
  serviceCategoryNumber?: string | null;
  serviceCategoryName?: string | null;
  unit?: string | null;
  pricingMode?: string | null;
  pricing?: Record<string, number | null | undefined> | null;
  price?: number | null;
  internalPrice?: number | null;
  externalPrice?: number | null;
  externalAcademicPrice?: number | null;
  externalMarketPrice?: number | null;
  externalNoSalaryPrice?: number | null;
  hiddenFromClients?: boolean | null;
  parameterSetIds?: string[] | null;
  parameters?: any[] | null;
}

const first = (...values: Array<number | null | undefined>): number | null => {
  for (const v of values) if (v !== null && v !== undefined) return v;
  return null;
};

/** The tier each column shows, with the fallbacks the old pricing download used. */
export function tierPrice(op: OperationLike, column: PricingColumn): number | null {
  const p = op.pricing ?? {};
  switch (column) {
    case 'pricingInternal': return first(p.internal, op.internalPrice);
    case 'pricingExternalAcademic': return first(p.externalAcademic, op.externalAcademicPrice);
    case 'pricingExternalMarket': return first(p.externalMarket, p.external, op.externalMarketPrice, op.externalPrice);
    case 'pricingExternalNoSalary': return first(p.externalNoSalary, op.externalNoSalaryPrice);
    case 'pricingLegacy': return first(p.legacy, op.price);
  }
}

export function operationExportFields(setNameById: ReadonlyMap<string, string>): ExportField<OperationLike>[] {
  return OPERATION_COLUMNS.map((column): ExportField<OperationLike> => {
    const base = { key: column, label: column };
    switch (column) {
      case 'pricingInternal':
      case 'pricingExternalAcademic':
      case 'pricingExternalMarket':
      case 'pricingExternalNoSalary':
      case 'pricingLegacy':
        return { ...base, internal: true, value: (op) => tierPrice(op, column) };
      case 'pricingMode': return { ...base, value: (op) => op.pricingMode ?? 'SERVICE' };
      case 'hiddenFromClients': return { ...base, value: (op) => (op.hiddenFromClients ? 'Y' : 'N') };
      case 'parameterSets': return { ...base, width: 30, value: (op) => (op.parameterSetIds ?? []).map((id) => setNameById.get(id) ?? id).join('; ') };
      case 'name': return { ...base, width: 38, value: (op) => op.name };
      case 'description': return { ...base, width: 40, value: (op) => op.description };
      default: return { ...base, width: column === 'id' ? 26 : undefined, value: (op) => (op as any)[column] };
    }
  });
}

/** One row per EFFECTIVE parameter. Read-only: the upload ignores this sheet. */
export function parameterSheetRows(ops: ReadonlyArray<OperationLike>): ExportCell[][] {
  const rows: ExportCell[][] = [[...PARAMETER_SHEET_COLUMNS]];
  for (const op of ops) {
    for (const p of op.parameters ?? []) {
      rows.push([
        op.id, op.name, String(p?.id ?? ''), String(p?.name ?? ''), String(p?.type ?? ''),
        p?.required ? 'Y' : 'N',
        p?.fromParameterSetName ?? 'own',
        Array.isArray(p?.options) ? p.options.map((o: any) => String(o?.name ?? o)).join('; ') : ''
      ]);
    }
  }
  return rows;
}

export function buildOperationsWorkbook(ops: ReadonlyArray<OperationLike>, fields: ReadonlyArray<ExportField<OperationLike>>, selectedKeys: ReadonlySet<string>): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, worksheetFor(ops, fields, selectedKeys), OPERATIONS_SHEET_NAME);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(parameterSheetRows(ops)), PARAMETERS_SHEET_NAME);
  return wb;
}
