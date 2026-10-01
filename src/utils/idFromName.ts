export function idFromName(name: string): string {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

/**
 * De-duplicates each item's id, deriving a blank one from `name`. `reserved`
 * seeds the used-id set up front (e.g. ids that must not be reassigned to a
 * later item) without those ids' own entries passing through this function —
 * callers that don't need that keep the default empty set, so behaviour is
 * unchanged from before `reserved` existed.
 */
export function makeUniqueIds<T extends { id?: string; name?: string }>(items: T[], reserved: Iterable<string> = []): T[] {
  const used = new Set<string>(reserved);
  return items.map((item) => {
    const base = item.id?.trim() || idFromName(item.name ?? '');
    if (!base) return item;

    let next = base;
    let i = 2;
    while (used.has(next)) {
      next = `${base}_${i}`;
      i += 1;
    }
    used.add(next);
    if (item.id === next) return item;
    return { ...item, id: next };
  });
}

