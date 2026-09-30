import { describe, expect, it } from 'vitest';
import { validateUploadRows, ParsedInventoryRow } from './inventoryUploadUtils';

const row = (overrides: Partial<ParsedInventoryRow> = {}): ParsedInventoryRow => ({
  name: 'Widget',
  type: 'EQUIPMENT',
  tag: 'Not A Real Tag',
  stationName: '',
  quantity: 1,
  uniqueId: 'u1',
  modelNumber: '',
  serialNumber: '',
  hasServiceContract: false,
  serviceContractExpiration: '',
  dimensionL: '',
  dimensionW: '',
  dimensionH: '',
  warnings: [],
  ...overrides
});

describe('validateUploadRows idempotency (F15)', () => {
  it('validating the same rows twice yields one warning per unknown tag, not six', () => {
    const rows = [row()];

    validateUploadRows(rows);
    expect(rows[0].warnings).toEqual(['Tag "Not A Real Tag" is not in the predefined list.']);

    // The preview re-runs validation on every re-render against the same row
    // objects (no memoization) — a second run must not pile on a duplicate.
    validateUploadRows(rows);
    validateUploadRows(rows);
    expect(rows[0].warnings).toEqual(['Tag "Not A Real Tag" is not in the predefined list.']);
  });

  it('does not wipe warnings owned by parsing/station-resolution, only its own', () => {
    const rows = [row({ warnings: ['Name is blank — will be skipped if this is a new item.'] })];

    validateUploadRows(rows);
    validateUploadRows(rows);

    expect(rows[0].warnings).toEqual([
      'Name is blank — will be skipped if this is a new item.',
      'Tag "Not A Real Tag" is not in the predefined list.'
    ]);
  });

  it('re-validating still reports duplicate uniqueId and blank-quantity warnings exactly once', () => {
    const rows = [row({ tag: '', uniqueId: 'dup' }), row({ tag: '', uniqueId: 'dup' })];
    const rawQuantities = ['', '5'];

    validateUploadRows(rows, rawQuantities);
    validateUploadRows(rows, rawQuantities);

    expect(rows[0].warnings).toEqual([
      'Duplicate uniqueId "dup" found in 2 rows.',
      'Quantity blank — defaulting to 1.'
    ]);
    expect(rows[1].warnings).toEqual(['Duplicate uniqueId "dup" found in 2 rows.']);
  });
});
