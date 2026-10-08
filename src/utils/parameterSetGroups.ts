import { isOtherTextEntryId, otherTextParentId } from './otherOption';

/**
 * Pin 9: set parameters render in a group titled with the set's name. Returns,
 * per form entry, the heading to draw above it — only on the first entry of a
 * run from one set. Definitions are the node's service parameters, which carry
 * `fromParameterSetName` for set-derived entries. An "Other" text entry has no
 * definition of its own; it belongs to its parameter's run, so it neither starts
 * a group nor ends the one its parameter is in.
 */
export function parameterSetHeadings(
  formData: ReadonlyArray<{ id?: unknown }>,
  definitions: ReadonlyArray<{ id?: unknown; fromParameterSetName?: string | null }> | null | undefined
): Array<string | null> {
  const setOf = new Map<string, string>();
  for (const d of definitions ?? []) if (d?.fromParameterSetName) setOf.set(String(d.id), d.fromParameterSetName);
  let previous: string | null = null;
  return formData.map((entry) => {
    const id = String(entry?.id);
    const current = setOf.get(isOtherTextEntryId(id) ? otherTextParentId(id) : id) ?? setOf.get(id) ?? null;
    const heading = current && current !== previous ? current : null;
    previous = current;
    return heading;
  });
}
