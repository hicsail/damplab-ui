import { describe, expect, it } from 'vitest';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { allRows, planWorkbook, sheetPlans, tickedKeys, unmetNeeds } from './planWorkbook';
import { readWorkbook } from './readWorkbook';
import { catalogOf } from './testSupport';
import { buildWorkbookData, SPARE_ROWS, WorkbookData, writeWorkbook } from './writeWorkbook';

const options = [{ id: 'bact', name: 'Bacteria', price: 9 }, { id: 'oth', name: 'Other' }];
const catalog = catalogOf({
  sets: [
    {
      id: 's1', name: 'Buffers', parameters: [
        { id: 'volume', name: 'Volume', description: 'In µL', type: 'number', required: true, rangeValueMin: 1, rangeValueMax: 50, price: 4 },
        { id: 'sample_type', name: 'Sample Type', type: 'dropdown', allowMultipleValues: true, display: 'checkboxes', options }
      ]
    },
    { id: 's2', name: 'Cleanup', parameters: [{ id: 'method', name: 'Method', type: 'dropdown', options, defaultValue: 'bact', showIf: { parameterId: 'sample_type', parameterSetId: 's1', op: 'in', optionIds: ['bact', 'oth'] } }] }
  ],
  operations: [
    {
      id: 'op1', name: 'PCR', description: 'Amplify', unit: 'rxn', pricingMode: 'SERVICE', hiddenFromClients: false,
      pricing: { internal: 5, external: 9, externalAcademic: 7, externalMarket: 9, externalNoSalary: 6, legacy: 10 },
      parameterSetIds: ['s1', 's2'],
      ownParameters: [
        { id: 'cycles', name: 'Cycles', type: 'number', validation: '>0 && integer', defaultValue: 30, showIf: { any: [{ parameterId: 'hot', op: 'eq', value: false }, { parameterId: 'volume', parameterSetId: 's1', op: 'gt', value: 2.5 }] } },
        { id: 'hot', name: 'Hot start', type: 'boolean', required: true }
      ]
    } as any,
    { id: 'op2', name: 'Gibson Assembly', pricingMode: 'PARAMETER', hiddenFromClients: true, parameterSetIds: [], ownParameters: [] } as any
  ],
  categories: [{ id: 'c1', label: 'Molecular Biology', serviceIds: ['op1'] }, { id: 'c2', label: 'Cloning', serviceIds: [] }],
  bundles: [
    { id: 'b1', label: 'Cloning', icon: 'dna.png', steps: [{ id: 'op1', name: 'PCR' }, { id: 'op2', name: 'Gibson Assembly' }, { id: 'op1', name: 'PCR' }] },
    { id: 'b2', label: 'Empty', icon: '', steps: [] }
  ],
  sowPresets: [
    { id: 'p1', sectionKey: 'terms', name: 'Default', text: 'Net 30.\n- No refunds', order: 1000 },
    { id: 'p2', sectionKey: 'invoiceProcedures', name: 'Default', text: '', order: 1000 }
  ],
  sowSectionKeys: ['invoiceProcedures', 'terms']
});

const upload = async (data: WorkbookData) => {
  const buffer = await writeWorkbook(data);
  const raw = readWorkbook(XLSX.read(new Uint8Array(buffer), { type: 'array', cellDates: true }));
  return { raw, plan: planWorkbook(raw, catalog, { allowPricing: true, hideMissing: true }) };
};

