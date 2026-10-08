import { describe, expect, it } from 'vitest';
import { calculateServiceCost, RUN_COUNT_PARAM_ID } from './servicePricing';

/**
 * show-only-if rule 19 on the canvas. Mirrors
 * damplab-backend/src/pricing/hidden-parameter-pricing.spec.ts: the price shown
 * while building a job must be the one the SOW bills.
 */
const sampleIsBacteria = { parameterId: 'sample', op: 'eq', optionIds: ['bact'] };
const parameters = [
  { id: 'sample', name: 'Sample Type', type: 'dropdown', options: [{ id: 'bact', name: 'Bacteria', price: 10 }, { id: 'yeast', name: 'Yeast', price: 20 }] },
  { id: 'lysis', name: 'Lysis', type: 'dropdown', showIf: sampleIsBacteria, options: [{ id: 'enz', name: 'Enzymatic', price: 7 }, { id: 'oth', name: 'Other', price: 9 }] },
  { id: 'kit', name: 'Kit', type: 'string', price: 5, showIf: sampleIsBacteria },
  { id: 'hours', name: 'Hours', type: 'number', isPriceMultiplier: true, price: 40, showIf: sampleIsBacteria }
];
const parameterPriced = { pricingMode: 'PARAMETER', parameters };
const servicePriced = { pricingMode: 'SERVICE', price: 100, parameters: [parameters[0], { id: 'plates', name: 'Plates', type: 'number', isPriceMultiplier: true, showIf: sampleIsBacteria }] };
const answers = (sample: string) => [
  { id: 'sample', value: sample },
  { id: 'lysis', value: 'oth' },
  { id: 'lysis__otherText', value: 'Bead beating' },
  { id: 'kit', value: 'K-12' },
  { id: 'hours', value: 3 }
];

describe('the canvas price ignores hidden parameters (show-only-if rule 19)', () => {
  it('prices every answer while its condition holds', () => {
    expect(calculateServiceCost(parameterPriced, answers('bact'))).toBe(10 + 9 + 5 + 40 * 3);
  });

  it('prices no hidden option, parameter or priced multiplier', () => {
    expect(calculateServiceCost(parameterPriced, answers('yeast'))).toBe(20);
  });

  it('a hidden price-multiplier parameter multiplies nothing; the run count still does', () => {
    const sent = (sample: string) => [{ id: 'sample', value: sample }, { id: 'plates', value: 4 }, { id: RUN_COUNT_PARAM_ID, value: 2 }];
    expect(calculateServiceCost(servicePriced, sent('bact'))).toBe(800);
    expect(calculateServiceCost(servicePriced, sent('yeast'))).toBe(200);
  });

  it('a hidden answer left empty by the form prices the same as one that was never there', () => {
    const emptied = [{ id: 'sample', value: 'yeast' }, { id: 'lysis', value: '' }, { id: 'kit', value: '' }, { id: 'hours', value: '' }];
    expect(calculateServiceCost(parameterPriced, emptied)).toBe(20);
  });
});
