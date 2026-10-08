import { BundlesWork, planBundles } from './bundlesSheet';
import { findIdClashes } from './parameterIdClashes';
import { newOperationRowKeys, OperationsWork, planOperations } from './operationsWorkbookSheet';
import { newSetRowKeys, ParameterListWork, planParameterList } from './parameterListSheet';
import { planSowSections, SowSectionsWork } from './sowSectionsSheet';
import { CatalogSnapshot, isApplicable, PlanRow, RawWorkbook, SHEET_KEYS, SheetPlan } from './types';

export interface WorkbookPlan {
  operations?: SheetPlan<OperationsWork>;
  parameterList?: SheetPlan<ParameterListWork>;
  bundles?: SheetPlan<BundlesWork>;
  sowSections?: SheetPlan<SowSectionsWork>;
  ignoredSheets: string[];
}

export interface PlanOptions {
  /** Whether the caller holds internal-fields:read: without it the Operations pricing columns are ignored. */
  allowPricing: boolean;
  /** "Hide operations not in this sheet from clients". */
  hideMissing: boolean;
}

/**
 * Classifies every row of every recognised sheet. Sheets reference each other
 * by name — an operation names a set this upload creates, a bundle names an
 * operation this upload creates — so each planner is told what the others
 * create, and records it as a `need` on the row.
 */
export function planWorkbook(raw: RawWorkbook, catalog: CatalogSnapshot, options: PlanOptions): WorkbookPlan {
  const newSetRows = newSetRowKeys(raw.sheets.parameterList, catalog);
  const newOperationRows = newOperationRowKeys(raw.sheets.operations, catalog);
  const plan: WorkbookPlan = { ignoredSheets: raw.ignoredSheets };
  if (raw.sheets.operations) plan.operations = planOperations(raw.sheets.operations, catalog, { newSetRows, allowPricing: options.allowPricing, hideMissing: options.hideMissing });
  if (raw.sheets.parameterList) plan.parameterList = planParameterList(raw.sheets.parameterList, catalog, { newOperationRows });
  if (raw.sheets.bundles) plan.bundles = planBundles(raw.sheets.bundles, catalog, { newOperationRows });
  if (raw.sheets.sowSections) plan.sowSections = planSowSections(raw.sheets.sowSections, catalog);
  refuseIdClashes(plan, catalog);
  return plan;
}

/** Rule 20, across sheets: a set parameter this upload creates must not take an id its using operations already have. */
function refuseIdClashes(plan: WorkbookPlan, catalog: CatalogSnapshot): void {
  const rows = allRows(plan);
  const clashes = findIdClashes(plan, catalog, new Set(rows.filter((row) => row.errors.length === 0 && (row.action === 'create' || row.action === 'update')).map((row) => row.key)));
  for (const row of rows) {
    if (!(row.key in clashes)) continue;
    row.errors.push(clashes[row.key]);
    row.action = 'skip';
    row.changed = [];
    row.selectedByDefault = false;
    row.needs = [];
    row.matchedByName = false;
  }
}

/** The planned sheets, in tab order. */
export function sheetPlans(plan: WorkbookPlan): Array<SheetPlan<unknown>> {
  return SHEET_KEYS.map((key) => plan[key] as SheetPlan<unknown> | undefined).filter((sheet): sheet is SheetPlan<unknown> => sheet !== undefined);
}

export function allRows(plan: WorkbookPlan): PlanRow[] {
  return sheetPlans(plan).flatMap((sheet) => sheet.rows);
}

/** The rows that will be applied: applicable, and ticked — by the user's override when there is one, else by default. */
export function tickedKeys(plan: WorkbookPlan, overrides: Readonly<Record<string, boolean>>): Set<string> {
  return new Set(
    allRows(plan)
      .filter((row) => isApplicable(row) && (overrides[row.key] ?? row.selectedByDefault))
      .map((row) => row.key)
  );
}

/**
 * Ticked rows that cannot be applied because something they need is not being
 * created — its row is unticked, has an error, or is itself blocked. Keyed by
 * row, with the sentence to show on it. Never a silent skip.
 */
