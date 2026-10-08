import type { OperationLike } from '../operationsSheet';

/**
 * The catalog workbook: one sheet per kind of record, downloaded and uploaded
 * from the Catalog Editor. Shared shapes for the reader, the four sheet
 * planners, the apply step and the writer.
 */
export type SheetKey = 'operations' | 'parameterList' | 'bundles' | 'sowSections';

/** Tab order in the downloaded file and in the preview. Apply order is different — see applyWorkbook. */
export const SHEET_KEYS: readonly SheetKey[] = ['operations', 'parameterList', 'bundles', 'sowSections'];

export const SHEET_TITLES: Record<SheetKey, string> = {
  operations: 'Operations',
  parameterList: 'Parameter List',
  bundles: 'Bundles',
  sowSections: 'SOW Sections'
};

/** The upload log each sheet writes. An operation's own parameters are logged under PARAMETER_SET with the operation's id. */
export const LOG_ENTITY_TYPE: Record<SheetKey, 'OPERATION' | 'PARAMETER_SET' | 'BUNDLE' | 'SOW_SECTION'> = {
  operations: 'OPERATION',
  parameterList: 'PARAMETER_SET',
  bundles: 'BUNDLE',
  sowSections: 'SOW_SECTION'
};

/** The hidden sheet the download's in-cell dropdowns point at. The upload skips it without reporting it. */
export const LISTS_SHEET_TITLE = 'Lists';

/** Fixed columns, in download order. Operations additionally takes parameterSet1…N. */
export const SHEET_COLUMNS: Record<SheetKey, readonly string[]> = {
  operations: [
    'id', 'serviceCategory', 'name', 'description', 'unit', 'hiddenFromClients', 'pricingMode',
    'pricingInternal', 'pricingExternalAcademic', 'pricingExternalMarket', 'pricingExternalNoSalary', 'pricingLegacy'
  ],
  parameterList: ['parameterId', 'parameterSet', 'operation', 'parameter', 'description', 'required', 'type', 'options', 'validation', 'conditionalDisplayLogic', 'allowMultiple', 'defaultValue'],
  bundles: ['id', 'BundleName', 'Order', 'Operation', 'icon'],
  sowSections: ['id', 'sectionKey', 'name', 'text', 'order']
};

export interface RawRow {
  /** 1-based spreadsheet row; the header is row 1. */
  rowNumber: number;
  /** Trimmed text by canonical column name. A column absent from the sheet is an absent key. */
  cells: Record<string, string>;
}

export interface RawSheet {
  title: string;
  /** Canonical names of the recognised columns, in sheet order. */
  columns: string[];
  /** Headers, as written, that are not a column of this sheet. */
  ignoredColumns: string[];
  rows: RawRow[];
}

export interface RawWorkbook {
  sheets: Partial<Record<SheetKey, RawSheet>>;
  ignoredSheets: string[];
}

/** An operation as GET_SERVICES returns it; `ownParameters` is the list stored on the operation itself. */
export type CatalogOperation = OperationLike & { ownParameters: any[]; parameterSetIds: string[] };
export interface CatalogSet { id: string; name: string; parameters: any[] }
export interface CatalogCategory { id: string; label: string; serviceIds: string[] }
export interface CatalogBundle { id: string; label: string; icon: string; steps: Array<{ id: string; name: string }> }
export interface CatalogSowPreset { id: string; sectionKey: string; name: string; text: string; order: number }

/** Everything the workbook reads from the catalog, loaded once per download or upload. */
export interface CatalogSnapshot {
  operations: CatalogOperation[];
  sets: CatalogSet[];
  categories: CatalogCategory[];
  bundles: CatalogBundle[];
  sowPresets: CatalogSowPreset[];
  sowSectionKeys: string[];
}

/** `unchanged`: the row matched a record and every present cell equals what the download writes for it. */
export type RowAction = 'create' | 'update' | 'unchanged' | 'hide' | 'skip';

/** Something this row needs another row of this upload to have created. Met when any of `anyOf` was applied. */
export interface Need {
  /** e.g. `parameter set “Buffers”` — completes the sentence "<What> was not created." */
  what: string;
  anyOf: string[];
}

export interface PlanRow {
  key: string;
  sheet: SheetKey;
  /** Null for a row the upload adds itself (a "hide" row). */
  rowNumber: number | null;
  label: string;
  action: RowAction;
  matchedByName: boolean;
  /** Columns whose cell differs from the stored record. */
  changed: string[];
  errors: string[];
  warnings: string[];
  selectedByDefault: boolean;
  needs: Need[];
}

export interface SheetPlan<W> {
  sheet: SheetKey;
  /** Data rows in the uploaded sheet (not counting rows the upload adds). */
  rowCount: number;
  rows: PlanRow[];
  ignoredColumns: string[];
  /** What the apply step needs to write this sheet's ticked rows. */
  work: W;
}

export const rowKey = (sheet: SheetKey, rowNumber: number): string => `${sheet}:${rowNumber}`;

export const isApplicable = (row: PlanRow): boolean => (row.action === 'create' || row.action === 'update' || row.action === 'hide') && row.errors.length === 0;
