import { describe, expect, it } from 'vitest';
import {
  buildCustomLineInputs,
  buildReleaseRows,
  buildReleaseSelections,
  chargeKindLabel,
  customLineError,
  customLineErrors,
  defaultCheckedRows,
  depositError,
  emptyCustomLine,
  isBlankCustomLine,
  sortChargesForDisplay
} from './jobCharges';

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

const EQUIP = 'Plate reader — 10 hrs/wk x 4 wks (estimate; billed on actual hours)';
const withEquipment = [...lines, { serviceId: 'e1', name: 'Plate reader', description: EQUIP, cost: 45 }];

describe('equipment estimates on the checklist', () => {
  it('marks the estimate row and leaves the others alone', () => {
    expect(buildReleaseRows(withEquipment, []).map((r) => r.estimate)).toEqual([false, false, true]);
  });

  it('never ticks an estimate by default', () => {
    expect(defaultCheckedRows(buildReleaseRows(withEquipment, []))).toEqual([0, 1]);
  });

  it('never sends one even if it is somehow checked', () => {
    const rows = buildReleaseRows(withEquipment, []);
    expect(buildReleaseSelections(rows, [0, 1, 2]).map((s) => s.sourceIndex)).toEqual([0, 1]);
  });

  it('still shows a legacy equipment line that was already released', () => {
    const rows = buildReleaseRows(withEquipment, [released({ kind: 'SERVICE_LINE', sourceIndex: 2, serviceId: 'e1', label: 'Plate reader', amount: 45 })]);
    expect(rows[2]).toMatchObject({ estimate: true, released: true, releasedAt: '04/01/2026' });
  });
});

describe('custom line drafts', () => {
  it('drops a blank row', () => {
    expect(isBlankCustomLine({ label: '  ', amount: '', note: '' })).toBe(true);
    expect(buildCustomLineInputs([emptyCustomLine(), { label: 'Courier', amount: '25', note: '' }])).toEqual([{ label: 'Courier', amount: 25 }]);
  });

  it('keeps a note when there is one, trimmed', () => {
    expect(buildCustomLineInputs([{ label: ' Courier ', amount: '25', note: ' Overnight ' }])).toEqual([{ label: 'Courier', amount: 25, note: 'Overnight' }]);
  });

  it('allows a negative amount', () => {
    expect(buildCustomLineInputs([{ label: 'Goodwill', amount: '-50', note: '' }])).toEqual([{ label: 'Goodwill', amount: -50 }]);
  });

  it('blocks a labelled row with a zero amount, in the server’s words', () => {
    expect(customLineError({ label: 'Courier', amount: '0', note: '' })).toBe('A charge amount cannot be zero.');
    expect(customLineError({ label: 'Courier', amount: '', note: '' })).toBe('A charge amount cannot be zero.');
  });

  it('blocks an amount with no label, in the server’s words', () => {
    expect(customLineError({ label: '  ', amount: '25', note: '' })).toBe('A label is required for a charge.');
  });

  it('says nothing about a blank row or a good one', () => {
    expect(customLineError(emptyCustomLine())).toBeNull();
    expect(customLineError({ label: 'Courier', amount: '25', note: '' })).toBeNull();
  });

  it('reports the first offending row for the dialog', () => {
    expect(customLineErrors([{ label: 'Courier', amount: '25', note: '' }, { label: 'Bad', amount: '0', note: '' }])).toBe('A charge amount cannot be zero.');
    expect(customLineErrors([emptyCustomLine()])).toBeNull();
  });
});

describe('depositError', () => {
  it.each([['0'], ['-5'], [''], ['abc']])('refuses %s in the server’s words', (v) => {
    expect(depositError(v)).toBe('A deposit must be greater than zero.');
  });

  it('accepts a positive amount', () => {
    expect(depositError('500')).toBeNull();
  });
});
