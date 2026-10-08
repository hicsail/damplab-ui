import { describe, expect, it } from 'vitest';
import { OperationRowRef } from './operationsWorkbookSheet';
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
const none = { operationRows: new Map<string, OperationRowRef[]>() };
const SAME_NAME = 'Same name as an existing parameter — this row creates a second one. Add the id to update it instead.';
const plan = (columns: string[], rows: string[][], ctx = none, cat = catalog) => planParameterList(rawSheet('parameterList', columns, rows), cat, ctx);

describe('Parameter List — download rows (rules 15, 18, 24)', () => {
  it('writes each set parameter once under its set, then each operation’s own parameters', () => {
    expect(parameterListExportRows(catalog)).toEqual([
      COLUMNS,
      ['volume', 'Buffers', '', 'Volume', 'In µL', 'Y', 'Number', '', '>=1 && <=50', '', 'N', ''],
      ['sample_type', 'Buffers', '', 'Sample Type', '', 'N', 'Checkboxes', 'Bacteria; Other', '', '', 'Y', ''],
      ['cycles', '', 'PCR', 'Cycles', '', 'N', 'Number', '', '>0 && integer', '', 'N', '30']
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
  it('is all "unchanged" with its ids', () => {
    const [header, ...rows] = parameterListExportRows(catalog);
    const result = plan(header, rows);
    expect(result.rows.map((r) => r.action)).toEqual(['unchanged', 'unchanged', 'unchanged']);
    expect(result.work.owners.every((o) => o.entries.length === 0)).toBe(true);
  });

  it('without its ids every row is a create that would make a second parameter: warned and unticked, never an update', () => {
    const [header, ...rows] = parameterListExportRows(catalog);
    const idless = plan(header.slice(1), rows.map((r) => r.slice(1)));
    expect(idless.rows.map((r) => [r.action, r.warnings, r.selectedByDefault])).toEqual(Array(3).fill(['create', [SAME_NAME], false]));
  });
});

describe('Parameter List — updates (rules 3, 6, 17)', () => {
  it('updates the parameter its parameterId gives, and changes only what the sheet changes', () => {
    const result = plan(['parameterId', 'parameterSet', 'parameter', 'description'], [['volume', 'Buffers', 'Volume', 'Microlitres']]);
    expect(result.rows[0]).toMatchObject({ action: 'update', changed: ['description'], errors: [], label: 'Buffers › Volume' });
    const next = buildOwnerParameters(result.work.owners[0], new Set([result.rows[0].key]));
    expect(next).toEqual([{ ...buffers.parameters[0], description: 'Microlitres' }, buffers.parameters[1]]);
  });

  it('a row without a parameterId never updates the parameter of that name: it adds a second, under a fresh id', () => {
    const result = plan(['parameterSet', 'parameter', 'description'], [['Buffers', 'Volume', 'Microlitres']]);
    expect(result.rows[0]).toMatchObject({ action: 'create', changed: ['parameter', 'description'], errors: [], warnings: [SAME_NAME], selectedByDefault: false });
    const next = buildOwnerParameters(result.work.owners[0], new Set([result.rows[0].key]));
    expect(next.slice(0, 2)).toEqual(buffers.parameters);
    expect(next[2]).toMatchObject({ id: 'volume_2', name: 'Volume', description: 'Microlitres' });
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
    expect(result.rows[0]).toMatchObject({ action: 'update', changed: ['parameter'] });
    expect(buildOwnerParameters(result.work.owners[0], new Set([result.rows[0].key]))[0]).toMatchObject({ id: 'volume', name: 'Final volume' });
  });

  it('an unticked row leaves its parameter exactly as stored', () => {
    const result = plan(['parameterId', 'parameterSet', 'parameter', 'description'], [['volume', 'Buffers', 'Volume', 'Microlitres']]);
    expect(buildOwnerParameters(result.work.owners[0], new Set())).toEqual(buffers.parameters);
  });

  it('a validation cell replaces the legacy min/max', () => {
    const result = plan(['parameterId', 'parameterSet', 'parameter', 'validation'], [['volume', 'Buffers', 'Volume', '>0 && <100']]);
    const next = buildOwnerParameters(result.work.owners[0], new Set([result.rows[0].key]))[0];
    expect(next.validation).toBe('>0 && <100');
    expect('rangeValueMin' in next).toBe(false);
    expect('rangeValueMax' in next).toBe(false);
  });
});

describe('Parameter List — creates (rules 16, 17)', () => {
  it('appends a new parameter after the stored ones, with a minted id and price 0', () => {
    const result = plan(['parameterId', 'parameterSet', 'parameter', 'type', 'required'], [['', 'Buffers', 'pH', 'Number', 'Y'], ['volume', 'Buffers', 'Volume', 'Number', 'Y']]);
    expect(result.rows.map((r) => r.action)).toEqual(['create', 'unchanged']);
    const next = buildOwnerParameters(result.work.owners[0], new Set([result.rows[0].key]));
    expect(next.map((p) => p.id)).toEqual(['volume', 'sample_type', 'ph']);
    expect(next[2]).toEqual({ id: 'ph', name: 'pH', description: '', type: 'number', paramType: 'input', required: true, allowMultipleValues: false, isPriceMultiplier: false, price: 0 });
  });

  it('mints an id that avoids the owner’s ids and, for an operation, its sets’ ids', () => {
    const result = plan(['parameterId', 'operation', 'parameter', 'type'], [['', 'PCR', 'Volume', 'Text'], ['cycles', 'PCR', 'Cycles', 'Number'], ['', 'PCR', 'cycles', 'Number']]);
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
    const result = plan(['operation', 'parameter'], [['Ligation', 'Insert']], { operationRows: new Map([['Ligation', [{ rowKey: 'operations:7', rowNumber: 7, id: '' }]]]) });
    expect(result.rows[0]).toMatchObject({ action: 'create', errors: [], needs: [{ what: 'operation “Ligation”', anyOf: ['operations:7'] }] });
    expect(result.work.owners[0]).toMatchObject({ kind: 'operation', name: 'Ligation', operationRowKey: 'operations:7' });
    expect(result.work.owners[0].existingId).toBeUndefined();
  });

  it('two rows with one parameterId are both errors; a row without an id is another parameter', () => {
    const result = plan(['parameterId', 'parameterSet', 'parameter'], [['volume', 'Buffers', 'Volume'], ['volume', 'Buffers', 'Final volume'], ['', 'Buffers', 'Sample Type']]);
    expect(result.rows[0].errors).toEqual(['Rows 2 and 3 both resolve to “Volume”.']);
    expect(result.rows[1].errors).toEqual(['Rows 2 and 3 both resolve to “Volume”.']);
    expect(result.rows[2]).toMatchObject({ action: 'create', errors: [], warnings: [SAME_NAME], selectedByDefault: false });
  });

  it('a parameterId that is not in the owner is an error', () => {
    expect(plan(['parameterId', 'parameterSet', 'parameter'], [['cycles', 'Buffers', 'Cycles']]).rows[0].errors).toEqual(['No parameter has id “cycles”.']);
  });
});

describe('Parameter List — type, options, validation (rules 18, 19, 22)', () => {
  const options = (cell: string) => plan(['parameterId', 'parameterSet', 'parameter', 'options'], [['sample_type', 'Buffers', 'Sample Type', cell]]);

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
    const result = plan(['parameterId', 'parameterSet', 'parameter', 'options'], [['volume', 'Buffers', 'Volume', 'A; B']]);
    expect(result.rows[0].warnings).toEqual(['options ignored: Number parameters have none.']);
    expect(result.rows[0].errors).toEqual([]);
  });

  it('never splits a stored option name that contains ";" (Review Focus 2)', () => {
    const odd = catalogOf({ sets: [{ id: 's', name: 'Odd', parameters: [{ id: 'k', name: 'Kind', type: 'dropdown', options: [{ id: 'ab', name: 'A; B' }, { id: 'c', name: 'C' }] }] }] });
    const [header, ...rows] = parameterListExportRows(odd);
    expect(planParameterList(rawSheet('parameterList', header, rows), odd, none).rows[0].action).toBe('unchanged');
    const edited = planParameterList(rawSheet('parameterList', ['parameterId', 'parameterSet', 'parameter', 'options'], [['k', 'Odd', 'Kind', 'A; B; D']]), odd, none);
    expect(edited.rows[0].warnings).toEqual(['An existing option name contains “;”, so its options can only be edited in the editor; the options cell is ignored.']);
    expect(edited.rows[0].action).toBe('unchanged');
  });

  it('Checkboxes is a multi-value dropdown shown as checkboxes; Dropdown clears the flag', () => {
    const toCheck = plan(['parameterSet', 'parameter', 'type', 'options'], [['Buffers', 'Kind', 'Checkboxes', 'A; B']]);
    expect(buildOwnerParameters(toCheck.work.owners[0], new Set([toCheck.rows[0].key]))[2]).toMatchObject({ type: 'dropdown', display: 'checkboxes', allowMultipleValues: true });
    const toDropdown = plan(['parameterId', 'parameterSet', 'parameter', 'type'], [['sample_type', 'Buffers', 'Sample Type', 'Dropdown']]);
    const next = buildOwnerParameters(toDropdown.work.owners[0], new Set([toDropdown.rows[0].key]))[1];
    expect(next.type).toBe('dropdown');
    expect('display' in next).toBe(false);
  });

  it('refuses an unknown type, an unparseable validation, and a validation on a non-number', () => {
    expect(plan(['parameterSet', 'parameter', 'type'], [['Buffers', 'pH', 'Slider']]).rows[0].errors).toEqual(['Unknown type “Slider”.']);
    expect(plan(['parameterId', 'parameterSet', 'parameter', 'validation'], [['volume', 'Buffers', 'Volume', '>0 || <5']]).rows[0].errors).toEqual(['validation: “||” is not supported — join rules with &&.']);
    expect(plan(['parameterSet', 'parameter', 'type', 'validation'], [['Buffers', 'Notes', 'Text', '>0']]).rows[0].errors).toEqual(['Only Number parameters can have a validation.']);
  });

  it('refuses a yes/no cell it cannot read', () => {
    expect(plan(['parameterId', 'parameterSet', 'parameter', 'required'], [['volume', 'Buffers', 'Volume', 'maybe']]).rows[0].errors).toEqual(['required: “maybe” must be Y or N.']);
  });
});

describe('Parameter List — M6: stored CRLF reads as the same as the LF the reader gives', () => {
  it('is unchanged when only the line ends differ', () => {
    const crlf = catalogOf({ sets: [{ id: 'set1', name: 'Buffers', parameters: [{ id: 'v', name: 'Volume', type: 'string', description: 'a\r\nb' }] }] });
    const result = plan(['parameterId', 'parameterSet', 'parameter', 'description'], [['v', 'Buffers', 'Volume', 'a\nb']], none, crlf);
    expect(result.rows[0].action).toBe('unchanged');
  });
});

describe('Parameter List — F15', () => {
  const emptyDropdown = catalogOf({ sets: [{ id: 'set1', name: 'Buffers', parameters: [{ id: 'kind', name: 'Kind', type: 'dropdown', description: 'old', options: [] }] }] });

  it('(a) an unrelated edit to a stored zero-option dropdown is not refused', () => {
    const result = plan(['parameterId', 'parameterSet', 'parameter', 'description'], [['kind', 'Buffers', 'Kind', 'new']], none, emptyDropdown);
    expect(result.rows[0]).toMatchObject({ action: 'update', errors: [] });
  });

  it('(a) but touching its type or options still needs an option, and so does a create', () => {
    expect(plan(['parameterId', 'parameterSet', 'parameter', 'options'], [['kind', 'Buffers', 'Kind', '']], none, emptyDropdown).rows[0].action).toBe('unchanged');
    expect(plan(['parameterId', 'parameterSet', 'parameter', 'type', 'options'], [['kind', 'Buffers', 'Kind', 'Checkboxes', '']], none, emptyDropdown).rows[0].errors)
      .toEqual(['A Dropdown or Checkboxes parameter needs at least one option.']);
    expect(plan(['parameterSet', 'parameter', 'type'], [['Buffers', 'Fresh', 'Dropdown']], none, emptyDropdown).rows[0].errors)
      .toEqual(['A Dropdown or Checkboxes parameter needs at least one option.']);
  });

  it('(b) two stored sets with one name are an explicit error, as operations get', () => {
    const twins = catalogOf({ sets: [{ id: 'a', name: 'Buffers', parameters: [] }, { id: 'b', name: 'Buffers ', parameters: [] }] });
    const result = plan(['parameterSet', 'parameter'], [['Buffers', 'Volume']], none, twins);
    expect(result.rows[0]).toMatchObject({ action: 'skip', errors: ['2 parameter sets are named “Buffers” — its parameters cannot say which.'] });
  });
});

describe('Parameter List — conditionalDisplayLogic (show-only-if rules 24–28)', () => {
  const sampleType = { id: 'sample_type', name: 'Sample Type', type: 'dropdown', options: [{ id: 'bact', name: 'Bacteria' }, { id: 'yeast', name: 'Yeast' }] };
  const isBacteria = { parameterId: 'sample_type', op: 'eq', optionIds: ['bact'] };
  const extraction = {
    id: 'setX',
    name: 'Nucleic Acid Extraction',
    parameters: [sampleType, { id: 'lysis', name: 'Lysis', type: 'string', showIf: isBacteria, price: 3 }, { id: 'elution', name: 'Elution volume', type: 'number' }]
  };
  const pcrOp: any = {
    id: 'op1',
    name: 'PCR',
    parameterSetIds: ['setX'],
    ownParameters: [
      { id: 'hot', name: 'Hot start', type: 'boolean' },
      { id: 'polymerase', name: 'Polymerase', type: 'string', showIf: { all: [{ parameterId: 'sample_type', parameterSetId: 'setX', op: 'eq', optionIds: ['bact'] }, { parameterId: 'hot', op: 'eq', value: true }] } }
    ]
  };
  const cat = catalogOf({ sets: [extraction], operations: [pcrOp] });
  const planIn = (columns: string[], rows: string[][]) => plan(columns, rows, none, cat);
  const logicOf = (rows: string[][], header: string[]): string[] => rows.map((row) => row[header.indexOf('conditionalDisplayLogic')]);

  it('is a column of the sheet, exported after validation (rule 24)', () => {
    expect(COLUMNS.indexOf('conditionalDisplayLogic')).toBe(COLUMNS.indexOf('validation') + 1);
  });

  it('download writes each condition from the stored ids with current names: unqualified in the same list, "Set"."Parameter" otherwise (rule 25)', () => {
    const [header, ...rows] = parameterListExportRows(cat);
    expect(logicOf(rows, header)).toEqual(['', '"Sample Type"=="Bacteria"', '', '', '"Nucleic Acid Extraction"."Sample Type"=="Bacteria" && "Hot start"==true']);
  });

  it('download writes a reference that no longer resolves as "<missing>"', () => {
    const orphan = catalogOf({ sets: [{ id: 's', name: 'S', parameters: [{ id: 'a', name: 'A', type: 'string', showIf: { parameterId: 'gone', parameterSetId: 'deleted', op: 'eq', value: 'x' } }] }] });
    const [header, ...rows] = parameterListExportRows(orphan);
    expect(logicOf(rows, header)).toEqual(['"<missing>"=="x"']);
    // …and that same sheet uploads as unchanged.
    expect(plan(header, rows, none, orphan).rows.map((r) => r.action)).toEqual(['unchanged']);
  });

  it('download → upload with no edits is all unchanged (rule 26); without its ids every row would create a second parameter, and the conditions name those', () => {
    const [header, ...rows] = parameterListExportRows(cat);
    expect(planIn(header, rows).rows.map((r) => r.action)).toEqual(['unchanged', 'unchanged', 'unchanged', 'unchanged', 'unchanged']);
    const idless = planIn(header.slice(1), rows.map((r) => r.slice(1)));
    expect(idless.rows.map((r) => [r.action, r.selectedByDefault, r.errors])).toEqual(Array(5).fill(['create', false, []]));
    const [set, operation] = idless.work.owners.map((owner) => buildOwnerParameters(owner, new Set(owner.entries.map((entry) => entry.rowKey))));
    expect(set.map((p) => p.id)).toEqual(['sample_type', 'lysis', 'elution', 'sample_type_2', 'lysis_2', 'elution_volume']);
    // The new “Sample Type” is another parameter, so its options are its own.
    expect(set[4].showIf).toEqual({ parameterId: 'sample_type_2', op: 'eq', optionIds: ['bacteria'] });
    expect(operation.map((p) => p.id)).toEqual(['hot', 'polymerase', 'hot_start', 'polymerase_2']);
  });

  it('a cell that differs only in spacing outside quotes or in quote style is unchanged (rule 26)', () => {
    const result = planIn(['parameterId', 'parameterSet', 'parameter', 'conditionalDisplayLogic'], [['lysis', 'Nucleic Acid Extraction', 'Lysis', ' “Sample Type”  ==  ‘Bacteria’ ']]);
    expect(result.rows[0]).toMatchObject({ action: 'unchanged', changed: [], errors: [] });
    expect(result.work.owners[0].entries).toEqual([]);
  });

  it('a cell that is written differently but means the stored condition is unchanged too', () => {
    const result = planIn(['parameterId', 'parameterSet', 'parameter', 'conditionalDisplayLogic'], [['lysis', 'Nucleic Acid Extraction', 'Lysis', '("Nucleic Acid Extraction"."Sample Type" == "bacteria")']]);
    expect(result.rows[0]).toMatchObject({ action: 'unchanged', changed: [], errors: [], selectedByDefault: false });
    expect(result.work.owners[0].entries).toEqual([]);
  });

  it('a changed cell is stored as ids, and every field without a column is left alone (rule 27)', () => {
    const result = planIn(['parameterId', 'parameterSet', 'parameter', 'conditionalDisplayLogic'], [['lysis', 'Nucleic Acid Extraction', 'Lysis', '"Sample Type"!="Bacteria" || "Elution volume">=50']]);
    expect(result.rows[0]).toMatchObject({ action: 'update', changed: ['conditionalDisplayLogic'], errors: [] });
    const next = buildOwnerParameters(result.work.owners[0], new Set([result.rows[0].key]));
    expect(next[1]).toEqual({
      id: 'lysis', name: 'Lysis', type: 'string', price: 3,
      showIf: { any: [{ parameterId: 'sample_type', op: 'ne', optionIds: ['bact'] }, { parameterId: 'elution', op: 'ge', value: 50 }] }
    });
  });

  it('an operation’s own parameter can name a set parameter, qualified', () => {
    const result = planIn(['parameterId', 'operation', 'parameter', 'conditionalDisplayLogic'], [['hot', 'PCR', 'Hot start', '"Nucleic Acid Extraction"."Sample Type" in ("Bacteria","Yeast")']]);
    expect(result.rows[0]).toMatchObject({ action: 'update', errors: [] });
    expect(buildOwnerParameters(result.work.owners[0], new Set([result.rows[0].key]))[0].showIf).toEqual({ parameterId: 'sample_type', parameterSetId: 'setX', op: 'in', optionIds: ['bact', 'yeast'] });
  });

  it('a new parameter can carry a condition', () => {
    const result = planIn(['parameterSet', 'parameter', 'type', 'conditionalDisplayLogic'], [['Nucleic Acid Extraction', 'Bead size', 'Number', '"Sample Type"=="Yeast"']]);
    expect(result.rows[0]).toMatchObject({ action: 'create', errors: [] });
    const next = buildOwnerParameters(result.work.owners[0], new Set([result.rows[0].key]));
    expect(next[3]).toMatchObject({ id: 'bead_size', showIf: { parameterId: 'sample_type', op: 'eq', optionIds: ['yeast'] } });
  });

  it.each([
    ['prose, not a condition', 'Enzyme used depends on template', 'conditionalDisplayLogic: Expected a quoted parameter name but found “Enzyme”.'],
    ['an unknown set', '"Buffers"."Volume">5', 'conditionalDisplayLogic: No parameter set is named “Buffers”.'],
    ['an unknown parameter', '"Organism"=="Bacteria"', 'conditionalDisplayLogic: No parameter is named “Organism” here.'],
    ['a value that is not an option', '"Sample Type"=="Fungi"', 'conditionalDisplayLogic: “Fungi” is not an option of “Sample Type”.'],
    ['itself', '"Lysis"=="x"', 'conditionalDisplayLogic: A parameter cannot depend on itself.']
  ])('a rule-6 error is a row error and the row is skipped: %s', (_name, cell, message) => {
    const result = planIn(['parameterId', 'parameterSet', 'parameter', 'description', 'conditionalDisplayLogic'], [['lysis', 'Nucleic Acid Extraction', 'Lysis', 'Changed too', cell]]);
    expect(result.rows[0]).toMatchObject({ action: 'skip', errors: [message], changed: [], selectedByDefault: false });
    expect(result.work.owners[0].entries).toEqual([]);
  });

  it('a set parameter cannot name an operation’s own parameter (rule 5)', () => {
    const result = planIn(['parameterId', 'parameterSet', 'parameter', 'conditionalDisplayLogic'], [['elution', 'Nucleic Acid Extraction', 'Elution volume', '"Hot start"==true']]);
    expect(result.rows[0].errors).toEqual(['conditionalDisplayLogic: No parameter is named “Hot start” here.']);
  });

  it('a loop with a stored condition is refused', () => {
    // Lysis already depends on Sample Type.
    const result = planIn(['parameterId', 'parameterSet', 'parameter', 'conditionalDisplayLogic'], [['sample_type', 'Nucleic Acid Extraction', 'Sample Type', '"Lysis"=="x"']]);
    expect(result.rows[0].errors).toEqual(['conditionalDisplayLogic: This condition would form a loop: the parameter it depends on depends, in turn, on this one.']);
  });

  it('a blank cell on a parameter that has a condition removes it, with a warning (rule 28)', () => {
    const result = planIn(['parameterId', 'parameterSet', 'parameter', 'conditionalDisplayLogic'], [['lysis', 'Nucleic Acid Extraction', 'Lysis', ''], ['elution', 'Nucleic Acid Extraction', 'Elution volume', '']]);
    expect(result.rows[0]).toMatchObject({ action: 'update', changed: ['conditionalDisplayLogic'], warnings: ['The conditionalDisplayLogic cell is blank: the condition will be removed.'] });
    expect(result.rows[1]).toMatchObject({ action: 'unchanged', warnings: [] });
    const next = buildOwnerParameters(result.work.owners[0], new Set([result.rows[0].key]));
    expect(next[1]).toEqual({ id: 'lysis', name: 'Lysis', type: 'string', price: 3 });
  });

  it('a sheet without the column changes no condition (rule 28)', () => {
    const result = planIn(['parameterId', 'parameterSet', 'parameter', 'description'], [['lysis', 'Nucleic Acid Extraction', 'Lysis', 'How the cells are opened']]);
    expect(result.rows[0]).toMatchObject({ action: 'update', changed: ['description'], warnings: [] });
    expect(buildOwnerParameters(result.work.owners[0], new Set([result.rows[0].key]))[1].showIf).toEqual(isBacteria);
  });

  it('a row that changes another column keeps a condition it did not touch, even one that no longer resolves', () => {
    const orphan = catalogOf({ sets: [{ id: 's', name: 'S', parameters: [{ id: 'a', name: 'A', type: 'string', showIf: { parameterId: 'gone', op: 'eq', value: 'x' } }] }] });
    const result = plan(['parameterId', 'parameterSet', 'parameter', 'description', 'conditionalDisplayLogic'], [['a', 'S', 'A', 'New text', '"<missing>"=="x"']], none, orphan);
    expect(result.rows[0]).toMatchObject({ action: 'update', changed: ['description'], errors: [] });
    expect(buildOwnerParameters(result.work.owners[0], new Set([result.rows[0].key]))[0].showIf).toEqual({ parameterId: 'gone', op: 'eq', value: 'x' });
  });
});
