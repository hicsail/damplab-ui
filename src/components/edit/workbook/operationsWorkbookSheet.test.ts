import { describe, expect, it } from 'vitest';
import { categoryLabelOf, categoryWrites, operationRowsByName, operationsExportRows, planOperations, resolveOperationName, setColumnCount } from './operationsWorkbookSheet';
import { catalogOf, rawSheet } from './testSupport';

const pcr: any = {
  id: 'op1', name: 'PCR', description: 'Amplify', unit: 'rxn', pricingMode: 'SERVICE', hiddenFromClients: false,
  pricing: { internal: 5, external: 9, externalAcademic: 7, externalMarket: 9, externalNoSalary: 6, legacy: 10 },
  parameterSetIds: ['s1', 's2'], ownParameters: []
};
const gibson: any = { id: 'op2', name: 'Gibson Assembly', description: '', pricingMode: 'PARAMETER', hiddenFromClients: true, parameterSetIds: [], ownParameters: [] };
const old: any = { id: 'op3', name: 'Old method', parameterSetIds: [], ownParameters: [] };
const catalog = catalogOf({
  operations: [pcr, gibson, old],
  sets: [{ id: 's1', name: 'Buffers', parameters: [] }, { id: 's2', name: 'Cleanup', parameters: [] }],
  categories: [{ id: 'c1', label: 'Molecular Biology', serviceIds: ['op1', 'op3'] }, { id: 'c2', label: 'Cloning', serviceIds: [] }]
});
const SAME_NAME = 'Same name as an existing operation — this row creates a second one. Add the id to update it instead.';
const ctx = { newSetRows: new Map<string, string[]>(), allowPricing: true, hideMissing: false };
const plan = (columns: string[], rows: string[][], over: Partial<typeof ctx> = {}) => planOperations(rawSheet('operations', columns, rows), catalog, { ...ctx, ...over });

describe('Operations — download rows (rules 11, 13)', () => {
  it('writes the fixed columns, then N = most sets + 2 parameterSet columns, minimum 5', () => {
    expect(setColumnCount(catalog)).toBe(5);
    expect(setColumnCount(catalogOf({ operations: [{ ...pcr, parameterSetIds: ['a', 'b', 'c', 'd'] }] }))).toBe(6);
    const [header, first, second] = operationsExportRows(catalog, true);
    expect(header).toEqual([
      'id', 'serviceCategory', 'name', 'description', 'unit', 'hiddenFromClients', 'pricingMode',
      'pricingInternal', 'pricingExternalAcademic', 'pricingExternalMarket', 'pricingExternalNoSalary', 'pricingLegacy',
      'parameterSet1', 'parameterSet2', 'parameterSet3', 'parameterSet4', 'parameterSet5'
    ]);
    expect(first).toEqual(['op1', 'Molecular Biology', 'PCR', 'Amplify', 'rxn', 'N', 'SERVICE', 5, 7, 9, 6, 10, 'Buffers', 'Cleanup', '', '', '']);
    expect(second).toEqual(['op2', '', 'Gibson Assembly', '', '', 'Y', 'PARAMETER', '', '', '', '', '', '', '', '', '', '']);
  });

  it('never writes serviceCategoryNumber, and leaves the pricing columns out without internal-fields:read', () => {
    const [header] = operationsExportRows(catalog, false);
    expect(header).not.toContain('serviceCategoryNumber');
    expect(header.filter((c) => String(c).startsWith('pricing'))).toEqual(['pricingMode']);
  });

  it('reads an operation’s category from the canvas categories', () => {
    expect(categoryLabelOf('op1', catalog.categories)).toBe('Molecular Biology');
    expect(categoryLabelOf('op2', catalog.categories)).toBe('');
  });
});

describe('Operations — a downloaded sheet uploaded unchanged (rule 2)', () => {
  it('is all "unchanged" with its ids; without them each operation would be created a second time', () => {
    const [header, ...rows] = operationsExportRows(catalog, true);
    const asText = rows.map((r) => r.map(String));
    expect(plan(header.map(String), asText).rows.map((r) => r.action)).toEqual(['unchanged', 'unchanged', 'unchanged']);
    const idless = plan(header.map(String).slice(1), asText.map((r) => r.slice(1)));
    expect(idless.rows.map((r) => [r.action, r.warnings[0], r.selectedByDefault])).toEqual(Array(3).fill(['create', SAME_NAME, false]));
    expect(Object.values(idless.work.rows).map((work) => work.existingId)).toEqual([undefined, undefined, undefined]);
  });
});

