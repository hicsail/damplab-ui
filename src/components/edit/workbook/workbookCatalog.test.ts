import { describe, expect, it } from 'vitest';
import { CREATE_CATEGORY, UPDATE_CATEGORY } from '../../../gql/queries';
import { catalogSnapshotFrom } from './workbookCatalog';

const selects = (doc: any, field: string): boolean => JSON.stringify(doc).includes(`"value":"${field}"`);

describe('catalogSnapshotFrom', () => {
  it('maps the six query results onto the snapshot the workbook reads', () => {
    const snapshot = catalogSnapshotFrom({
      services: [{
        __typename: 'DampLabService', id: 'op1', name: 'PCR', description: 'Amplify', hiddenFromClients: false,
        parameters: [{ id: 'cycles', name: 'Cycles' }, { id: 'volume', name: 'Volume', fromParameterSetId: 's1', fromParameterSetName: 'Buffers' }],
        ownParameters: [{ id: 'cycles', name: 'Cycles' }], parameterSetIds: ['s1']
      }],
      parameterSets: [{ id: 's1', name: 'Buffers', parameters: [{ id: 'volume', name: 'Volume' }], usedBy: [] }],
      categories: [{ id: 'c1', label: 'Molecular Biology', services: [{ id: 'op1', name: 'PCR' }] }],
      bundles: [{ id: 'b1', label: 'Cloning', icon: null, services: [{ id: 'op1', name: 'PCR' }, { id: 'op1', name: 'PCR' }] }],
      sowTextPresets: [{ id: 'p1', sectionKey: 'terms', name: 'Default', text: 'Net 30.', order: 1000, updatedByName: 'x' }],
      sowPresetSections: [{ key: 'terms', label: 'Terms' }, { key: 'invoiceProcedures', label: 'Invoices' }]
    });
    expect(snapshot.operations[0]).toMatchObject({ id: 'op1', name: 'PCR', ownParameters: [{ id: 'cycles', name: 'Cycles' }], parameterSetIds: ['s1'] });
    expect(snapshot.sets).toEqual([{ id: 's1', name: 'Buffers', parameters: [{ id: 'volume', name: 'Volume' }] }]);
    expect(snapshot.categories).toEqual([{ id: 'c1', label: 'Molecular Biology', serviceIds: ['op1'] }]);
    expect(snapshot.bundles).toEqual([{ id: 'b1', label: 'Cloning', icon: '', steps: [{ id: 'op1', name: 'PCR' }, { id: 'op1', name: 'PCR' }] }]);
    expect(snapshot.sowPresets).toEqual([{ id: 'p1', sectionKey: 'terms', name: 'Default', text: 'Net 30.', order: 1000 }]);
    expect(snapshot.sowSectionKeys).toEqual(['terms', 'invoiceProcedures']);
  });

  it('falls back to the non-set parameters when a service has no ownParameters, and tolerates missing lists', () => {
    const snapshot = catalogSnapshotFrom({ services: [{ id: 'op1', name: 'PCR', parameters: [{ id: 'a' }, { id: 'b', fromParameterSetId: 's1' }] }] });
    expect(snapshot.operations[0].ownParameters).toEqual([{ id: 'a' }]);
    expect(snapshot.operations[0].parameterSetIds).toEqual([]);
    expect(snapshot).toMatchObject({ sets: [], categories: [], bundles: [], sowPresets: [], sowSectionKeys: [] });
  });
});

describe('category mutations return the id the upload log needs', () => {
  it('createCategory and updateCategory select id', () => {
    expect(selects(CREATE_CATEGORY, 'id')).toBe(true);
    expect(selects(UPDATE_CATEGORY, 'id')).toBe(true);
  });
});
