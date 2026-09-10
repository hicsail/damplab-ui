import { describe, expect, it } from 'vitest';
import { buildReleaseRows, buildReleaseSelections, chargeKindLabel, defaultCheckedRows, sortChargesForDisplay } from './jobCharges';

const lines = [
  { serviceId: 's1', name: 'PCR', description: 'Amplification', cost: 350 },
  { serviceId: 's2', name: 'Gel', description: 'Electrophoresis', cost: 120 }
];
const released = (over: any = {}): any => ({ id: 'chg-1', kind: 'SERVICE_LINE', label: 'PCR', amount: 350, serviceId: 's1', sourceIndex: 0, sowVersionNumber: 1000, addedAt: '2026-04-01T12:00:00.000Z', ...over });

describe('buildReleaseRows', () => {
  it('marks a position with a live charge as released, and dates it', () => {
    const [row] = buildReleaseRows(lines, [released()]);
    expect(row.released).toBe(true);
    expect(row.releasedAt).toBe('04/01/2026');
    expect(row.mismatch).toBeNull();
  });

  it('ignores a voided charge — that position is available again', () => {
    expect(buildReleaseRows(lines, [released({ voidedAt: '2026-04-02T00:00:00.000Z' })])[0].released).toBe(false);
  });

  it('flags a released line the current version prices differently', () => {
    const [row] = buildReleaseRows([{ ...lines[0], cost: 900 }, lines[1]], [released()]);
    expect(row.mismatch).toBe('Released at $350.00; this version lists $900.00.');
  });

  it('flags a released line whose position now holds a different service', () => {
    const [row] = buildReleaseRows([{ serviceId: 's9', name: 'Other', description: '', cost: 350 }, lines[1]], [released()]);
    expect(row.mismatch).toBe('Released as “PCR”; this version lists “Other” at that position.');
  });

  it('leaves an unreleased position plain', () => {
    expect(buildReleaseRows(lines, [released()])[1]).toMatchObject({ released: false, releasedAt: null, mismatch: null, name: 'Gel' });
  });
});

describe('defaultCheckedRows', () => {
  it('ticks everything: released lines are locked on, unreleased ones start on', () => {
    expect(defaultCheckedRows(buildReleaseRows(lines, [released()]))).toEqual([0, 1]);
  });
});

describe('buildReleaseSelections', () => {
  it('sends only the positions that are newly checked and not already released', () => {
    const rows = buildReleaseRows(lines, [released()]);
    expect(buildReleaseSelections(rows, [0, 1])).toEqual([{ sourceIndex: 1, serviceId: 's2' }]);
  });

  it('sends nothing when only released lines are checked', () => {
    expect(buildReleaseSelections(buildReleaseRows(lines, [released()]), [0])).toEqual([]);
  });

  it('sorts by position, so the statement lists them in document order', () => {
    expect(buildReleaseSelections(buildReleaseRows(lines, []), [1, 0])).toEqual([
      { sourceIndex: 0, serviceId: 's1' },
      { sourceIndex: 1, serviceId: 's2' }
    ]);
  });
});

describe('sortChargesForDisplay', () => {
  it('lists service lines by position first, then everything else oldest first', () => {
    const rows = sortChargesForDisplay([
      { id: 'c', kind: 'DEPOSIT', addedAt: '2026-03-01T00:00:00Z' },
      { id: 'b', kind: 'SERVICE_LINE', sourceIndex: 1, addedAt: '2026-04-01T00:00:00Z' },
      { id: 'a', kind: 'SERVICE_LINE', sourceIndex: 0, addedAt: '2026-04-02T00:00:00Z' }
    ] as any);
    expect(rows.map((r: any) => r.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('chargeKindLabel', () => {
  it('words each kind for the Charges list', () => {
    expect(chargeKindLabel('SERVICE_LINE')).toBe('Service line');
    expect(chargeKindLabel('CUSTOM')).toBe('Custom');
    expect(chargeKindLabel('DEPOSIT')).toBe('Deposit');
    expect(chargeKindLabel(undefined)).toBe('Charge');
  });
});
