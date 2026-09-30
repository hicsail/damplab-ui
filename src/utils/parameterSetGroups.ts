/**
 * Pin 9: set parameters render in a group titled with the set's name. Returns,
 * per form entry, the heading to draw above it — only on the first entry of a
 * run from one set. Definitions are the node's service parameters, which carry
 * `fromParameterSetName` for set-derived entries.
 */
export function parameterSetHeadings(
  formData: ReadonlyArray<{ id?: unknown }>,
  definitions: ReadonlyArray<{ id?: unknown; fromParameterSetName?: string | null }> | null | undefined
): Array<string | null> {
  const setOf = new Map<string, string>();
  for (const d of definitions ?? []) if (d?.fromParameterSetName) setOf.set(String(d.id), d.fromParameterSetName);
  let previous: string | null = null;
  return formData.map((entry) => {
    const current = setOf.get(String(entry?.id)) ?? null;
    const heading = current && current !== previous ? current : null;
    previous = current;
    return heading;
  });
}
