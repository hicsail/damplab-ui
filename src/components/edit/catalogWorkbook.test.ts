import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { buildCatalogWorkbook, CATALOG_SHEET_NAMES, catalogFileBaseName } from './catalogWorkbook';
import { OPERATION_COLUMNS } from './operationsSheet';

const catalog = {
  services: [{ id: 's1', name: 'PCR', pricing: { internal: 5 }, hiddenFromClients: false, parameterSetIds: ['p1'], parameters: [{ id: 'cycles' }], categories: ['c1'] }],
  categories: [{ id: 'c1', label: 'Cloning' }],
  bundles: [{ id: 'b1', label: 'Clone', icon: 'x', services: ['s1'] }],
  parameterSets: [{ id: 'p1', name: 'Buffers', description: null, parameters: [{ id: 'buffer' }] }],
  inventory: [{ id: 'i1', name: 'Thermocycler', tags: ['A', 'B'], dimensionL: { value: 1, unit: 'm' } }],
  sowSections: [{ sectionKey: 'scope', name: 'Default', text: 'Words', order: 10 }],
  exportedAt: '2026-09-29T12:00:00.000Z'
};

describe('catalog download (pins 33, 35)', () => {
  it('names files by local date', () => {
    expect(catalogFileBaseName(new Date(2026, 8, 29, 23, 30))).toBe('damplab-catalog-2026-09-29');
  });

  it('has one sheet per top-level collection', () => {
    expect(buildCatalogWorkbook(catalog).SheetNames).toEqual([...CATALOG_SHEET_NAMES]);
  });

  it('uses the pin 24 columns for operations, with set names', () => {
    const wb = buildCatalogWorkbook(catalog);
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets.Operations, { header: 1 });
    expect(aoa[0]).toEqual([...OPERATION_COLUMNS]);
    expect(XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets.Operations)[0]).toMatchObject({ id: 's1', pricingInternal: 5, hiddenFromClients: 'N', parameterSets: 'Buffers' });
  });

  it('flattens other collections: lists joined, objects as JSON', () => {
    const wb = buildCatalogWorkbook(catalog);
    expect(XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets.Bundles)[0]).toMatchObject({ id: 'b1', services: 's1' });
    expect(XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets.Inventory)[0]).toMatchObject({ tags: 'A; B', dimensionL: '{"value":1,"unit":"m"}' });
    expect(XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets['Parameter Sets'])[0]).toMatchObject({ id: 'p1', name: 'Buffers', parameters: 'buffer' });
  });
});