describe('download → upload, unchanged (rule 2)', () => {
  it('previews zero creates, zero updates, zero errors — and nothing ignored', async () => {
    const { raw, plan } = await upload(buildWorkbookData(catalog, { includePricing: true }));
    expect(sheetPlans(plan).map((s) => s.sheet)).toEqual(['operations', 'parameterList', 'bundles', 'sowSections']);
    const rows = allRows(plan);
    expect(rows.length).toBe(2 + 5 + 2 + 2);
    expect(rows.filter((r) => r.action !== 'unchanged').map((r) => `${r.key}: ${r.action} ${r.changed.join(',')} ${r.errors.join(' ')}`)).toEqual([]);
    expect(rows.flatMap((r) => r.errors)).toEqual([]);
    expect(raw.ignoredSheets).toEqual([]);
    expect(sheetPlans(plan).flatMap((s) => s.ignoredColumns)).toEqual([]);
  });

  it('with every id column removed nothing is matched by name: every row is a create, and each one that names a stored record is warned and unticked', async () => {
    const data = buildWorkbookData(catalog, { includePricing: true });
    const withoutIds: WorkbookData = { ...data, sheets: data.sheets.map((sheet) => ({ ...sheet, rows: sheet.rows.map((row) => row.slice(1)) })) };
    expect(withoutIds.sheets.map((s) => s.rows[0][0])).toEqual(['serviceCategory', 'parameterSet', 'BundleName', 'sectionKey']);
    const { plan } = await upload(withoutIds);
    const rows = allRows(plan);
    expect(rows.map((r) => `${r.key}: ${r.action} ${r.errors.join(' ')}`)).toEqual([
      'operations:2: create ', 'operations:3: create ',
      'parameterList:2: create ', 'parameterList:3: create ', 'parameterList:4: create ', 'parameterList:5: create ', 'parameterList:6: create ',
      'bundles:2: create ', 'bundles:5: create ',
      'sowSections:2: create ', 'sowSections:3: create '
    ]);
    const same = (noun: string): string => `Same name as an existing ${noun} — this row creates a second one. Add the id to update it instead.`;
    const warned = (sheet: string, noun: string): boolean => rows.filter((r) => r.sheet === sheet).every((r) => r.warnings.includes(same(noun)) && !r.selectedByDefault);
    expect(warned('operations', 'operation')).toBe(true);
    expect(warned('bundles', 'bundle')).toBe(true);
    expect(warned('sowSections', 'SOW text block')).toBe(true);
    // The sets are still found by name, so their parameters would be second ones.
    expect(rows.filter((r) => r.sheet === 'parameterList').slice(0, 3).every((r) => r.warnings.includes(same('parameter')) && !r.selectedByDefault)).toBe(true);
    // "PCR" now means the operation the Operations row creates, which has no parameters yet: these wait for that row.
    expect(rows.filter((r) => r.sheet === 'parameterList').slice(3).map((r) => [r.warnings, r.needs[0]])).toEqual([
      [[], { what: 'operation “PCR”', anyOf: ['operations:2'] }],
      [[], { what: 'operation “PCR”', anyOf: ['operations:2'] }]
    ]);
    expect(plan.bundles!.work.bundles['bundles:2'].changes.steps).toEqual([
      { name: 'PCR', rowKey: 'operations:2' }, { name: 'Gibson Assembly', rowKey: 'operations:3' }, { name: 'PCR', rowKey: 'operations:2' }
    ]);
    // Nothing that is ticked by default can be applied: no stored record is touched.
    const ticked = tickedKeys(plan, {});
    expect([...ticked].filter((key) => !(key in unmetNeeds(plan, ticked)))).toEqual([]);
  });

  it('is unchanged without the pricing columns too (a reader without internal-fields:read)', async () => {
    const { plan } = await upload(buildWorkbookData(catalog, { includePricing: false }));
    expect(allRows(plan).every((r) => r.action === 'unchanged')).toBe(true);
  });
});

describe('download → upload: conditionalDisplayLogic (show-only-if rules 24–26)', () => {
  it('writes the conditions as text into the real file, and reads them back as unchanged', async () => {
    const data = buildWorkbookData(catalog, { includePricing: true });
    const sheet = data.sheets[1];
    const column = sheet.rows[0].indexOf('conditionalDisplayLogic');
    expect(column).toBe(sheet.rows[0].indexOf('validation') + 1);
    expect(sheet.rows.slice(1).map((row) => row[column])).toEqual(['', '', '"Buffers"."Sample Type" in ("Bacteria","Other")', '"Hot start"==false || "Buffers"."Volume">2.5', '']);
    const { plan } = await upload(data);
    expect(plan.parameterList!.ignoredColumns).toEqual([]);
    expect(plan.parameterList!.rows.map((r) => r.action)).toEqual(['unchanged', 'unchanged', 'unchanged', 'unchanged', 'unchanged']);
  });
});

