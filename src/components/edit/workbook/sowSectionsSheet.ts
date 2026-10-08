import { matchRows } from './matching';
import { CatalogSnapshot, PlanRow, RawSheet, RowAction, rowKey, SHEET_COLUMNS, SheetPlan } from './types';

/**
 * The `SOW Sections` sheet: one row per SOW text block. A block's name is only
 * unique inside its section, so rows are matched on sectionKey + name.
 *
 * `order` is written by the download and ignored by the upload: the create and
 * update mutations cannot set it, and it is changed by dragging in the editor.
 */
const fullName = (sectionKey: string, name: string): string => `${sectionKey} › ${name}`;

export function sowSectionsExportRows(catalog: CatalogSnapshot): Array<Array<string | number>> {
  return [[...SHEET_COLUMNS.sowSections], ...catalog.sowPresets.map((preset) => [preset.id, preset.sectionKey, preset.name.trim(), (preset.text ?? '').trim(), preset.order])];
}

export interface SowRowWork {
  existingId?: string;
  create?: { sectionKey: string; name: string; text: string };
  changes?: { name?: string; text?: string };
  before?: Record<string, unknown>;
}

export interface SowSectionsWork {
  rows: Record<string, SowRowWork>;
}

export function planSowSections(sheet: RawSheet, catalog: CatalogSnapshot): SheetPlan<SowSectionsWork> {
  const has = (column: string): boolean => sheet.columns.includes(column);
  const matches = matchRows(
    sheet.rows.map((raw) => ({ rowNumber: raw.rowNumber, id: raw.cells.id ?? '', name: (raw.cells.name ?? '') === '' ? '' : fullName(raw.cells.sectionKey ?? '', raw.cells.name) })),
    catalog.sowPresets.map((preset) => ({ id: preset.id, name: fullName(preset.sectionKey, preset.name.trim()) })),
    'SOW text block'
  );
  const rows: PlanRow[] = [];
  const work: SowSectionsWork = { rows: {} };

  sheet.rows.forEach((raw, index) => {
    const match = matches[index];
    const key = rowKey('sowSections', raw.rowNumber);
    const errors = [...match.errors];
    const warnings = [...match.warnings];
    const cell = (column: string): string => raw.cells[column] ?? '';
    const existing = match.existingId !== undefined ? catalog.sowPresets.find((preset) => preset.id === match.existingId) : undefined;
    let action: RowAction = match.action;
    const changed: string[] = [];

    if (errors.length === 0) {
      if (!existing) {
        if (!catalog.sowSectionKeys.includes(cell('sectionKey'))) errors.push(`Unknown sectionKey “${cell('sectionKey')}”.`);
        else work.rows[key] = { create: { sectionKey: cell('sectionKey'), name: cell('name'), text: cell('text') } };
      } else {
        const changes: { name?: string; text?: string } = {};
        const before: Record<string, unknown> = {};
        if (has('sectionKey') && cell('sectionKey') !== existing.sectionKey) errors.push(`sectionKey cannot be changed by an upload (it is “${existing.sectionKey}”).`);
        if (has('name') && cell('name') !== existing.name.trim()) {
          if (cell('name') === '') errors.push('Name cannot be blank.');
          else {
            changes.name = cell('name');
            before.name = existing.name;
            changed.push('name');
          }
        }
        if (has('text') && cell('text') !== (existing.text ?? '').trim()) {
          changes.text = cell('text');
          before.text = existing.text ?? '';
          changed.push('text');
        }
        if (has('order') && cell('order') !== String(existing.order)) warnings.push('order is set by dragging in the SOW section editor; the cell is ignored.');
        if (changed.length === 0) action = 'unchanged';
        else if (errors.length === 0) work.rows[key] = { existingId: existing.id, changes, before };
      }
    }

    if (errors.length > 0) action = 'skip';
    const writes = action === 'create' || action === 'update';
    rows.push({
      key, sheet: 'sowSections', rowNumber: raw.rowNumber, label: fullName(cell('sectionKey') || existing?.sectionKey || '', cell('name') || existing?.name.trim() || ''), action,
      matchedByName: match.matchedByName && action !== 'skip', changed: writes ? changed : [], errors, warnings, selectedByDefault: writes && match.selectedByDefault, needs: []
    });
  });

  return { sheet: 'sowSections', rowCount: sheet.rows.length, rows, ignoredColumns: sheet.ignoredColumns, work };
}
