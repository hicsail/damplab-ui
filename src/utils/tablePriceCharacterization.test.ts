import { describe, expect, it } from 'vitest';
import { calculateServiceCost } from './servicePricing';

/**
 * CHARACTERIZATION — what a Table answer is priced at on the canvas TODAY,
 * pinned before the two Table types are merged (table-upload).
 *
 * Twin of damplab-backend/src/pricing/table-price-characterization.spec.ts:
 * the shapes and the numbers are the same table. No job that exists before
 * table-upload ships may change price because of it; these tests were written
 * against the untouched pricing code and passed there.
 *
 * DO NOT EDIT THE EXPECTED NUMBERS. If a change makes one of these fail, the
 * change moves the price of an existing job: fix the change, not this file.
 */

const file = (extra: Record<string, unknown> = {}): Record<string, unknown> => ({ filename: 'samples.xlsx', key: 'workflow-parameters/u/x', contentType: 'x', size: 1, uploadedAt: '2026-09-01T00:00:00.000Z', ...extra });
const ABSENT = Symbol('no entry for the parameter');

/** Every shape a stored answer to a `table` or `sampleSheet` parameter can have today. */
const SHAPES: Array<[string, unknown]> = [
  ['no entry', ABSENT],
  ['null', null],
  ['empty string', ''],
  ['file, 12 rows (stored string)', JSON.stringify(file({ sampleCount: 12 }))],
  ['file, 12 rows (object with url)', { ...file({ sampleCount: 12 }), url: 'https://s3/x' }],
  ['file, 1 row', JSON.stringify(file({ sampleCount: 1 }))],
  ['file, 0 rows', JSON.stringify(file({ sampleCount: 0 }))],
  ['file, no count', JSON.stringify(file())],
  ['file never stored, 4 rows', JSON.stringify({ filename: 'a.csv', notUploaded: true, sampleCount: 4 })],
  ['empty array', []],
  ['array of one empty string', ['']],
  ['array of two empty strings', ['', '']],
  ['array of one file, 12 rows', [JSON.stringify(file({ sampleCount: 12 }))]],
  ['array of two files, 12 + 3 rows', [JSON.stringify(file({ sampleCount: 12 })), JSON.stringify(file({ sampleCount: 3 }))]],
  ['text that is not JSON', 'legacy'],
  ['grid rows as a JSON string', JSON.stringify([{ id: 1, a: 'x' }])],
  ['grid data as an object', { rows: [{ id: 1, a: 'x' }] }],
  ['number 3', 3],
  ['number 0', 0],
  ['true', true]
];

const VARIANTS: Record<string, Record<string, unknown>> = {
  priced: { price: 3 },
  'priced, allowMultipleValues': { price: 3, allowMultipleValues: true },
  'priced, isPriceMultiplier': { price: 3, isPriceMultiplier: true },
  unpriced: {}
};

/**
 * The quantity billed today on a parameter-priced operation (the bill is $3 ×
 * this), one number per entry of SHAPES, in SHAPES order.
 */
const QUANTITY_TODAY: Record<string, number[]> = {
  'table / priced':                            [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
  'table / priced, allowMultipleValues':       [0, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 2, 1, 2, 1, 1, 1, 1, 1, 1],
  'table / priced, isPriceMultiplier':         [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 3, 0, 0],
  'table / unpriced':                          [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'sampleSheet / priced':                      [0, 0, 0, 12, 12, 1, 0, 0, 4, 0, 0, 0, 12, 12, 0, 0, 0, 0, 0, 0],
  'sampleSheet / priced, allowMultipleValues': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
  'sampleSheet / priced, isPriceMultiplier':   [0, 0, 0, 12, 12, 1, 0, 0, 4, 0, 0, 0, 12, 12, 0, 0, 0, 0, 0, 0],
  'sampleSheet / unpriced':                    [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
};

const serviceOf = (mode: 'PARAMETER' | 'SERVICE', type: string, variant: string): any => ({ pricingMode: mode, price: 50, parameters: [{ id: 'samples', name: 'Samples', type, ...VARIANTS[variant] }] });
/** A second answer rides along, as on the server twin. */
const formDataOf = (value: unknown): any[] => (value === ABSENT ? [{ id: 'other', value: 'x' }] : [{ id: 'other', value: 'x' }, { id: 'samples', value }]);

describe('CHARACTERIZATION: what a Table answer is priced at today (table-upload — do not edit the numbers)', () => {
  it('pins every stored type string and variant', () => {
    expect(Object.keys(QUANTITY_TODAY)).toHaveLength(8);
    for (const quantities of Object.values(QUANTITY_TODAY)) expect(quantities).toHaveLength(SHAPES.length);
  });

  for (const [key, quantities] of Object.entries(QUANTITY_TODAY)) {
    const [type, variant] = key.split(' / ');
    describe(`priced by parameter — ${key}`, () => {
      SHAPES.forEach(([label, value], index) => {
        it(`${label} → $3 × ${quantities[index]}`, () => {
          expect(calculateServiceCost(serviceOf('PARAMETER', type, variant), formDataOf(value))).toBe(3 * quantities[index]);
        });
      });
    });

    describe(`priced by operation ($50) — ${key}`, () => {
      SHAPES.forEach(([label, value]) => {
        // The answer never changes an operation-priced line, except as a
        // multiplier parameter that reads the number 3.
        const multiplier = variant === 'priced, isPriceMultiplier' && label === 'number 3' ? 3 : 1;
        it(`${label} → $${50 * multiplier}`, () => {
          expect(calculateServiceCost(serviceOf('SERVICE', type, variant), formDataOf(value))).toBe(50 * multiplier);
        });
      });
    });
  }
});
