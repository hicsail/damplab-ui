import { formatGqlError } from '../../../utils/gqlError';
import { categoryWrites } from './operationsWorkbookSheet';
import { buildOwnerParameters } from './parameterListSheet';
import { allRows, sheetPlans, WorkbookPlan } from './planWorkbook';
import { CatalogSnapshot, isApplicable, LOG_ENTITY_TYPE, SHEET_TITLES, SheetKey } from './types';

/** The existing, gated mutations an upload calls — nothing else. Each create resolves to the new record's id. */
export interface WorkbookMutator {
  createParameterSet(input: { name: string; parameters: any[] }): Promise<string>;
  updateParameterSet(id: string, changes: { parameters: any[] }): Promise<void>;
  createService(input: Record<string, unknown>): Promise<string>;
  updateService(id: string, changes: Record<string, unknown>): Promise<void>;
  createCategory(input: { label: string; services: string[] }): Promise<string>;
  updateCategory(id: string, changes: { services: string[] }): Promise<void>;
  createBundle(input: { label: string; icon: string; services: string[] }): Promise<string>;
  updateBundle(id: string, changes: Record<string, unknown>): Promise<void>;
  createSowTextPreset(input: { sectionKey: string; name: string; text: string }): Promise<string>;
  updateSowTextPreset(id: string, changes: { name?: string; text?: string }): Promise<void>;
  createUploadLog(input: Record<string, unknown>): Promise<void>;
}

export interface SheetSummary {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
}

export interface ApplySummary {
  /** One entry per sheet something was applied from — the sheets an upload log was written for. */
  sheets: Partial<Record<SheetKey, SheetSummary>>;
  /** Why a ticked row was not applied, by row key. */
  rowErrors: Record<string, string>;
  /** Failures that belong to no row: a category write, an upload log. */
  errors: string[];
}

export interface ApplyMeta {
  fileName: string;
  uploaderName: string;
  uploaderSub?: string;
  onProgress?: (done: number, total: number) => void;
}

interface Snapshot {
  itemId: string;
  action: 'CREATE' | 'UPDATE';
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
}

/**
 * Applies the ticked rows through the mutator, in dependency order:
 *
 *   parameter sets with their parameters → operations → operations' own
 *   parameters → categories → "hide" rows → bundles → SOW text blocks
 *
 * then writes one upload log per sheet something was applied from. A failure
 * stops only what depends on it: every other row carries on, and a row whose
 * dependency was not created gets an error of its own, never a silent skip.
 * Nothing is ever deleted.
 */
