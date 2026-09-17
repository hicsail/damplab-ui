/**
 * Twin of `damplab-backend/src/pricing/service-pricing.util.spec.ts`.
 */

import { describe, it, expect } from 'vitest';
import { calculateParameterCostWithCategory, splitContractedLines, sumLineCosts } from "./servicePricing";

describe('splitContractedLines', () => {
  const equipment = { name: 'Plate reader', description: 'Plate reader — 10 hrs/wk x 4 wks (estimate; billed on actual hours)', cost: 400 };
  const contracted = { name: 'PCR', description: 'Amplification', cost: 350 };

  it('sorts a line by its description, keeping document order within each half', () => {
    const { contracted: c, equipment: e } = splitContractedLines([contracted, equipment, { ...contracted, name: 'Gel', cost: 120 }]);
    expect(c.map((l) => l.name)).toEqual(['PCR', 'Gel']);
    expect(e.map((l) => l.name)).toEqual(['Plate reader']);
  });

  it('treats a missing description as contracted — only the estimate suffix excludes a line', () => {
    expect(splitContractedLines([{ cost: 10 }] as any).contracted).toHaveLength(1);
  });

  it('handles null and undefined as nothing', () => {
    expect(splitContractedLines(null)).toEqual({ contracted: [], equipment: [] });
    expect(splitContractedLines(undefined)).toEqual({ contracted: [], equipment: [] });
  });
});

describe('sumLineCosts', () => {
  it('sums costs and rounds to cents', () => {
    expect(sumLineCosts([{ cost: 0.1 }, { cost: 0.2 }])).toBe(0.3);
  });

  it('treats a missing or unparseable cost as zero', () => {
    expect(sumLineCosts([{ cost: null }, {}, { cost: 350 }] as any)).toBe(350);
  });

  it('is zero for nothing at all', () => {
    expect(sumLineCosts(null)).toBe(0);
  });
});

describe('samples spreadsheet pricing (twin of the backend branch)', () => {
  const parameters = [
    { id: 'samples', name: 'Samples', type: 'sampleSheet', price: 3, pricing: { internal: 2 } },
    { id: 'notes', name: 'Notes', type: 'string' }
  ];
  const sheet = (sampleCount: number) => JSON.stringify({ filename: 'samples.xlsx', key: 'workflow-parameters/u/x', sampleCount });

  it('bills the parameter price once per sample row, at the customer’s category', () => {
    expect(calculateParameterCostWithCategory(parameters, [{ id: 'samples', value: sheet(12) }], 'INTERNAL_CUSTOMERS')).toBe(24);
    expect(calculateParameterCostWithCategory(parameters, [{ id: 'samples', value: sheet(12) }], undefined)).toBe(36);
  });

  it('reads the count off a pending canvas file and off the object the server returns', () => {
    expect(calculateParameterCostWithCategory(parameters, [{ id: 'samples', value: { __kind: 'pending-file', filename: 'a.csv', sampleCount: 4 } }], undefined)).toBe(12);
    expect(calculateParameterCostWithCategory(parameters, [{ id: 'samples', value: { filename: 'a.csv', url: 'u', sampleCount: 1 } }], undefined)).toBe(3);
  });

  it('bills nothing for no sheet, no rows, or no count', () => {
    expect(calculateParameterCostWithCategory(parameters, [{ id: 'samples', value: null }], undefined)).toBe(0);
    expect(calculateParameterCostWithCategory(parameters, [{ id: 'samples', value: sheet(0) }], undefined)).toBe(0);
    expect(calculateParameterCostWithCategory(parameters, [{ id: 'samples', value: JSON.stringify({ filename: 'a.xlsx' }) }], undefined)).toBe(0);
  });
});
