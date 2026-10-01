import { describe, expect, it } from 'vitest';
import { snapshotFallback } from './parameterSnapshot';
import { EQUIPMENT_BOOKERS_PARAM_ID } from './servicePricing';

const node = { parameterSnapshot: [{ id: 'gone', name: 'Old parameter', type: 'text', displayValue: 'x' }, { id: '__runCount', name: 'Number of runs', displayValue: '2' }] };

describe('snapshotFallback', () => {
  it('returns the snapshot entry for a value whose parameter left the live service', () => {
    expect(snapshotFallback(node, 'gone', undefined)).toEqual(node.parameterSnapshot[0]);
  });
  it('defers to the live definition when there is one', () => {
    expect(snapshotFallback(node, 'gone', { id: 'gone', name: 'Renamed' })).toBeNull();
  });
  it('never takes over the reserved ids the UI injects', () => {
    expect(snapshotFallback(node, '__runCount', undefined)).toBeNull();
    expect(snapshotFallback(node, '__equipStart', undefined)).toBeNull();
  });
  it('is null without a snapshot or matching entry', () => {
    expect(snapshotFallback({}, 'gone', undefined)).toBeNull();
    expect(snapshotFallback(node, 'other', undefined)).toBeNull();
    expect(snapshotFallback(null, 'gone', undefined)).toBeNull();
  });
  it('treats the retired booker list as reserved, so no snapshot row is substituted for it', () => {
    const node = { parameterSnapshot: [{ id: EQUIPMENT_BOOKERS_PARAM_ID, name: 'Authorized booker emails', displayValue: 'a@b.com' }] };
    expect(snapshotFallback(node, EQUIPMENT_BOOKERS_PARAM_ID, undefined)).toBeNull();
  });
});