describe('Operations — fields (rules 6, 11)', () => {
  it('updates only the cells that differ, and reads yes/no loosely', () => {
    const result = plan(['id', 'name', 'description', 'hiddenFromClients'], [['op1', 'PCR', 'Amplify DNA', 'yes']]);
    expect(result.rows[0]).toMatchObject({ action: 'update', changed: ['description', 'hiddenFromClients'], errors: [] });
    expect(result.work.rows[result.rows[0].key]).toMatchObject({ existingId: 'op1', fields: { description: 'Amplify DNA', hiddenFromClients: true }, before: { description: 'Amplify', hiddenFromClients: false } });
  });

  it('renames by id; a blank name on an existing operation is an error', () => {
    expect(plan(['id', 'name'], [['op1', 'PCR v2']]).work.rows['operations:2'].fields).toEqual({ name: 'PCR v2' });
    expect(plan(['id', 'name'], [['op1', '']]).rows[0].errors).toEqual(['Name cannot be blank.']);
  });

  it('a present, blank unit clears it', () => {
    expect(plan(['id', 'unit'], [['op1', '']]).work.rows['operations:2'].fields).toEqual({ unit: null });
  });

  it('writes a changed tier to the nested pricing and the flat field, keeping the other tiers', () => {
    const fields = plan(['id', 'pricingInternal'], [['op1', '$6.50']]).work.rows['operations:2'].fields;
    expect(fields).toEqual({ internalPrice: 6.5, pricing: { internal: 6.5, external: 9, externalAcademic: 7, externalMarket: 9, externalNoSalary: 6, legacy: 10 } });
  });

  it('ignores pricing columns, and says so, without internal-fields:read', () => {
    const result = plan(['id', 'pricingInternal', 'description'], [['op1', '999', 'Amplify']], { allowPricing: false });
    expect(result.rows[0].action).toBe('unchanged');
    expect(result.ignoredColumns).toEqual(['pricingInternal (needs internal-fields:read)']);
  });

  it('refuses a bad price, pricing mode or yes/no', () => {
    expect(plan(['id', 'pricingLegacy'], [['op1', 'free']]).rows[0].errors).toEqual(['pricingLegacy: “free” is not a valid price.']);
    expect(plan(['id', 'pricingMode'], [['op1', 'HOURLY']]).rows[0].errors).toEqual(['pricingMode: “HOURLY” must be SERVICE or PARAMETER.']);
    expect(plan(['id', 'hiddenFromClients'], [['op1', 'maybe']]).rows[0].errors).toEqual(['hiddenFromClients: “maybe” must be Y or N.']);
  });

  it('creates an operation with the fields CreateService requires', () => {
    const result = plan(['name', 'description', 'serviceCategory'], [['Ligation', 'Join', 'cloning']]);
    expect(result.rows[0]).toMatchObject({ action: 'create', errors: [], label: 'Ligation' });
    expect(result.work.rows['operations:2']).toMatchObject({
      existingId: undefined, name: 'Ligation', category: 'Cloning',
      fields: { name: 'Ligation', icon: '', description: 'Join', allowedConnections: [], parameters: [], paramGroups: [], deliverables: [], protocolIds: [], pricingMode: 'SERVICE', serviceCategoryName: 'Cloning' }
    });
  });
});

