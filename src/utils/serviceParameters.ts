/**
 * `service.parameters` is the EFFECTIVE list (own + every Parameter Set's) since
 * Parameter Sets. Anything that edits an operation's parameters must start from
 * — and write back — the own list only, or it copies set parameters onto the
 * operation and freezes them there.
 */
export interface SetRef {
  id: string;
  name: string;
  parameters?: unknown;
}

export function ownParametersOf(service: unknown): any[] {
  const s = service as { ownParameters?: unknown; parameters?: unknown } | null | undefined;
  if (Array.isArray(s?.ownParameters)) return s!.ownParameters as any[];
  if (Array.isArray(s?.parameters)) return (s!.parameters as any[]).filter((p) => !p?.fromParameterSetId);
  return [];
}

/**
 * Reads `data?.parameterSets` (the shape `GET_PARAMETER_SETS` resolves to) into
 * plain `SetRef`s. Used wherever a Parameter Set picker needs `{ id, name }`
 * options, and — with `withParameters: true` — wherever effective parameters
 * need to be recomputed client-side from the chosen sets.
 */
export function setRefsFrom(data: unknown, options?: { withParameters?: boolean }): SetRef[] {
  const rows = (data as { parameterSets?: unknown } | null | undefined)?.parameterSets;
  if (!Array.isArray(rows)) return [];
  return rows.map((s: any) => ({
    id: String(s.id),
    name: String(s.name),
    ...(options?.withParameters ? { parameters: s.parameters } : {})
  }));
}

/** `parameterSetIds` resolved against a loaded set list, in the operation's own order. Display only — unresolved ids are dropped. */
export function orderedSetRefs(ids: ReadonlyArray<unknown> | null | undefined, sets: ReadonlyArray<SetRef>): SetRef[] {
  const byId = new Map(sets.map((s) => [String(s.id), s]));
  return (ids ?? []).map((id) => byId.get(String(id))).filter((s): s is SetRef => Boolean(s));
}

/**
 * The operation page holds `parameterSetIds` as ids and derives the picker's
 * value from them. Seeding refs from a set list that has not loaded would drop
 * every set on the next save.
 */
export function setRefsForIds(ids: ReadonlyArray<string>, sets: ReadonlyArray<SetRef>): SetRef[] {
  const byId = new Map(sets.map((s) => [String(s.id), s]));
  return ids.map((id) => byId.get(id) ?? { id, name: id });
}

export function idsFromSetRefs(refs: ReadonlyArray<SetRef>): string[] {
  return refs.map((ref) => ref.id);
}

export interface SetParameterRow {
  setId: string;
  setName: string;
  parameter: any;
  overriddenByOwn: boolean;
}

/** Every set parameter, by set, for the read-only footer on the parameter page. */
export function setParameterRows(parameterSetIds: ReadonlyArray<unknown> | null | undefined, sets: ReadonlyArray<SetRef>, ownParameters: ReadonlyArray<{ id?: string }>): SetParameterRow[] {
  const ownIds = new Set(ownParameters.map((p) => String(p?.id ?? '')));
  return orderedSetRefs(parameterSetIds, sets).flatMap((set) =>
    (Array.isArray(set.parameters) ? set.parameters : []).map((parameter: any) => ({
      setId: set.id,
      setName: set.name,
      parameter,
      overriddenByOwn: ownIds.has(String(parameter?.id ?? ''))
    }))
  );
}

/** The name of the set an own parameter shadows, if any — for the "overrides <Set>" row chip. */
export function overridingSetName(ownParameter: { id?: string }, parameterSetIds: ReadonlyArray<unknown> | null | undefined, sets: ReadonlyArray<SetRef>): string | undefined {
  const id = String(ownParameter?.id ?? '');
  if (!id) return undefined;
  return orderedSetRefs(parameterSetIds, sets).find((set) => (Array.isArray(set.parameters) ? set.parameters : []).some((p: any) => String(p?.id) === id))?.name;
}
