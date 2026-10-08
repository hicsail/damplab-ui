/**
 * Upload-log type filter: the history page shows the inventory workbook's logs
 * and one log per catalog-workbook sheet, distinguished by `entityType`. A log
 * with no `entityType` predates that column and is an inventory log.
 */
export const UPLOAD_LOG_TYPES = ['INVENTORY', 'OPERATION', 'PARAMETER_SET', 'BUNDLE', 'SOW_SECTION'] as const;
export type UploadLogType = (typeof UPLOAD_LOG_TYPES)[number];
export type UploadLogTypeFilter = 'ALL' | UploadLogType;

const LABELS: Record<UploadLogType, string> = {
  INVENTORY: 'Inventory',
  OPERATION: 'Operations',
  PARAMETER_SET: 'Parameters',
  BUNDLE: 'Bundles',
  SOW_SECTION: 'SOW sections'
};

const isType = (value: unknown): value is UploadLogType => (UPLOAD_LOG_TYPES as readonly unknown[]).includes(value);
const typeOf = (entityType: string | null | undefined): UploadLogType => (isType(entityType) ? entityType : 'INVENTORY');

export function uploadLogFilterFromSearch(search: string): UploadLogTypeFilter {
  const type = new URLSearchParams(search).get('type');
  return isType(type) ? type : 'ALL';
}

export function filterUploadLogs<T extends { entityType?: string | null }>(logs: T[], filter: UploadLogTypeFilter): T[] {
  return filter === 'ALL' ? logs : logs.filter((log) => typeOf(log.entityType) === filter);
}

export function entityTypeLabel(entityType: string | null | undefined): string {
  return LABELS[typeOf(entityType)];
}
