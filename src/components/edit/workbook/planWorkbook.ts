import { BundlesWork, planBundles } from './bundlesSheet';
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
  return plan;
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
