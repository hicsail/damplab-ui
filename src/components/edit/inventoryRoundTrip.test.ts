import { describe, expect, it } from 'vitest';
import { buildExportSheet, offeredFields } from './exportFields';
import { inventoryExportFields } from './inventoryExport';
import { buildUpdateChanges, headerFieldFor, isExcelFileName, matchExistingItems, parseInventoryRows, resolveStations } from './inventoryUploadUtils';

const stations = [{ id: 'st1', name: 'Bench A' }, { id: 'st2', name: 'Bench B' }];
const stationName = (id: string): string | undefined => stations.find((s) => s.id === id)?.name;

const item: any = {
  id: 'i1', uniqueId: 'INV-0001', name: 'Thermocycler', type: 'EQUIPMENT',
  tags: ['Analytical Equipment', 'Centrifuge'],
  placements: [{ stationId: 'st1', quantity: 2 }, { stationId: 'st2', quantity: 1 }],
  modelNumber: 'T100', serialNumber: 'SN1', hasServiceContract: true, serviceContractExpiration: '2027-01-31T00:00:00.000Z',
  dimensionL: { value: 40, unit: 'cm' }, dimensionW: { value: 0.3, unit: 'm' }, dimensionH: null,
  description: 'PCR machine', location: 'Room 1', isDeleted: false
};

const blank = (v: unknown): unknown => (v === undefined || v === '' ? null : v);
const dateOnly = (v: unknown): unknown => (typeof v === 'string' && v ? v.slice(0, 10) : blank(v));

/** Fields the upload would change on the item; {} means a true no-op. */
function diff(source: any, changes: Record<string, unknown>): Record<string, [unknown, unknown]> {
  const out: Record<string, [unknown, unknown]> = {};
  for (const [key, next] of Object.entries(changes)) {
    const before = key === 'serviceContractExpiration' ? dateOnly(source[key]) : blank(source[key]);
    const after = key === 'serviceContractExpiration' ? dateOnly(next) : blank(next);
    if (JSON.stringify(before) !== JSON.stringify(after)) out[key] = [before, after];
  }
  return out;
}

describe('inventory spreadsheet round-trip (pin 22)', () => {
  const fields = offeredFields(inventoryExportFields(stationName), true);
  const sheet = buildExportSheet([item], fields, new Set(fields.map((f) => f.key)));

  it('inventory round-trip produces no changes (Review Focus 2)', () => {
    const { rows } = parseInventoryRows(sheet);
    matchExistingItems(rows, [item]);
    resolveStations(rows, stations);
    expect(rows[0].existingItemId).toBe('i1');
    expect(diff(item, buildUpdateChanges(rows[0], undefined, item))).toEqual({});
  });

  it('exports Station instead of leaving it blank', () => {
    const header = sheet[0] as string[];
    expect(sheet[1][header.indexOf('Station')]).toBe('Bench A');
  });

  it('uses headers the upload recognises for every field it reads back', () => {
    const readBack = ['name', 'type', 'tags', 'station', 'quantity', 'uniqueId', 'modelNumber', 'serialNumber', 'hasServiceContract', 'serviceContractExpiration', 'dimensionL', 'dimensionW', 'dimensionH'];
    for (const f of fields.filter((field) => readBack.includes(field.key))) expect({ label: f.label, mapped: !!headerFieldFor(f.label) }).toEqual({ label: f.label, mapped: true });
    for (const f of fields.filter((field) => !readBack.includes(field.key))) expect({ label: f.label, mapped: headerFieldFor(f.label) }).toEqual({ label: f.label, mapped: undefined });
  });

  it('still reads the old download header for contract expiration', () => {
    expect(headerFieldFor('Service contract (expiration date)')).toBe('serviceContractExpiration');
  });

  it('accepts .xlsx/.xls only (F6)', () => {
    expect(isExcelFileName('a.xlsx')).toBe(true);
    expect(isExcelFileName('a.XLS')).toBe(true);
    expect(isExcelFileName('a.csv')).toBe(false);
  });
});
