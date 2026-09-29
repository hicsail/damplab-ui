import * as XLSX from 'xlsx';

/**
 * A downloadable column: its key (stable, for the picker), header label, whether
 * it is internal (offered only with internal-fields:read), and how to read it.
 * Used by the inventory and operations downloads so they pick fields the same way.
 */
export type ExportCell = string | number;

export interface ExportField<Row> {
  key: string;
  label: string;
  internal?: boolean;
  width?: number;
  value: (row: Row) => ExportCell | null | undefined;
}

export function offeredFields<Row>(fields: ReadonlyArray<ExportField<Row>>, canSeeInternal: boolean): ExportField<Row>[] {
  return fields.filter((field) => canSeeInternal || !field.internal);
}

export function buildExportSheet<Row>(rows: ReadonlyArray<Row>, fields: ReadonlyArray<ExportField<Row>>, selectedKeys: ReadonlySet<string>): ExportCell[][] {
  const chosen = fields.filter((field) => selectedKeys.has(field.key));
  return [
    chosen.map((field) => field.label),
    ...rows.map((row) =>
      chosen.map((field) => {
        const value = field.value(row);
        return value === null || value === undefined ? '' : value;
      })
    )
  ];
}

export function worksheetFor<Row>(rows: ReadonlyArray<Row>, fields: ReadonlyArray<ExportField<Row>>, selectedKeys: ReadonlySet<string>): XLSX.WorkSheet {
  const sheet = XLSX.utils.aoa_to_sheet(buildExportSheet(rows, fields, selectedKeys));
  sheet['!cols'] = fields.filter((field) => selectedKeys.has(field.key)).map((field) => ({ wch: field.width ?? Math.max(12, field.label.length + 2) }));
  return sheet;
}
