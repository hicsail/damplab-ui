import { EQUIPMENT_PARAM_IDS, RUN_COUNT_PARAM_ID } from './servicePricing';

/** Mirrors damplab-backend ParameterSnapshotEntry. */
export interface ParameterSnapshotEntry {
  id: string;
  name: string;
  type?: string | null;
  displayValue: string;
}

/** Ids the UI injects into formData that no service lists; the cards name these themselves. */
const RESERVED_PARAM_IDS = new Set<string>([RUN_COUNT_PARAM_ID, ...EQUIPMENT_PARAM_IDS]);

/**
 * The snapshot entry to show for a saved value whose parameter is no longer in
 * the live service (renamed, removed, or the whole service deleted). Null when
 * the live definition exists — the card renders that as before — or for a
 * reserved id, or when the node has no snapshot for it.
 */
export function snapshotFallback(node: { parameterSnapshot?: ParameterSnapshotEntry[] | null } | null | undefined, entryId: string, paramDef: unknown): ParameterSnapshotEntry | null {
  if (paramDef) return null;
  if (RESERVED_PARAM_IDS.has(entryId)) return null;
  const entries = Array.isArray(node?.parameterSnapshot) ? node!.parameterSnapshot! : [];
  return entries.find((e) => e && e.id === entryId) ?? null;
}
