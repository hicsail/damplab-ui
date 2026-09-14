/**
 * Twin of `damplab-backend/src/pricing/service-pricing.util.spec.ts`.
 */

import { describe, it, expect } from 'vitest';
import { splitContractedLines, sumLineCosts } from './servicePricing';

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