describe('download formatting (rule 34)', () => {
  it('names the dropdown columns and their lists', () => {
    const data = buildWorkbookData(catalog, { includePricing: true });
    expect(data.sheets.map((s) => s.title)).toEqual(['Operations', 'Parameter List', 'Bundles', 'SOW Sections']);
    expect(data.sheets[0].dropdowns).toEqual({
      serviceCategory: 'categories', hiddenFromClients: 'yesNo',
      parameterSet1: 'sets', parameterSet2: 'sets', parameterSet3: 'sets', parameterSet4: 'sets', parameterSet5: 'sets'
    });
    expect(data.sheets[1].dropdowns).toEqual({ required: 'yesNo', type: 'types' });
    expect(data.sheets[2].dropdowns).toEqual({ Operation: 'operations' });
    expect(data.sheets[3].dropdowns).toEqual({});
    expect(data.lists).toEqual({
      categories: ['Molecular Biology', 'Cloning'],
      sets: ['Buffers', 'Cleanup'],
      yesNo: ['Y', 'N'],
      types: ['Text', 'Number', 'Dropdown', 'Checkboxes', 'True/False', 'Table', 'File Upload', 'Sample Upload'],
      operations: ['PCR', 'Gibson Assembly']
    });
  });

  it('writes those cells as in-cell dropdowns pointing at a hidden Lists sheet, on data rows and spare rows', async () => {
    const data = buildWorkbookData(catalog, { includePricing: true });
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await writeWorkbook(data));
    const validation = (sheetTitle: string, header: string, row: number) => {
      const sheet = workbook.getWorksheet(sheetTitle)!;
      const column = data.sheets.find((s) => s.title === sheetTitle)!.rows[0].indexOf(header) + 1;
      return sheet.getCell(row, column).dataValidation;
    };
    expect(validation('Operations', 'serviceCategory', 2)).toMatchObject({ type: 'list', formulae: ['Lists!$A$2:$A$3'] });
    expect(validation('Operations', 'hiddenFromClients', 3)).toMatchObject({ type: 'list', formulae: ['Lists!$C$2:$C$3'] });
    expect(validation('Operations', 'parameterSet5', 2)).toMatchObject({ type: 'list', formulae: ['Lists!$B$2:$B$3'] });
    expect(validation('Parameter List', 'required', 2)).toMatchObject({ type: 'list', formulae: ['Lists!$C$2:$C$3'] });
    expect(validation('Parameter List', 'type', 2)).toMatchObject({ type: 'list', formulae: ['Lists!$D$2:$D$9'] });
    expect(validation('Bundles', 'Operation', 2)).toMatchObject({ type: 'list', formulae: ['Lists!$E$2:$E$3'] });
    // A row someone adds below the data still gets the dropdown.
    expect(validation('Bundles', 'Operation', data.sheets[2].rows.length + SPARE_ROWS)).toMatchObject({ type: 'list' });
    expect(validation('Operations', 'name', 2)).toBeUndefined();
    expect(workbook.getWorksheet('Lists')!.state).toBe('hidden');
  });

  it('leaves a column without a dropdown when its list is empty', async () => {
    const empty = buildWorkbookData(catalogOf({ operations: catalog.operations, sets: catalog.sets }), { includePricing: true });
    expect(empty.lists.categories).toEqual([]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await writeWorkbook(empty));
    expect(workbook.getWorksheet('Operations')!.getCell(2, 2).dataValidation).toBeUndefined();
  });
});
