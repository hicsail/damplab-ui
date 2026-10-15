type Connection = string | { id?: unknown } | null | undefined;

interface ServiceWithConnections {
  id: string;
  allowedConnections?: ReadonlyArray<Connection> | null;
}

const idOf = (entry: Connection): string => String(typeof entry === 'object' && entry !== null ? entry.id : entry);

/**
 * The operations suggested to come *before* this one: every operation whose
 * suggested next operations (`allowedConnections`) include it. Derived, never
 * stored — the workbook's `SuggestedPostConnections` is the only list kept.
 * Suggestions only: the canvas allows any connection.
 */
export function suggestedBefore<S extends ServiceWithConnections>(serviceId: string, services: ReadonlyArray<S>): S[] {
  return services.filter((service) => (service.allowedConnections ?? []).some((entry) => idOf(entry) === String(serviceId)));
}
