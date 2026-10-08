import { describe, expect, it } from 'vitest';
import { buildOwnerParameters, newSetRowKeys, parameterListExportRows, parseTypeCell, planParameterList, typeLabelOf } from './parameterListSheet';
import { catalogOf, rawSheet } from './testSupport';
import { SHEET_COLUMNS } from './types';

const COLUMNS = [...SHEET_COLUMNS.parameterList];
const buffers = {
  id: 'set1',
  name: 'Buffers',
  parameters: [
    { id: 'volume', name: 'Volume', description: 'In µL', type: 'number', required: true, rangeValueMin: 1, rangeValueMax: 50, price: 4, internalPrice: 2 },
    { id: 'sample_type', name: 'Sample Type', type: 'dropdown', allowMultipleValues: true, display: 'checkboxes', options: [{ id: 'bact', name: 'Bacteria', price: 9 }, { id: 'oth', name: 'Other' }] }
  ]
};
const pcr: any = { id: 'op1', name: 'PCR', parameterSetIds: ['set1'], ownParameters: [{ id: 'cycles', name: 'Cycles', type: 'number', validation: '>0 && integer', defaultValue: 30 }] };
const catalog = catalogOf({ sets: [buffers], operations: [pcr] });
const none = { newOperationRows: new Map<string, string>() };
const plan = (columns: string[], rows: string[][], ctx = none, cat = catalog) => planParameterList(rawSheet('parameterList', columns, rows), cat, ctx);

describe('Parameter List — download rows (rules 15, 18, 24)', () => {
  it('writes each set parameter once under its set, then each operation’s own parameters', () => {
    expect(parameterListExportRows(catalog)).toEqual([
      COLUMNS,
      ['volume', 'Buffers', '', 'Volume', 'In µL', 'Y', 'Number', '', '>=1 && <=50', 'N', ''],
      ['sample_type', 'Buffers', '', 'Sample Type', '', 'N', 'Checkboxes', 'Bacteria; Other', '', 'Y', ''],
      ['cycles', '', 'PCR', 'Cycles', '', 'N', 'Number', '', '>0 && integer', 'N', '30']
    ]);
  });

  it('labels types the friendly way, and reads both spellings back', () => {
    expect(typeLabelOf({ type: 'sampleSheet' })).toBe('Sample Upload');
    expect(typeLabelOf({ type: 'boolean' })).toBe('True/False');
    expect(typeLabelOf({ type: 'date' })).toBe('date');
    expect(parseTypeCell('sample upload')).toEqual({ type: 'sampleSheet', checkboxes: false });
    expect(parseTypeCell('SAMPLESHEET')).toEqual({ type: 'sampleSheet', checkboxes: false });
    expect(parseTypeCell('Checkboxes')).toEqual({ type: 'dropdown', checkboxes: true });
    expect(parseTypeCell('true/false')).toEqual({ type: 'boolean', checkboxes: false });
    expect(parseTypeCell('radio')).toBeNull();
  });
});

describe('Parameter List — a downloaded sheet uploaded unchanged (rule 2)', () => {
  it('is all "unchanged", with and without ids', () => {
    const [header, ...rows] = parameterListExportRows(catalog);
    expect(plan(header, rows).rows.map((r) => r.action)).toEqual(['unchanged', 'unchanged', 'unchanged']);
    const withoutIds = rows.map((r) => r.slice(1));
    const idless = plan(header.slice(1), withoutIds);
    expect(idless.rows.map((r) => r.action)).toEqual(['unchanged', 'unchanged', 'unchanged']);
    expect(idless.work.owners.every((o) => o.entries.length === 0)).toBe(true);
  });
});

