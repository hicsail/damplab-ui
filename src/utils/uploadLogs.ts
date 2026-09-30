/**
 * Upload-log type filter (pin 32): the history page now shows both inventory
 * and operations upload logs, distinguished by `entityType`. A log with no
 * `entityType` predates that column and is an inventory log.
 */
export type UploadLogTypeFilter = 'ALL' | 'INVENTORY' | 'OPERATION';

const typeOf = (entityType: string | null | undefined): 'INVENTORY' | 'OPERATION' => (entityType === 'OPERATION' ? 'OPERATION' : 'INVENTORY');

export function uploadLogFilterFromSearch(search: string): UploadLogTypeFilter {
  const type = new URLSearchParams(search).get('type');
  return type === 'INVENTORY' || type === 'OPERATION' ? type : 'ALL';
}

export function filterUploadLogs<T extends { entityType?: string | null }>(logs: T[], filter: UploadLogTypeFilter): T[] {
  return filter === 'ALL' ? logs : logs.filter((log) => typeOf(log.entityType) === filter);
}

export function entityTypeLabel(entityType: string | null | undefined): 'Inventory' | 'Operations' {
  return typeOf(entityType) === 'OPERATION' ? 'Operations' : 'Inventory';
}
