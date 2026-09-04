import { describe, expect, it } from 'vitest';
import { allLineIndexes, buildInvoiceServiceSelections, toggleLineIndex } from './invoiceSelection';

// Two lines share a serviceId at different prices — the shape that used to gang
// the checkboxes together and collapse onto one line server-side.
const lines = [
  { serviceId: 'a', name: 'PCR', cost: 100 },
  { serviceId: 'b', name: 'Assembly', cost: 20 },
  { serviceId: 'a', name: 'PCR', cost: 250 }
];

describe('toggleLineIndex', () => {
  it('toggles one line without touching its twin', () => {
    expect(toggleLineIndex([0, 1, 2], 0)).toEqual([1, 2]);
  });

  it('adds a line back', () => {
    expect(toggleLineIndex([1, 2], 0)).toEqual([1, 2, 0]);
  });
});

describe('allLineIndexes', () => {
  it('selects everything by default, duplicates included', () => {
    expect(allLineIndexes(lines)).toEqual([0, 1, 2]);
  });

  it.each([null, undefined, []])('is empty for %p', (input) => {
    expect(allLineIndexes(input as never)).toEqual([]);
  });
});

describe('buildInvoiceServiceSelections', () => {
  it('pairs each position with the service id expected there', () => {
    expect(buildInvoiceServiceSelections(lines, [0, 2])).toEqual([
      { index: 0, serviceId: 'a' },
      { index: 2, serviceId: 'a' }
    ]);
  });

  it('keeps the two same-service lines apart', () => {
    // Both carry serviceId 'a'; only the index distinguishes them.
    const payload = buildInvoiceServiceSelections(lines, [0, 2]);
    expect(payload.map((s) => s.index)).toEqual([0, 2]);
  });

  it('sorts into document order however the boxes were clicked', () => {
    expect(buildInvoiceServiceSelections(lines, [2, 0, 1]).map((s) => s.index)).toEqual([0, 1, 2]);
  });

  it('collapses a repeated index rather than billing one line twice', () => {
    expect(buildInvoiceServiceSelections(lines, [1, 1])).toEqual([{ index: 1, serviceId: 'b' }]);
  });

  it('refuses a position that is no longer there', () => {
    expect(() => buildInvoiceServiceSelections(lines, [9])).toThrow(/no longer on this Statement of Work/);
  });

  it('refuses a line with no identifier to check against', () => {
    expect(() => buildInvoiceServiceSelections([{ name: 'Mystery' }], [0])).toThrow(/no identifier/);
  });
});
