export function idFromName(name: string): string {
  return String(name ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');
}

export function makeUniqueIds<T extends { id?: string; name?: string }>(items: T[]): T[] {
  const used = new Set<string>();
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

