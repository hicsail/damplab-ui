import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import { offeredFields } from './exportFields';
import { buildOperationsWorkbook, OPERATION_COLUMNS, operationExportFields, OperationLike, parameterSheetRows } from './operationsSheet';

const sets = new Map([['s1', 'Buffers'], ['s2', 'Cleanup']]);
const pcr: OperationLike = {
  id: 'op1', name: 'PCR', description: 'Amplify', pricingMode: 'PARAMETER',
  pricing: { internal: 5, externalMarket: null, external: 9, legacy: 10 }, externalAcademicPrice: 7,
  hiddenFromClients: true, parameterSetIds: ['s2', 's1'],
  parameters: [
    { id: 'cycles', name: 'Cycles', type: 'number', required: true },
    { id: 'buffer', name: 'Buffer', type: 'dropdown', options: [{ name: 'PBS' }, { name: 'TE' }], fromParameterSetId: 's1', fromParameterSetName: 'Buffers' }
  ]
};

describe('operations sheet (pin 24)', () => {
  it('lists the pin 24 columns in order; pricing only with internal-fields:read', () => {
    expect(offeredFields(operationExportFields(sets), true).map((f) => f.label)).toEqual([...OPERATION_COLUMNS]);
    expect(offeredFields(operationExportFields(sets), false).map((f) => f.label)).toEqual(OPERATION_COLUMNS.filter((c) => !c.startsWith('pricing') || c === 'pricingMode'));
  });

  it('writes Y/N, set names in order, and the same tier fallbacks as the editor', () => {
    const fields = operationExportFields(sets);
    const wb = buildOperationsWorkbook([pcr], fields, new Set(fields.map((f) => f.key)));
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets.Operations);
    expect(rows[0]).toMatchObject({ id: 'op1', hiddenFromClients: 'Y', parameterSets: 'Cleanup; Buffers', pricingInternal: 5, pricingExternalAcademic: 7, pricingExternalMarket: 9, pricingLegacy: 10, pricingMode: 'PARAMETER' });
  });

  it('always adds a read-only Parameters sheet of effective parameters, even with few columns ticked', () => {
    const wb = buildOperationsWorkbook([pcr], operationExportFields(sets), new Set(['name']));
    expect(wb.SheetNames).toEqual(['Operations', 'Parameters']);
    expect(parameterSheetRows([pcr])).toEqual([
      ['operationId', 'operationName', 'parameterId', 'name', 'type', 'required', 'source', 'options'],
      ['op1', 'PCR', 'cycles', 'Cycles', 'number', 'Y', 'own', ''],
      ['op1', 'PCR', 'buffer', 'Buffer', 'dropdown', 'N', 'Buffers', 'PBS; TE']
    ]);
  });

  it('falls back to the raw set id when the sets query errored (or the id is otherwise unresolved)', () => {
    const op: OperationLike = { ...pcr, parameterSetIds: ['s1', 'unknown-set'] };
    const fields = operationExportFields(sets);
    const wb = buildOperationsWorkbook([op], fields, new Set(fields.map((f) => f.key)));
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets.Operations);
    expect(rows[0]).toMatchObject({ parameterSets: 'Buffers; unknown-set' });
  });
});
