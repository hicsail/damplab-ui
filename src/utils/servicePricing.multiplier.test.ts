import { describe, expect, it } from 'vitest';
import { calculateServiceCost, RUN_COUNT_PARAM_ID } from './servicePricing';

/**
 * The canvas has to price a node the way the SOW will bill it.
 *
 * These mirror `a priced multiplier parameter scales only itself` in the
 * backend's src/pricing/service-pricing.util.spec.ts. If the two ever disagree,
 * a customer is quoted one figure while building the job and billed another.
 */
const equipment = {
  pricingMode: 'PARAMETER',
  parameters: [
    { id: 'instrument', name: 'Instrument', type: 'dropdown', options: [{ id: 'bioanalyzer', name: 'Bioanalyzer', price: 100 }] },
    { id: 'hours', name: 'Hours in use', type: 'number', isPriceMultiplier: true, price: 40 }
  ]
};

const threeHours = [
  { id: 'instrument', value: 'bioanalyzer' },
  { id: 'hours', value: 3 }
];

describe('a priced multiplier parameter scales only itself', () => {
  it('bills the setup fee once and the hourly rate per hour', () => {
    expect(calculateServiceCost(equipment, threeHours)).toBe(220);
  });

  it('reads the number rather than counting the selection', () => {
    const sixHours = [
      { id: 'instrument', value: 'bioanalyzer' },
      { id: 'hours', value: 6 }
    ];
    expect(calculateServiceCost(equipment, sixHours)).toBe(340);
  });

  it('still lets the universal run count scale the whole line', () => {
    expect(calculateServiceCost(equipment, [...threeHours, { id: RUN_COUNT_PARAM_ID, value: 2 }])).toBe(440);
  });

  it('leaves SERVICE-mode pricing alone, where a multiplier parameter scales the service price', () => {
    const flat = {
      pricingMode: 'SERVICE',
      price: 100,
      parameters: [{ id: 'hours', name: 'Hours in use', type: 'number', isPriceMultiplier: true, price: 40 }]
    };
    expect(calculateServiceCost(flat, [{ id: 'hours', value: 3 }])).toBe(300);
  });

  it('leaves an unpriced multiplier parameter scaling the whole line', () => {
    const ngs = {
      pricingMode: 'PARAMETER',
      parameters: [
        { id: 'kit', name: 'Kit', type: 'dropdown', options: [{ id: 'standard', name: 'Standard', price: 50 }] },
        { id: 'samples', name: 'Samples', type: 'number', isPriceMultiplier: true }
      ]
    };
    expect(calculateServiceCost(ngs, [{ id: 'kit', value: 'standard' }, { id: 'samples', value: 4 }])).toBe(200);
  });
});