export async function applyWorkbook(plan: WorkbookPlan, ticked: ReadonlySet<string>, catalog: CatalogSnapshot, mutator: WorkbookMutator, meta: ApplyMeta): Promise<ApplySummary> {
  const rowsByKey = new Map(allRows(plan).map((row) => [row.key, row] as const));
  const wanted = (key: string): boolean => {
    const row = rowsByKey.get(key);
    return row !== undefined && ticked.has(key) && isApplicable(row);
  };
  const total = [...rowsByKey.keys()].filter(wanted).length;
  const done = new Set<string>();
  const rowErrors: Record<string, string> = {};
  const errors: string[] = [];
  const snapshots: Record<SheetKey, Snapshot[]> = { operations: [], parameterList: [], bundles: [], sowSections: [] };
  let finished = 0;

  /** Records the outcome of the rows one write covered. */
  const settle = (keys: string[], error?: unknown): void => {
    for (const key of keys) {
      if (error === undefined) done.add(key);
      else rowErrors[key] = typeof error === 'string' ? error : formatGqlError(error);
    }
    finished += keys.length;
    meta.onProgress?.(finished, total);
  };

  /** False — with the row marked failed — when something the row needs was not created. */
  const ready = (key: string): boolean => {
    const unmet = rowsByKey.get(key)!.needs.find((need) => !need.anyOf.some((provider) => done.has(provider)));
    if (!unmet) return true;
    settle([key], `${unmet.what.charAt(0).toUpperCase()}${unmet.what.slice(1)} was not created.`);
    return false;
  };

  const owners = plan.parameterList?.work.owners ?? [];
  const setIdByName = new Map(catalog.sets.map((set) => [set.name.trim(), set.id] as const));

  // 1. Parameter sets, each with its whole parameter list.
  for (const owner of owners) {
    if (owner.kind !== 'set') continue;
    const keys = owner.entries.map((entry) => entry.rowKey).filter(wanted);
    if (keys.length === 0) continue;
    const parameters = buildOwnerParameters(owner, new Set(keys));
    try {
      let id = owner.existingId;
      if (id) await mutator.updateParameterSet(id, { parameters });
      else {
        id = await mutator.createParameterSet({ name: owner.name, parameters });
        setIdByName.set(owner.name, id);
      }
      snapshots.parameterList.push({ itemId: id, action: owner.existingId ? 'UPDATE' : 'CREATE', before: owner.existingId ? { parameters: owner.stored } : undefined, after: { parameters } });
      settle(keys);
    } catch (error) {
      settle(keys, error);
    }
  }

  // 2. Operations.
  const operationIdByRowKey = new Map<string, string>();
  const moves: Array<{ operationId: string; label: string }> = [];
  for (const row of plan.operations?.rows ?? []) {
    if (row.action === 'hide' || !wanted(row.key) || !ready(row.key)) continue;
    const item = plan.operations!.work.rows[row.key];
    const fields: Record<string, unknown> = { ...item.fields };
    if (item.setNames) {
      const missing = item.setNames.find((name) => !setIdByName.has(name));
      if (missing !== undefined) {
        settle([row.key], `Parameter set “${missing}” was not created.`);
        continue;
      }
      fields.parameterSetIds = item.setNames.map((name) => setIdByName.get(name)!);
    }
    try {
      let id = item.existingId;
      if (id) {
        if (Object.keys(fields).length > 0) await mutator.updateService(id, fields);
      } else {
        id = await mutator.createService(fields);
      }
      operationIdByRowKey.set(row.key, id);
      if (item.category !== undefined) moves.push({ operationId: id, label: item.category });
      snapshots.operations.push({ itemId: id, action: item.existingId ? 'UPDATE' : 'CREATE', before: item.existingId ? item.before : undefined, after: fields });
      settle([row.key]);
    } catch (error) {
      settle([row.key], error);
    }
  }

  // 3. Operations' own parameters — after step 2, so an operation this upload created exists.
  for (const owner of owners) {
    if (owner.kind !== 'operation') continue;
    const keys = owner.entries.map((entry) => entry.rowKey).filter(wanted).filter(ready);
    if (keys.length === 0) continue;
    const id = owner.existingId ?? (owner.operationRowKey !== undefined ? operationIdByRowKey.get(owner.operationRowKey) : undefined);
    if (!id) {
      settle(keys, `Operation “${owner.name}” was not created.`);
      continue;
    }
    const parameters = buildOwnerParameters(owner, new Set(keys));
    try {
      await mutator.updateService(id, { parameters });
      snapshots.parameterList.push({ itemId: id, action: 'UPDATE', before: { parameters: owner.stored }, after: { parameters } });
      settle(keys);
    } catch (error) {
      settle(keys, error);
    }
  }

  // 4. Categories — one write per category whose list changed, after the creates so new ids exist.
  const writes = categoryWrites(catalog.categories, moves);
  for (const create of writes.creates) {
    try {
      const id = await mutator.createCategory(create);
      snapshots.operations.push({ itemId: id, action: 'CREATE', after: { label: create.label, services: create.services } });
    } catch (error) {
      errors.push(`Category “${create.label}”: ${formatGqlError(error)}`);
    }
  }
  for (const update of writes.updates) {
    try {
      await mutator.updateCategory(update.id, { services: update.services });
      const before = catalog.categories.find((category) => category.id === update.id)?.serviceIds ?? [];
      snapshots.operations.push({ itemId: update.id, action: 'UPDATE', before: { services: before }, after: { services: update.services } });
    } catch (error) {
      errors.push(`Category “${update.label}”: ${formatGqlError(error)}`);
    }
  }

  // 5. "Hide operations not in this sheet from clients" — only ever sets the flag.
  for (const [key, hide] of Object.entries(plan.operations?.work.hides ?? {})) {
    if (!wanted(key)) continue;
    try {
      await mutator.updateService(hide.id, { hiddenFromClients: true });
      snapshots.operations.push({ itemId: hide.id, action: 'UPDATE', before: { hiddenFromClients: false }, after: { hiddenFromClients: true } });
      settle([key]);
    } catch (error) {
      settle([key], error);
    }
  }

  // 6. Bundles.
  for (const row of plan.bundles?.rows ?? []) {
    if (!wanted(row.key) || !ready(row.key)) continue;
    const item = plan.bundles!.work.bundles[row.key];
    const changes: Record<string, unknown> = {};
    if (item.changes.label !== undefined) changes.label = item.changes.label;
    if (item.changes.icon !== undefined) changes.icon = item.changes.icon;
    if (item.changes.steps) {
      const ids = item.changes.steps.map((step) => step.id ?? (step.rowKey !== undefined ? operationIdByRowKey.get(step.rowKey) : undefined));
      const missing = item.changes.steps.find((_step, index) => ids[index] === undefined);
      if (missing) {
        settle([row.key], `Operation “${missing.name}” was not created.`);
        continue;
      }
      changes.services = ids as string[];
    }
    try {
      let id = item.existingId;
      if (id) await mutator.updateBundle(id, changes);
      else id = await mutator.createBundle({ label: item.label, icon: (changes.icon as string | undefined) ?? '', services: (changes.services as string[] | undefined) ?? [] });
      snapshots.bundles.push({ itemId: id, action: item.existingId ? 'UPDATE' : 'CREATE', before: item.existingId ? item.before : undefined, after: changes });
      settle([row.key]);
    } catch (error) {
      settle([row.key], error);
    }
  }

  // 7. SOW text blocks.
  for (const row of plan.sowSections?.rows ?? []) {
    if (!wanted(row.key)) continue;
    const item = plan.sowSections!.work.rows[row.key];
    try {
      if (item.existingId) {
        await mutator.updateSowTextPreset(item.existingId, item.changes ?? {});
        snapshots.sowSections.push({ itemId: item.existingId, action: 'UPDATE', before: item.before, after: item.changes });
      } else {
        const id = await mutator.createSowTextPreset(item.create!);
        snapshots.sowSections.push({ itemId: id, action: 'CREATE', after: item.create });
      }
      settle([row.key]);
    } catch (error) {
      settle([row.key], error);
    }
  }

  // 8. One upload log per sheet something was applied from.
  const sheets: Partial<Record<SheetKey, SheetSummary>> = {};
  for (const sheet of sheetPlans(plan)) {
    if (!sheet.rows.some((row) => wanted(row.key))) continue;
    const applied = sheet.rows.filter((row) => done.has(row.key));
    const created = applied.filter((row) => row.action === 'create').length;
    const failed = sheet.rows.filter((row) => row.key in rowErrors).length;
    const summary: SheetSummary = { created, updated: applied.length - created, failed, skipped: sheet.rows.length - applied.length - failed };
    sheets[sheet.sheet] = summary;
    try {
      await mutator.createUploadLog({
        entityType: LOG_ENTITY_TYPE[sheet.sheet],
        uploaderName: meta.uploaderName,
        uploaderSub: meta.uploaderSub,
        fileName: meta.fileName,
        rowCount: sheet.rowCount,
        createdCount: summary.created,
        updatedCount: summary.updated,
        skippedCount: summary.skipped,
        failedCount: summary.failed,
        affectedItemIds: [...new Set(snapshots[sheet.sheet].map((snapshot) => snapshot.itemId))],
        fieldSnapshots: snapshots[sheet.sheet]
      });
    } catch (error) {
      // The rows were applied; only the audit record is missing. Say so rather than report a clean import.
      errors.push(`The upload history record for ${SHEET_TITLES[sheet.sheet]} could not be saved: ${formatGqlError(error)}`);
    }
  }

  return { sheets, rowErrors, errors };
}

/** The one-line result shown after an import. */
export function summaryText(summary: ApplySummary): string {
  const clauses = (Object.keys(summary.sheets) as SheetKey[]).map((sheet) => {
    const s = summary.sheets[sheet]!;
    return `${SHEET_TITLES[sheet]}: ${s.created} created, ${s.updated} updated, ${s.skipped} skipped${s.failed > 0 ? `, ${s.failed} failed` : ''}.`;
  });
  if (clauses.length === 0) return 'Import complete — nothing was applied.';
  return ['Import complete —', ...clauses, ...summary.errors].join(' ');
}