export function unmetNeeds(plan: WorkbookPlan, ticked: ReadonlySet<string>): Record<string, string> {
  const rows = allRows(plan).filter((row) => ticked.has(row.key));
  const blocked: Record<string, string> = {};
  let changed = true;
  while (changed) {
    changed = false;
    for (const row of rows) {
      if (row.key in blocked) continue;
      const unmet = row.needs.find((need) => !need.anyOf.some((provider) => ticked.has(provider) && !(provider in blocked)));
      if (!unmet) continue;
      blocked[row.key] = `${unmet.what.charAt(0).toUpperCase()}${unmet.what.slice(1)} was not created.`;
      changed = true;
    }
  }
  return blocked;
}

export function countsFor(rows: ReadonlyArray<PlanRow>, ticked: ReadonlySet<string>, blocked: Readonly<Record<string, string>>): { create: number; update: number; hide: number; skip: number } {
  const counts = { create: 0, update: 0, hide: 0, skip: 0 };
  for (const row of rows) {
    const applies = ticked.has(row.key) && !(row.key in blocked);
    if (applies && row.action === 'create') counts.create += 1;
    else if (applies && row.action === 'update') counts.update += 1;
    else if (applies && row.action === 'hide') counts.hide += 1;
    else counts.skip += 1;
  }
  return counts;
}

/**
 * Whether a plan made at Import (from a freshly loaded catalog) says the same
 * thing as the plan that was previewed: the same rows, each with the same
 * action, changed fields, errors and warnings. Only then is the import applied;
 * anything else means the catalog moved while the preview was open and the
 * person has not seen what would now happen.
 */
export function plansMatch(previewed: WorkbookPlan, fresh: WorkbookPlan): boolean {
  const signature = (plan: WorkbookPlan): string =>
    JSON.stringify(allRows(plan).map((row) => [row.key, row.action, row.changed, row.errors, row.warnings]));
  return signature(previewed) === signature(fresh);
}

/**
 * The preview grid's order: rows with errors (or blocked by something unmet),
 * then rows with warnings (whatever their action), then creates / updates / hides, then unchanged rows.
 * Sheet order within each band, so the "Row" column still reads as the sheet's.
 */
export function previewOrder(rows: ReadonlyArray<PlanRow>, blocked: Readonly<Record<string, string>>): PlanRow[] {
  const band = (row: PlanRow): number => {
    if (row.errors.length > 0 || row.key in blocked) return 0;
    if (row.warnings.length > 0) return 1;
    return row.action === 'unchanged' ? 3 : 2;
  };
  return rows.map((row, index) => ({ row, index })).sort((a, b) => band(a.row) - band(b.row) || a.index - b.index).map(({ row }) => row);
}

/** Creates, updates and hides that could be applied but are not ticked — counted so a skipped write is never invisible. */
export function untickedCounts(rows: ReadonlyArray<PlanRow>, ticked: ReadonlySet<string>): { create: number; update: number; hide: number } {
  const counts = { create: 0, update: 0, hide: 0 };
  for (const row of rows) {
    if (!isApplicable(row) || ticked.has(row.key)) continue;
    if (row.action === 'create' || row.action === 'update' || row.action === 'hide') counts[row.action] += 1;
  }
  return counts;
}

/**
 * The overrides to keep after the plan is replaced by a fresh one: only the unticks
 * (`false`) whose row is still in it. An untick on a row that still exists is the
 * person's decision and survives. A tick (`true`) is never carried over: the row it
 * was set on may now plan something else (a create that became a near-duplicate is
 * unticked by default for a reason), so it falls back to the new plan's default.
 * An override on a row that is gone has nothing to apply to.
 */
export function survivingOverrides(overrides: Readonly<Record<string, boolean>>, plan: WorkbookPlan): Record<string, boolean> {
  const keys = new Set(allRows(plan).map((row) => row.key));
  return Object.fromEntries(Object.entries(overrides).filter(([key, ticked]) => ticked === false && keys.has(key)));
}