describe('Parameter List — updates (rules 3, 6, 17)', () => {
  it('matches by name when there is no id, and changes only what the sheet changes', () => {
    const result = plan(['parameterSet', 'parameter', 'description'], [['Buffers', 'Volume', 'Microlitres']]);
    expect(result.rows[0]).toMatchObject({ action: 'update', matchedByName: true, changed: ['description'], errors: [], label: 'Buffers › Volume' });
    const next = buildOwnerParameters(result.work.owners[0], new Set([result.rows[0].key]));
    expect(next).toEqual([{ ...buffers.parameters[0], description: 'Microlitres' }, buffers.parameters[1]]);
  });

  it('a present, blank cell clears the field; an absent column leaves it alone', () => {
    const result = plan(['parameterId', 'parameterSet', 'parameter', 'description'], [['volume', 'Buffers', 'Volume', '']]);
    const next = buildOwnerParameters(result.work.owners[0], new Set([result.rows[0].key]));
    expect(next[0]).toEqual({ ...buffers.parameters[0], description: '' });
    expect(next[0].price).toBe(4);
    expect(next[0].required).toBe(true);
  });

  it('renames by id without changing the id', () => {
    const result = plan(['parameterId', 'parameterSet', 'parameter'], [['volume', 'Buffers', 'Final volume']]);
    expect(result.rows[0]).toMatchObject({ action: 'update', matchedByName: false, changed: ['parameter'] });
    expect(buildOwnerParameters(result.work.owners[0], new Set([result.rows[0].key]))[0]).toMatchObject({ id: 'volume', name: 'Final volume' });
  });

  it('an unticked row leaves its parameter exactly as stored', () => {
    const result = plan(['parameterSet', 'parameter', 'description'], [['Buffers', 'Volume', 'Microlitres']]);
    expect(buildOwnerParameters(result.work.owners[0], new Set())).toEqual(buffers.parameters);
  });

  it('a validation cell replaces the legacy min/max', () => {
    const result = plan(['parameterSet', 'parameter', 'validation'], [['Buffers', 'Volume', '>0 && <100']]);
    const next = buildOwnerParameters(result.work.owners[0], new Set([result.rows[0].key]))[0];
    expect(next.validation).toBe('>0 && <100');
    expect('rangeValueMin' in next).toBe(false);
    expect('rangeValueMax' in next).toBe(false);
  });
});

describe('Parameter List — creates (rules 16, 17)', () => {
  it('appends a new parameter after the stored ones, with a minted id and price 0', () => {
    const result = plan(['parameterSet', 'parameter', 'type', 'required'], [['Buffers', 'pH', 'Number', 'Y'], ['Buffers', 'Volume', 'Number', 'Y']]);
    expect(result.rows.map((r) => r.action)).toEqual(['create', 'unchanged']);
    const next = buildOwnerParameters(result.work.owners[0], new Set([result.rows[0].key]));
    expect(next.map((p) => p.id)).toEqual(['volume', 'sample_type', 'ph']);
    expect(next[2]).toEqual({ id: 'ph', name: 'pH', description: '', type: 'number', paramType: 'input', required: true, allowMultipleValues: false, isPriceMultiplier: false, price: 0 });
  });

  it('mints an id that avoids the owner’s ids and, for an operation, its sets’ ids', () => {
    const result = plan(['operation', 'parameter', 'type'], [['PCR', 'Volume', 'Text'], ['PCR', 'Cycles', 'Number'], ['PCR', 'cycles', 'Number']]);
    expect(result.rows.map((r) => r.action)).toEqual(['create', 'unchanged', 'create']);
    expect(result.rows[2]).toMatchObject({ warnings: ['Looks like “Cycles” — a near-duplicate'], selectedByDefault: false });
    const next = buildOwnerParameters(result.work.owners[0], new Set([result.rows[0].key, result.rows[2].key]));
    expect(next.map((p) => p.id)).toEqual(['cycles', 'volume_2', 'cycles_2']);
    expect(next[1]).toEqual({ id: 'volume_2', name: 'Volume', description: '', type: 'string', paramType: 'input', required: false, allowMultipleValues: false, isPriceMultiplier: false, price: 0 });
  });

  it('a set name with no existing set creates the set from its rows', () => {
    const sheet = rawSheet('parameterList', ['parameterSet', 'parameter', 'type'], [['Cleanup', 'Elution volume', 'Number'], ['Cleanup', 'Method', 'Text']]);
    expect(newSetRowKeys(sheet, catalog)).toEqual(new Map([['Cleanup', ['parameterList:2', 'parameterList:3']]]));
    const result = planParameterList(sheet, catalog, none);
    expect(result.rows.map((r) => r.action)).toEqual(['create', 'create']);
    const owner = result.work.owners[0];
    expect(owner).toMatchObject({ kind: 'set', name: 'Cleanup' });
    expect(owner.existingId).toBeUndefined();
    expect(buildOwnerParameters(owner, new Set(['parameterList:2', 'parameterList:3'])).map((p) => p.id)).toEqual(['elution_volume', 'method']);
  });

  it('flags a new set that only differs by case from an existing one', () => {
    const result = plan(['parameterSet', 'parameter'], [['buffers', 'pH']]);
    expect(result.rows[0]).toMatchObject({ action: 'create', warnings: ['Looks like “Buffers” — a near-duplicate'], selectedByDefault: false });
  });

  it('refuses a new set whose name contains ";"', () => {
    expect(plan(['parameterSet', 'parameter'], [['A; B', 'pH']]).rows[0].errors).toEqual(['A parameter set name cannot contain “;”.']);
  });

  it('says a Table / File Upload / Sample Upload template is set in the editor', () => {
    const result = plan(['parameterSet', 'parameter', 'type'], [['Buffers', 'Plate map', 'Sample Upload']]);
    expect(result.rows[0]).toMatchObject({ action: 'create', warnings: ['Set the Sample Upload template in the editor.'] });
  });
});

