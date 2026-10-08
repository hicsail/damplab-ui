import { describe, expect, it } from 'vitest';
import { bundlesExportRows, planBundles } from './bundlesSheet';
import { OperationRowRef } from './operationsWorkbookSheet';
import { catalogOf, rawSheet } from './testSupport';

const op = (id: string, name: string): any => ({ id, name, parameterSetIds: [], ownParameters: [] });
const catalog = catalogOf({
  operations: [op('op1', 'PCR'), op('op2', 'Gel'), op('op3', 'Twin'), op('op4', 'Twin')],
  bundles: [
    { id: 'b1', label: 'Cloning', icon: 'dna.png', steps: [{ id: 'op1', name: 'PCR' }, { id: 'op2', name: 'Gel' }, { id: 'op1', name: 'PCR' }] },
    { id: 'b2', label: 'Empty', icon: '', steps: [] }
  ]
});
const none = { operationRows: new Map<string, OperationRowRef[]>() };
const SAME_NAME = 'Same name as an existing bundle — this row creates a second one. Add the id to update it instead.';
const plan = (columns: string[], rows: string[][], ctx = none) => planBundles(rawSheet('bundles', columns, rows), catalog, ctx);

describe('Bundles — download rows (rule 32)', () => {
  it('writes one row per step, the icon on the first, and a single row for a bundle with no steps', () => {
    expect(bundlesExportRows(catalog)).toEqual([
      ['id', 'BundleName', 'Order', 'Operation', 'icon'],
      ['b1', 'Cloning', 1, 'PCR', 'dna.png'],
      ['b1', 'Cloning', 2, 'Gel', ''],
      ['b1', 'Cloning', 3, 'PCR', ''],
      ['b2', 'Empty', '', '', '']
    ]);
  });
});

describe('Bundles — a downloaded sheet uploaded unchanged (rule 2)', () => {
  it('is one "unchanged" row per bundle with its ids; without them each bundle would be created a second time', () => {
    const [header, ...rows] = bundlesExportRows(catalog);
    const asText = rows.map((r) => r.map(String));
    const withIds = plan(header.map(String), asText);
    expect(withIds.rows.map((r) => [r.label, r.action, r.rowNumber])).toEqual([['Cloning', 'unchanged', 2], ['Empty', 'unchanged', 5]]);
    expect(withIds.rowCount).toBe(4);
    expect(plan(header.map(String).slice(1), asText.map((r) => r.slice(1))).rows.map((r) => [r.action, r.warnings, r.selectedByDefault])).toEqual([['create', [SAME_NAME], false], ['create', [SAME_NAME], false]]);
  });
});

