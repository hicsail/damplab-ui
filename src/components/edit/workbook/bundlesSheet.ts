import { sameList } from './cells';
import { matchRows } from './matching';
import { CatalogSnapshot, Need, PlanRow, RawRow, RawSheet, RowAction, rowKey, SHEET_COLUMNS, SheetPlan } from './types';

/**
 * The `Bundles` sheet: one row per step. Rows with the same BundleName form one
 * bundle whose steps, sorted by Order, replace the stored ones. The preview
 * shows one row per bundle.
 */
export function bundlesExportRows(catalog: CatalogSnapshot): Array<Array<string | number>> {
  const rows: Array<Array<string | number>> = [[...SHEET_COLUMNS.bundles]];
  for (const bundle of catalog.bundles) {
    // A bundle with no steps still gets a row, or it would vanish from the round trip.
    if (bundle.steps.length === 0) rows.push([bundle.id, bundle.label.trim(), '', '', bundle.icon ?? '']);
    bundle.steps.forEach((step, index) => rows.push([bundle.id, bundle.label.trim(), index + 1, step.name.trim(), index === 0 ? (bundle.icon ?? '') : '']));
  }
  return rows;
}

export interface BundleStepRef {
  name: string;
  /** An existing operation's id. */
  id?: string;
  /** The Operations row that creates the operation, when it does not exist yet. */
  rowKey?: string;
}

export interface BundleWork {
  existingId?: string;
  label: string;
  changes: { label?: string; icon?: string; steps?: BundleStepRef[] };
  before: Record<string, unknown>;
}

export interface BundlesWork {
  bundles: Record<string, BundleWork>;
}

export function planBundles(sheet: RawSheet, catalog: CatalogSnapshot, ctx: { newOperationRows: ReadonlyMap<string, string> }): SheetPlan<BundlesWork> {
  const hasSteps = sheet.columns.includes('Operation');
  const hasOrder = sheet.columns.includes('Order');
  const hasIcon = sheet.columns.includes('icon');
  const rows: PlanRow[] = [];
  const work: BundlesWork = { bundles: {} };

  const groups: Array<{ name: string; rows: RawRow[] }> = [];
  for (const raw of sheet.rows) {
    const name = raw.cells.BundleName ?? '';
    if (name === '') {
      rows.push({
        key: rowKey('bundles', raw.rowNumber), sheet: 'bundles', rowNumber: raw.rowNumber, label: raw.cells.Operation ?? '', action: 'skip', matchedByName: false,
        changed: [], errors: ['A bundle row needs a BundleName.'], warnings: [], selectedByDefault: false, needs: []
      });
      continue;
    }
    const group = groups.find((g) => g.name === name);
    if (group) group.rows.push(raw);
    else groups.push({ name, rows: [raw] });
  }

  const groupErrors = groups.map((group) => {
    const errors: string[] = [];
    const firstId = group.rows.map((raw) => raw.cells.id ?? '').find((id) => id !== '') ?? '';
    for (const raw of group.rows) {
      const id = raw.cells.id ?? '';
      if (id !== '' && id !== firstId) errors.push(`Row ${raw.rowNumber}: id “${id}” does not match the bundle’s other rows (“${firstId}”).`);
    }
    return { id: firstId, errors };
  });

  const matches = matchRows(
    groups.map((group, index) => ({ rowNumber: group.rows[0].rowNumber, id: groupErrors[index].id, name: group.name })),
    catalog.bundles.map((bundle) => ({ id: bundle.id, name: bundle.label })),
    'bundle'
  );

  groups.forEach((group, index) => {
    const match = matches[index];
    const first = group.rows[0];
    const key = rowKey('bundles', first.rowNumber);
    const errors = [...groupErrors[index].errors, ...match.errors];
    const warnings = [...match.warnings];
    const needs: Need[] = [];
    const existing = match.existingId !== undefined ? catalog.bundles.find((bundle) => bundle.id === match.existingId) : undefined;
    let action: RowAction = match.action;
    const changed: string[] = [];
    const changes: BundleWork['changes'] = {};
    const before: Record<string, unknown> = {};

    if (errors.length === 0) {
      if (!existing) changes.label = group.name;
      else if (existing.label.trim() !== group.name) {
        changes.label = group.name;
        before.label = existing.label;
        changed.push('BundleName');
      }

      if (hasIcon) {
        // The first non-blank icon in the bundle's rows, so reordering rows cannot clear a stored icon.
        const icon = group.rows.map((raw) => raw.cells.icon ?? '').find((value) => value !== '') ?? '';
        if (!existing) changes.icon = icon;
        else if ((existing.icon ?? '') !== icon) {
          changes.icon = icon;
          before.icon = existing.icon ?? '';
          changed.push('icon');
        }
      } else if (!existing) {
        changes.icon = '';
      }

      if (hasSteps) {
        const stepRows = group.rows.filter((raw) => (raw.cells.Operation ?? '') !== '');
        const ordered = stepRows.map((raw, position) => {
          const text = raw.cells.Order ?? '';
          const order = hasOrder ? Number(text) : position;
          if (hasOrder && (text === '' || !Number.isFinite(order))) errors.push(`Row ${raw.rowNumber}: Order “${text}” is not a number.`);
          return { raw, order };
        });
        ordered.sort((a, b) => a.order - b.order || a.raw.rowNumber - b.raw.rowNumber);
        const steps: BundleStepRef[] = [];
        for (const { raw } of ordered) {
          const name = raw.cells.Operation;
          const found = catalog.operations.filter((operation) => operation.name.trim() === name);
          if (found.length === 1) steps.push({ name, id: found[0].id });
          else if (found.length > 1) errors.push(`Row ${raw.rowNumber}: ${found.length} operations are named “${name}”.`);
          else if (ctx.newOperationRows.has(name)) {
            const provider = ctx.newOperationRows.get(name)!;
            steps.push({ name, rowKey: provider });
            if (!needs.some((need) => need.anyOf[0] === provider)) needs.push({ what: `operation “${name}”`, anyOf: [provider] });
          } else errors.push(`Row ${raw.rowNumber}: No operation named “${name}”.`);
        }
        const same = existing !== undefined && steps.every((step) => step.id !== undefined) && sameList(steps.map((step) => step.id!), existing.steps.map((step) => step.id));
        if (!same) {
          changes.steps = steps;
          if (existing) {
            before.steps = existing.steps.map((step) => step.name.trim());
            changed.push('steps');
          }
        }
      } else if (!existing) {
        changes.steps = [];
      }

      if (existing && Object.keys(changes).length === 0) action = 'unchanged';
      else if (errors.length === 0) work.bundles[key] = { existingId: existing?.id, label: group.name, changes, before };
    }

    if (errors.length > 0) action = 'skip';
    const writes = action === 'create' || action === 'update';
    rows.push({
      key, sheet: 'bundles', rowNumber: first.rowNumber, label: group.name, action, matchedByName: match.matchedByName && action !== 'skip',
      changed: writes ? changed : [], errors, warnings, selectedByDefault: writes && match.selectedByDefault, needs: writes ? needs : []
    });
  });

  rows.sort((a, b) => (a.rowNumber ?? 0) - (b.rowNumber ?? 0));
  return { sheet: 'bundles', rowCount: sheet.rows.length, rows, ignoredColumns: sheet.ignoredColumns, work };
}
