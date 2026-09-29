import { describe, expect, it } from 'vitest';
import { entityTypeLabel, filterUploadLogs, uploadLogFilterFromSearch } from './uploadLogs';

const logs = [{ id: '1', entityType: 'INVENTORY' }, { id: '2', entityType: 'OPERATION' }, { id: '3', entityType: null }];

describe('upload log filtering (pin 32)', () => {
  it('filters by type; a log without a type is an inventory log', () => {
    expect(filterUploadLogs(logs, 'ALL').map((l) => l.id)).toEqual(['1', '2', '3']);
    expect(filterUploadLogs(logs, 'INVENTORY').map((l) => l.id)).toEqual(['1', '3']);
    expect(filterUploadLogs(logs, 'OPERATION').map((l) => l.id)).toEqual(['2']);
  });

  it('reads the initial filter from ?type=', () => {
    expect(uploadLogFilterFromSearch('?type=OPERATION')).toBe('OPERATION');
    expect(uploadLogFilterFromSearch('?type=junk')).toBe('ALL');
    expect(uploadLogFilterFromSearch('')).toBe('ALL');
  });

  it('labels types', () => {
    expect(entityTypeLabel('OPERATION')).toBe('Operations');
    expect(entityTypeLabel(undefined)).toBe('Inventory');
  });
});
