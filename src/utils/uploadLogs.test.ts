import { describe, expect, it } from 'vitest';
import { entityTypeLabel, filterUploadLogs, UPLOAD_LOG_TYPES, uploadLogFilterFromSearch } from './uploadLogs';

const logs = [
  { id: '1', entityType: 'INVENTORY' }, { id: '2', entityType: 'OPERATION' }, { id: '3', entityType: null },
  { id: '4', entityType: 'PARAMETER_SET' }, { id: '5', entityType: 'BUNDLE' }, { id: '6', entityType: 'SOW_SECTION' }
];

describe('upload log filtering', () => {
  it('knows the five log types', () => {
    expect(UPLOAD_LOG_TYPES).toEqual(['INVENTORY', 'OPERATION', 'PARAMETER_SET', 'BUNDLE', 'SOW_SECTION']);
  });

  it('filters by type; a log without a type is an inventory log', () => {
    expect(filterUploadLogs(logs, 'ALL').map((l) => l.id)).toEqual(['1', '2', '3', '4', '5', '6']);
    expect(filterUploadLogs(logs, 'INVENTORY').map((l) => l.id)).toEqual(['1', '3']);
    expect(filterUploadLogs(logs, 'OPERATION').map((l) => l.id)).toEqual(['2']);
    expect(filterUploadLogs(logs, 'PARAMETER_SET').map((l) => l.id)).toEqual(['4']);
    expect(filterUploadLogs(logs, 'BUNDLE').map((l) => l.id)).toEqual(['5']);
    expect(filterUploadLogs(logs, 'SOW_SECTION').map((l) => l.id)).toEqual(['6']);
  });

  it('reads the initial filter from ?type=', () => {
    expect(uploadLogFilterFromSearch('?type=OPERATION')).toBe('OPERATION');
    expect(uploadLogFilterFromSearch('?type=SOW_SECTION')).toBe('SOW_SECTION');
    expect(uploadLogFilterFromSearch('?type=junk')).toBe('ALL');
    expect(uploadLogFilterFromSearch('')).toBe('ALL');
  });

  it('labels types', () => {
    expect(entityTypeLabel('OPERATION')).toBe('Operations');
    expect(entityTypeLabel('PARAMETER_SET')).toBe('Parameters');
    expect(entityTypeLabel('BUNDLE')).toBe('Bundles');
    expect(entityTypeLabel('SOW_SECTION')).toBe('SOW sections');
    expect(entityTypeLabel(undefined)).toBe('Inventory');
  });
});