describe('Bundles — steps (rule 32)', () => {
  it('forms a bundle from rows with the same BundleName, sorted by Order, and lets an operation repeat', () => {
    const result = plan(['id', 'BundleName', 'Order', 'Operation'], [['b1', 'Cloning', '3', 'PCR'], ['', 'Cloning', '1', 'Gel'], ['', 'Cloning', '2', 'Gel']]);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ key: 'bundles:2', action: 'update', changed: ['steps'], errors: [] });
    expect(result.work.bundles['bundles:2']).toMatchObject({ existingId: 'b1', changes: { steps: [{ name: 'Gel', id: 'op2' }, { name: 'Gel', id: 'op2' }, { name: 'PCR', id: 'op1' }] }, before: { steps: ['PCR', 'Gel', 'PCR'] } });
  });

  it('creates a bundle, reading the icon from its first row', () => {
    const result = plan(['BundleName', 'Order', 'Operation', 'icon'], [['Screening', '1', 'PCR', 'screen.png'], ['Screening', '2', 'Gel', 'ignored.png']]);
    expect(result.rows[0]).toMatchObject({ action: 'create', label: 'Screening', errors: [] });
    expect(result.work.bundles['bundles:2']).toEqual({ existingId: undefined, label: 'Screening', changes: { label: 'Screening', icon: 'screen.png', steps: [{ name: 'PCR', id: 'op1' }, { name: 'Gel', id: 'op2' }] }, before: {} });
  });

  it('renames a bundle by id', () => {
    const result = plan(['id', 'BundleName'], [['b2', 'Blank']]);
    expect(result.rows[0]).toMatchObject({ action: 'update', changed: ['BundleName'] });
    expect(result.work.bundles['bundles:2'].changes).toEqual({ label: 'Blank' });
  });

  it('without an Operation column the steps are left alone (rule 6)', () => {
    const result = plan(['id', 'BundleName', 'icon'], [['b1', 'Cloning', 'new.png']]);
    expect(result.work.bundles['bundles:2'].changes).toEqual({ icon: 'new.png' });
  });

  it('refuses an operation that matches nothing, and one that matches two', () => {
    expect(plan(['BundleName', 'Order', 'Operation'], [['Cloning', '1', 'Ligation']]).rows[0].errors).toEqual(['Row 2: No operation named “Ligation”.']);
    expect(plan(['BundleName', 'Order', 'Operation'], [['Cloning', '1', 'Twin']]).rows[0].errors).toEqual(['Row 2: 2 operations are named “Twin”.']);
  });

  it('waits on an operation this upload creates', () => {
    const result = plan(['BundleName', 'Order', 'Operation'], [['Cloning', '1', 'Ligation']], { operationRows: new Map([['Ligation', [{ rowKey: 'operations:9', rowNumber: 9, id: '' }]]]) });
    expect(result.rows[0]).toMatchObject({ action: 'create', errors: [], needs: [{ what: 'operation “Ligation”', anyOf: ['operations:9'] }] });
    expect(result.work.bundles['bundles:2'].changes.steps).toEqual([{ name: 'Ligation', rowKey: 'operations:9' }]);
  });

  it('refuses an Order that is not a number, rows without a BundleName, and two ids in one bundle', () => {
    expect(plan(['BundleName', 'Order', 'Operation'], [['Cloning', 'first', 'PCR']]).rows[0].errors).toEqual(['Row 2: Order “first” is not a number.']);
    expect(plan(['BundleName', 'Order', 'Operation'], [['', '1', 'PCR']]).rows[0].errors).toEqual(['A bundle row needs a BundleName.']);
    expect(plan(['id', 'BundleName', 'Order', 'Operation'], [['b1', 'Cloning', '1', 'PCR'], ['b2', 'Cloning', '2', 'Gel']]).rows[0].errors).toEqual(['Row 3: id “b2” does not match the bundle’s other rows (“b1”).']);
  });

  it('flags a new bundle that only differs by case', () => {
    expect(plan(['BundleName'], [['cloning']]).rows[0]).toMatchObject({ action: 'create', warnings: ['Looks like “Cloning” — a near-duplicate'], selectedByDefault: false });
  });
});

describe('Bundles — F17a: the icon is the first non-blank icon in the bundle’s rows', () => {
  it('keeps the stored icon when a reordered sheet puts a blank-icon row first', () => {
    const result = plan(['id', 'BundleName', 'Order', 'Operation', 'icon'], [
      ['b1', 'Cloning', '2', 'Gel', ''],
      ['b1', 'Cloning', '1', 'PCR', 'dna.png'],
      ['b1', 'Cloning', '3', 'PCR', '']
    ]);
    // Same steps in the same Order, same icon: nothing to write.
    expect(result.rows[0]).toMatchObject({ action: 'unchanged', changed: [] });
    expect(result.work.bundles['bundles:2']).toBeUndefined();
  });

  it('a create takes the first non-blank icon', () => {
    const result = plan(['BundleName', 'Order', 'Operation', 'icon'], [['Fresh', '1', 'PCR', ''], ['Fresh', '2', 'Gel', 'x.png']]);
    expect(result.work.bundles['bundles:2'].changes.icon).toBe('x.png');
  });
});