describe('Parameter List — owners (rule 15)', () => {
  it('needs exactly one of parameterSet / operation', () => {
    const result = plan(['parameterSet', 'operation', 'parameter'], [['Buffers', 'PCR', 'pH'], ['', '', 'pH']]);
    expect(result.rows.map((r) => r.errors)).toEqual([['Fill exactly one of parameterSet / operation.'], ['Fill exactly one of parameterSet / operation.']]);
    expect(result.rows.every((r) => r.action === 'skip' && !r.selectedByDefault)).toBe(true);
  });

  it('refuses an operation that does not exist and is not created by this upload', () => {
    expect(plan(['operation', 'parameter'], [['Ligation', 'Insert']]).rows[0].errors).toEqual(['No operation named “Ligation”.']);
  });

  it('waits on an operation the Operations sheet creates', () => {
    const result = plan(['operation', 'parameter'], [['Ligation', 'Insert']], { newOperationRows: new Map([['Ligation', 'operations:7']]) });
    expect(result.rows[0]).toMatchObject({ action: 'create', errors: [], needs: [{ what: 'operation “Ligation”', anyOf: ['operations:7'] }] });
    expect(result.work.owners[0]).toMatchObject({ kind: 'operation', name: 'Ligation', operationRowKey: 'operations:7' });
    expect(result.work.owners[0].existingId).toBeUndefined();
  });

  it('two rows for one parameter are both errors', () => {
    const result = plan(['parameterId', 'parameterSet', 'parameter'], [['volume', 'Buffers', 'Volume'], ['', 'Buffers', 'Volume']]);
    expect(result.rows[0].errors).toEqual(['Rows 2 and 3 both resolve to “Volume”.']);
    expect(result.rows[1].errors).toEqual(['Rows 2 and 3 both resolve to “Volume”.']);
  });

  it('a parameterId that is not in the owner is an error', () => {
    expect(plan(['parameterId', 'parameterSet', 'parameter'], [['cycles', 'Buffers', 'Cycles']]).rows[0].errors).toEqual(['No parameter has id “cycles”.']);
  });
});

