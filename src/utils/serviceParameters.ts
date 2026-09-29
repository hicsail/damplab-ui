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
