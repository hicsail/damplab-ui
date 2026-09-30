export interface PaletteOptions {
  mayUseEquipment: boolean;
  showHidden: boolean;
}

type Flags = { equipmentUse?: boolean | null; hiddenFromClients?: boolean | null };

const excluded = (service: Flags, opts: PaletteOptions): boolean =>
  (!opts.mayUseEquipment && service.equipmentUse === true) || (!opts.showHidden && service.hiddenFromClients === true);

export function visiblePaletteServices<S extends Flags>(services: ReadonlyArray<S>, opts: PaletteOptions): S[] {
  return services.filter((service) => !excluded(service, opts));
}

/** A bundle is offered only if every operation in it is. Bundle services arrive as objects or ids (F1). */
export function visiblePaletteBundles<B extends { services?: ReadonlyArray<unknown> | null }>(
  bundles: ReadonlyArray<B>,
  services: ReadonlyArray<{ id: string } & Flags>,
  opts: PaletteOptions
): B[] {
  const blocked = new Set(services.filter((service) => excluded(service, opts)).map((service) => String(service.id)));
  const idOf = (entry: unknown): string => String((entry as { id?: unknown })?.id ?? entry);
  return bundles.filter((bundle) => !(bundle.services ?? []).some((entry) => blocked.has(idOf(entry))));
}

export function withoutHidden<R extends { hiddenFromClients?: boolean | null }>(rows: ReadonlyArray<R>, showHidden: boolean): R[] {
  return showHidden ? [...rows] : rows.filter((row) => row.hiddenFromClients !== true);
}

/**
 * The "Allowed connections" quick-add list on a canvas node (I1). Entries arrive as
 * either a bare id or `{ id }` (RightSidebar's `connection.id ?? connection`), same
 * shape ambiguity as a bundle's `services` (F1) — reuse the same `idOf` handling.
 */
export function visibleAllowedConnections<C>(
  connections: ReadonlyArray<C>,
  services: ReadonlyArray<{ id: string } & Flags>,
  opts: PaletteOptions
): C[] {
  const blocked = new Set(services.filter((service) => excluded(service, opts)).map((service) => String(service.id)));
  const idOf = (entry: C): string => String((entry as { id?: unknown } | null)?.id ?? entry);
  return connections.filter((connection) => !blocked.has(idOf(connection)));
}
