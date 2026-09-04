import { describe, expect, it } from 'vitest';
import { allLineIndexes, billedLineIndexes, buildInvoiceServiceSelections, toggleLineIndex, unbilledLineIndexes } from './invoiceSelection';

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

describe('lines an earlier invoice already covers', () => {
  const priorInvoice = { invoiceNumber: '04217-001', sowVersionNumber: 1000, services: [{ sourceIndex: 0 }, { sourceIndex: 2 }] };

  it('maps each billed position to the invoice that billed it', () => {
    const billed = billedLineIndexes([priorInvoice], 1000);
    expect([...billed.entries()]).toEqual([
      [0, '04217-001'],
      [2, '04217-001']
    ]);
  });

  it('ticks only what is left when it opens', () => {
    // "Every line" is the one selection guaranteed to be refused once a job has
    // been part-invoiced.
    expect(unbilledLineIndexes(lines, billedLineIndexes([priorInvoice], 1000))).toEqual([1]);
  });

  it('ignores an invoice billed from a different SOW version, because positions are not comparable', () => {
    expect(billedLineIndexes([priorInvoice], 2000).size).toBe(0);
    expect(unbilledLineIndexes(lines, billedLineIndexes([priorInvoice], 2000))).toEqual(allLineIndexes(lines));
  });

  it('ignores an invoice written before positions were recorded', () => {
    const legacy = { invoiceNumber: '04217-000', sowVersionNumber: 1000, services: [{ serviceId: 'a' } as any] };
    expect(billedLineIndexes([legacy], 1000).size).toBe(0);
  });

  it('treats a SOW with no version in force as nothing proven', () => {
    expect(billedLineIndexes([priorInvoice], null).size).toBe(0);
  });
});