describe('Operations — what a name on another sheet means (workbook first)', () => {
  const sheet = rawSheet('operations', ['id', 'name'], [['', 'Ligation'], ['op1', 'PCR v2'], ['', 'Twice'], ['op2', 'Twice'], ['gone', 'Lost'], ['op3', '']]);
  const rows = operationRowsByName(sheet);

  it('lists every row under its name cell as uploaded — with an id or without; a blank name carries none', () => {
    expect(rows).toEqual(new Map([
      ['Ligation', [{ rowKey: 'operations:2', rowNumber: 2, id: '' }]],
      ['PCR v2', [{ rowKey: 'operations:3', rowNumber: 3, id: 'op1' }]],
      ['Twice', [{ rowKey: 'operations:4', rowNumber: 4, id: '' }, { rowKey: 'operations:5', rowNumber: 5, id: 'op2' }]],
      ['Lost', [{ rowKey: 'operations:6', rowNumber: 6, id: 'gone' }]]
    ]));
    expect(operationRowsByName(undefined)).toEqual(new Map());
  });

  it.each([
    ['one row with an id: the stored operation, by its new name', 'PCR v2', { kind: 'existing', operation: pcr }],
    ['one row without an id: the operation that row creates', 'Ligation', { kind: 'row', rowKey: 'operations:2' }],
    ['two rows: cannot say which', 'Twice', { kind: 'error', message: 'Rows 4 and 5 are both named “Twice” — rename one so this row can say which.' }],
    ['one row whose id matches nothing', 'Lost', { kind: 'error', message: 'Row 6 is named “Lost”, but no operation has its id.' }],
    ['no row: the one stored operation of that name', 'Gibson Assembly', { kind: 'existing', operation: gibson }],
    ['no row: a stored name a row has renamed is still found', 'PCR', { kind: 'existing', operation: pcr }],
    ['no row and no stored operation', 'Nope', { kind: 'catalog', count: 0 }]
  ])('%s', (_case, name, expected) => {
    expect(resolveOperationName(name, rows, catalog)).toEqual(expected);
  });

  it('no row and two stored operations of that name', () => {
    const twins = catalogOf({ operations: [{ ...old, id: 'a', name: 'Twin' }, { ...old, id: 'b', name: 'Twin ' }] });
    expect(resolveOperationName('Twin', new Map(), twins)).toEqual({ kind: 'catalog', count: 2 });
  });
});

describe('Operations — serviceCategory (rule 12)', () => {
  it('moves the operation to the category with that label and sets serviceCategoryName', () => {
    const row = plan(['id', 'serviceCategory'], [['op1', 'Cloning']]);
    expect(row.rows[0]).toMatchObject({ action: 'update', changed: ['serviceCategory'] });
    expect(row.work.rows['operations:2']).toMatchObject({ category: 'Cloning', fields: { serviceCategoryName: 'Cloning' } });
  });

  it('a new label will create the category', () => {
    expect(plan(['id', 'serviceCategory'], [['op1', 'Sequencing']]).work.rows['operations:2'].category).toBe('Sequencing');
  });

  it('a blank cell removes it from every category and warns', () => {
    const result = plan(['id', 'serviceCategory'], [['op1', '']]);
    expect(result.rows[0]).toMatchObject({ action: 'update', warnings: ['will not appear in any canvas dropdown'] });
    expect(result.work.rows['operations:2']).toMatchObject({ category: '', fields: { serviceCategoryName: null } });
  });

  it('writes one updateCategory per changed category and one createCategory per new label', () => {
    expect(categoryWrites(catalog.categories, [{ operationId: 'op1', label: 'Cloning' }, { operationId: 'new1', label: 'Sequencing' }, { operationId: 'new2', label: 'sequencing' }, { operationId: 'op3', label: '' }])).toEqual({
      creates: [{ label: 'Sequencing', services: ['new1', 'new2'] }],
      updates: [{ id: 'c1', label: 'Molecular Biology', services: [] }, { id: 'c2', label: 'Cloning', services: ['op1'] }]
    });
    expect(categoryWrites(catalog.categories, [])).toEqual({ creates: [], updates: [] });
  });
});

describe('Operations — parameterSet columns (rule 13)', () => {
  it('reads every parameterSet<digits> column in numeric order, ignoring blanks, and replaces the list', () => {
    const result = plan(['id', 'parameterSet10', 'parameterSet2', 'parameterSet1'], [['op1', 'Buffers', '', 'Cleanup']]);
    expect(result.rows[0]).toMatchObject({ action: 'update', changed: ['parameterSets'] });
    expect(result.work.rows['operations:2'].setNames).toEqual(['Cleanup', 'Buffers']);
  });

  it('clearing every cell removes every set', () => {
    expect(plan(['id', 'parameterSet1', 'parameterSet2'], [['op1', '', '']]).work.rows['operations:2'].setNames).toEqual([]);
  });

  it('an unknown set is an error; the same set twice is an error', () => {
    expect(plan(['id', 'parameterSet1'], [['op2', 'Salts']]).rows[0].errors).toEqual(['Unknown parameter set “Salts”.']);
    expect(plan(['id', 'parameterSet1', 'parameterSet2'], [['op2', 'Buffers', 'Buffers']]).rows[0].errors).toEqual(['Parameter set “Buffers” is listed twice.']);
  });

  it('a set this upload creates is a need, not an error', () => {
    const result = plan(['id', 'parameterSet1'], [['op2', 'Salts']], { newSetRows: new Map([['Salts', ['parameterList:4', 'parameterList:5']]]) });
    expect(result.rows[0]).toMatchObject({ action: 'update', errors: [], needs: [{ what: 'parameter set “Salts”', anyOf: ['parameterList:4', 'parameterList:5'] }] });
  });
});