describe('Parameter List — type, options, validation (rules 18, 19, 22)', () => {
  const options = (cell: string) => plan(['parameterSet', 'parameter', 'options'], [['Buffers', 'Sample Type', cell]]);

  it('keeps an option’s id and stored fields on a case-insensitive name match, mints new ids, and warns about removals', () => {
    const result = options('bacteria; Yeast');
    expect(result.rows[0]).toMatchObject({ action: 'update', errors: [], warnings: ['Option “Other” will be removed'] });
    const next = buildOwnerParameters(result.work.owners[0], new Set([result.rows[0].key]))[1];
    expect(next.options).toEqual([{ id: 'bact', name: 'bacteria', price: 9 }, { id: 'yeast', name: 'Yeast' }]);
  });

  it('refuses two equal names in one cell', () => {
    expect(options('Bacteria; bacteria; Other').rows[0].errors).toEqual(['Option “bacteria” is listed twice.']);
  });

  it('refuses a dropdown left with no options', () => {
    expect(options('').rows[0].errors).toEqual(['A Dropdown or Checkboxes parameter needs at least one option.']);
  });

  it('ignores options on a non-option type, with a warning', () => {
    const result = plan(['parameterSet', 'parameter', 'options'], [['Buffers', 'Volume', 'A; B']]);
    expect(result.rows[0].warnings).toEqual(['options ignored: Number parameters have none.']);
    expect(result.rows[0].errors).toEqual([]);
  });

  it('never splits a stored option name that contains ";" (Review Focus 2)', () => {
    const odd = catalogOf({ sets: [{ id: 's', name: 'Odd', parameters: [{ id: 'k', name: 'Kind', type: 'dropdown', options: [{ id: 'ab', name: 'A; B' }, { id: 'c', name: 'C' }] }] }] });
    const [header, ...rows] = parameterListExportRows(odd);
    expect(planParameterList(rawSheet('parameterList', header, rows), odd, none).rows[0].action).toBe('unchanged');
    const edited = planParameterList(rawSheet('parameterList', ['parameterSet', 'parameter', 'options'], [['Odd', 'Kind', 'A; B; D']]), odd, none);
    expect(edited.rows[0].warnings).toEqual(['An existing option name contains “;”, so its options can only be edited in the editor; the options cell is ignored.']);
    expect(edited.rows[0].action).toBe('unchanged');
  });

  it('Checkboxes is a multi-value dropdown shown as checkboxes; Dropdown clears the flag', () => {
    const toCheck = plan(['parameterSet', 'parameter', 'type', 'options'], [['Buffers', 'Kind', 'Checkboxes', 'A; B']]);
    expect(buildOwnerParameters(toCheck.work.owners[0], new Set([toCheck.rows[0].key]))[2]).toMatchObject({ type: 'dropdown', display: 'checkboxes', allowMultipleValues: true });
    const toDropdown = plan(['parameterSet', 'parameter', 'type'], [['Buffers', 'Sample Type', 'Dropdown']]);
    const next = buildOwnerParameters(toDropdown.work.owners[0], new Set([toDropdown.rows[0].key]))[1];
    expect(next.type).toBe('dropdown');
    expect('display' in next).toBe(false);
  });

  it('refuses an unknown type, an unparseable validation, and a validation on a non-number', () => {
    expect(plan(['parameterSet', 'parameter', 'type'], [['Buffers', 'pH', 'Slider']]).rows[0].errors).toEqual(['Unknown type “Slider”.']);
    expect(plan(['parameterSet', 'parameter', 'validation'], [['Buffers', 'Volume', '>0 || <5']]).rows[0].errors).toEqual(['validation: “||” is not supported — join rules with &&.']);
    expect(plan(['parameterSet', 'parameter', 'type', 'validation'], [['Buffers', 'Notes', 'Text', '>0']]).rows[0].errors).toEqual(['Only Number parameters can have a validation.']);
  });

  it('refuses a yes/no cell it cannot read', () => {
    expect(plan(['parameterSet', 'parameter', 'required'], [['Buffers', 'Volume', 'maybe']]).rows[0].errors).toEqual(['required: “maybe” must be Y or N.']);
  });
});