describe('Operations — "Hide operations not in this sheet from clients" (rule 14)', () => {
  it('is off by default', () => {
    expect(plan(['id', 'name'], [['op1', 'PCR']]).rows).toHaveLength(1);
  });

  it('adds one ticked "hide" row per operation no row matched and that is not already hidden', () => {
    const result = plan(['id', 'name'], [['op1', 'PCR']], { hideMissing: true });
    expect(result.rows.map((r) => [r.key, r.action, r.label, r.selectedByDefault, r.rowNumber])).toEqual([
      ['operations:2', 'unchanged', 'PCR', false, 2],
      ['hide:op3', 'hide', 'Old method', true, null]
    ]);
    expect(result.work.hides).toEqual({ 'hide:op3': { id: 'op3', name: 'Old method' } });
    expect(result.rowCount).toBe(1);
  });

  it('counts a row that matched but has an error as mentioned, so its operation is not hidden', () => {
    const result = plan(['id', 'name', 'pricingMode'], [['op3', 'Old method', 'HOURLY']], { hideMissing: true });
    expect(result.rows.map((r) => r.key)).toEqual(['operations:2', 'hide:op1']);
  });
});

describe('Operations — M6: stored CRLF reads as the same as the LF the reader gives', () => {
  it('is unchanged when only the line ends differ', () => {
    const crlf = catalogOf({ operations: [{ ...pcr, description: 'Line one\r\nLine two', parameterSetIds: [] }] });
    const result = planOperations(rawSheet('operations', ['id', 'name', 'description'], [['op1', 'PCR', 'Line one\nLine two']]), crlf, ctx);
    expect(result.rows[0].action).toBe('unchanged');
  });
});

describe('Operations — F16: the category warning belongs to a row that writes a blank category', () => {
  it('an untouched download of an uncategorised operation is quiet', () => {
    const [header, ...body] = operationsExportRows(catalog, true).map((r) => r.map(String));
    const result = plan(header, body);
    const gibsonRow = result.rows.find((row) => row.label === 'Gibson Assembly')!;
    expect(gibsonRow).toMatchObject({ action: 'unchanged', warnings: [] });
    expect(result.rows.flatMap((row) => row.warnings)).toEqual([]);
  });

  it('an uncategorised operation updated for another field is quiet too', () => {
    const result = plan(['id', 'name', 'serviceCategory', 'description'], [['op2', 'Gibson Assembly', '', 'New text']]);
    expect(result.rows[0]).toMatchObject({ action: 'update', warnings: [] });
  });

  it('a new operation with a blank category still warns', () => {
    const result = plan(['name', 'serviceCategory'], [['Brand new', '']]);
    expect(result.rows[0]).toMatchObject({ action: 'create', warnings: ['will not appear in any canvas dropdown'] });
  });
});

describe('Operations — M1: hide rows leave out an operation the sheet names, id or not', () => {
  it('a row without an id creates a second operation of that name, and no stored operation of that name is offered for hiding', () => {
    const twinA: any = { id: 'tw1', name: 'Twin', parameterSetIds: [], ownParameters: [] };
    const twinB: any = { id: 'tw2', name: 'Twin', parameterSetIds: [], ownParameters: [] };
    const twins = catalogOf({ operations: [twinA, twinB, old] });
    const result = planOperations(rawSheet('operations', ['name'], [['Twin']]), twins, { ...ctx, hideMissing: true });
    expect(result.rows.map((r) => [r.key, r.action])).toEqual([['operations:2', 'create'], ['hide:op3', 'hide']]);
    expect(result.rows[0]).toMatchObject({ warnings: [SAME_NAME], selectedByDefault: false });
  });
});
