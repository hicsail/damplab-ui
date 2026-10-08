import { describe, expect, it } from 'vitest';
import { applyWorkbook, completionMessage, stoppedSummary, summaryText, WorkbookMutator } from './applyWorkbook';
import { planWorkbook, tickedKeys } from './planWorkbook';
import { catalogOf, rawSheet } from './testSupport';
import { RawWorkbook } from './types';

const catalog = catalogOf({
  operations: [
    { id: 'op1', name: 'PCR', hiddenFromClients: false, parameterSetIds: ['s1'], ownParameters: [{ id: 'cycles', name: 'Cycles', type: 'number' }] } as any,
    { id: 'op9', name: 'Old method', hiddenFromClients: false, parameterSetIds: [], ownParameters: [] } as any
  ],
  sets: [{ id: 's1', name: 'Buffers', parameters: [{ id: 'volume', name: 'Volume', type: 'number', price: 4 }] }],
  categories: [{ id: 'c1', label: 'Molecular Biology', serviceIds: ['op1'] }],
  bundles: [{ id: 'b1', label: 'Cloning', icon: 'dna.png', steps: [{ id: 'op1', name: 'PCR' }] }],
  sowPresets: [{ id: 'p1', sectionKey: 'terms', name: 'Default', text: 'Net 30.', order: 1000 }],
  sowSectionKeys: ['terms']
});
const meta = { fileName: 'catalog.xlsx', uploaderName: 'Ada', uploaderSub: 'sub-1' };

/** Records every call in order; creates return predictable ids; `fail` makes one method reject. */
const recorder = (fail: Partial<Record<keyof WorkbookMutator, string>> = {}) => {
  const calls: Array<[string, ...unknown[]]> = [];
  let next = 0;
  const call = (name: keyof WorkbookMutator, returnsId: boolean) => async (...args: unknown[]): Promise<any> => {
    calls.push([name, ...args]);
    if (fail[name]) throw new Error(fail[name]);
    return returnsId ? `new-${name}-${(next += 1)}` : undefined;
  };
  const mutator: WorkbookMutator = {
    createParameterSet: call('createParameterSet', true),
    updateParameterSet: call('updateParameterSet', false),
    createService: call('createService', true),
    updateService: call('updateService', false),
    createCategory: call('createCategory', true),
    updateCategory: call('updateCategory', false),
    createBundle: call('createBundle', true),
    updateBundle: call('updateBundle', false),
    createSowTextPreset: call('createSowTextPreset', true),
    updateSowTextPreset: call('updateSowTextPreset', false),
    createUploadLog: call('createUploadLog', false)
  };
  return { mutator, calls, names: () => calls.map((c) => c[0]), logs: () => calls.filter((c) => c[0] === 'createUploadLog').map((c) => c[1] as any) };
};

/** A new set; a new operation using it, in a new category, with its own parameter; a bundle of it; a new SOW block. */
const chained: RawWorkbook = {
  ignoredSheets: [],
  sheets: {
    parameterList: rawSheet('parameterList', ['parameterSet', 'operation', 'parameter', 'type'], [['Salts', '', 'NaCl', 'Number'], ['', 'Ligation', 'Insert', 'Text']]),
    operations: rawSheet('operations', ['name', 'serviceCategory', 'parameterSet1'], [['Ligation', 'Sequencing', 'Salts']]),
    bundles: rawSheet('bundles', ['BundleName', 'Order', 'Operation'], [['Kit', '1', 'Ligation'], ['Kit', '2', 'PCR']]),
    sowSections: rawSheet('sowSections', ['sectionKey', 'name', 'text'], [['terms', 'Net-60', 'Net 60.']])
  }
};
const run = async (raw: RawWorkbook, overrides: Record<string, boolean> = {}, fail: Partial<Record<keyof WorkbookMutator, string>> = {}, hideMissing = false) => {
  const plan = planWorkbook(raw, catalog, { allowPricing: true, hideMissing });
  const rec = recorder(fail);
  const summary = await applyWorkbook(plan, tickedKeys(plan, overrides), catalog, rec.mutator, meta);
  return { ...rec, summary, plan };
};

describe('applyWorkbook — order and wiring (decision 4)', () => {
  it('creates sets, then operations, then their own parameters, then categories, bundles and SOW blocks — passing new ids along', async () => {
    const { calls, names, summary } = await run(chained);
    expect(names()).toEqual([
      'createParameterSet', 'createService', 'updateService', 'createCategory', 'createBundle', 'createSowTextPreset',
      'createUploadLog', 'createUploadLog', 'createUploadLog', 'createUploadLog'
    ]);
    expect(calls[0][1]).toMatchObject({ name: 'Salts', parameters: [{ id: 'nacl', name: 'NaCl', type: 'number', price: 0 }] });
    expect(calls[1][1]).toMatchObject({ name: 'Ligation', parameterSetIds: ['new-createParameterSet-1'], serviceCategoryName: 'Sequencing', protocolIds: [] });
    expect(calls[2]).toEqual(['updateService', 'new-createService-2', { parameters: [expect.objectContaining({ id: 'insert', name: 'Insert', type: 'string', price: 0 })] }]);
    expect(calls[3][1]).toEqual({ label: 'Sequencing', services: ['new-createService-2'] });
    expect(calls[4][1]).toEqual({ label: 'Kit', icon: '', services: ['new-createService-2', 'op1'] });
    expect(calls[5][1]).toEqual({ sectionKey: 'terms', name: 'Net-60', text: 'Net 60.' });
    expect(summary.rowErrors).toEqual({});
    expect(summary.errors).toEqual([]);
    expect(summary.sheets).toEqual({
      operations: { created: 1, updated: 0, skipped: 0, failed: 0 },
      parameterList: { created: 2, updated: 0, skipped: 0, failed: 0 },
      bundles: { created: 1, updated: 0, skipped: 0, failed: 0 },
      sowSections: { created: 1, updated: 0, skipped: 0, failed: 0 }
    });
  });

  it('writes one upload log per sheet applied, typed for its sheet (rule 9)', async () => {
    const { logs } = await run(chained);
    expect(logs().map((l) => l.entityType)).toEqual(['OPERATION', 'PARAMETER_SET', 'BUNDLE', 'SOW_SECTION']);
    expect(logs()[0]).toMatchObject({ uploaderName: 'Ada', uploaderSub: 'sub-1', fileName: 'catalog.xlsx', rowCount: 1, createdCount: 1, updatedCount: 0, skippedCount: 0, failedCount: 0 });
    // The operation and the category it was put in; item ids are record ids, never parameter ids.
    expect(logs()[0].affectedItemIds).toEqual(['new-createService-2', 'new-createCategory-3']);
    expect(logs()[1].affectedItemIds).toEqual(['new-createParameterSet-1', 'new-createService-2']);
    expect(logs()[1].fieldSnapshots[0]).toMatchObject({ itemId: 'new-createParameterSet-1', action: 'CREATE' });
    expect(logs()[1].rowCount).toBe(2);
  });
});

describe('applyWorkbook — updates, ticks and hides', () => {
  const edits: RawWorkbook = {
    ignoredSheets: [],
    sheets: {
      parameterList: rawSheet('parameterList', ['parameterSet', 'operation', 'parameter', 'description'], [['Buffers', '', 'Volume', 'In µL'], ['Buffers', '', 'pH', ''], ['', 'PCR', 'Cycles', 'How many']]),
      operations: rawSheet('operations', ['id', 'name', 'serviceCategory', 'description'], [['op1', 'PCR', 'Cloning', 'Amplify']]),
      bundles: rawSheet('bundles', ['BundleName', 'Order', 'Operation'], [['Cloning', '1', 'PCR'], ['Cloning', '2', 'PCR']]),
      sowSections: rawSheet('sowSections', ['id', 'sectionKey', 'name', 'text'], [['p1', 'terms', 'Default', 'Net 45.']])
    }
  };

  it('writes one mutation per owner, carrying its whole merged parameter list', async () => {
    const { calls } = await run(edits);
    expect(calls[0]).toEqual(['updateParameterSet', 's1', { parameters: [{ id: 'volume', name: 'Volume', type: 'number', price: 4, description: 'In µL' }, expect.objectContaining({ id: 'ph', name: 'pH', price: 0 })] }]);
    expect(calls[1]).toEqual(['updateService', 'op1', { description: 'Amplify', serviceCategoryName: 'Cloning' }]);
    expect(calls[2]).toEqual(['updateService', 'op1', { parameters: [{ id: 'cycles', name: 'Cycles', type: 'number', description: 'How many' }] }]);
    expect(calls[3]).toEqual(['createCategory', { label: 'Cloning', services: ['op1'] }]);
    expect(calls[4]).toEqual(['updateCategory', 'c1', { services: [] }]);
    expect(calls[5]).toEqual(['updateBundle', 'b1', { services: ['op1', 'op1'] }]);
    expect(calls[6]).toEqual(['updateSowTextPreset', 'p1', { text: 'Net 45.' }]);
  });

  it('applies only ticked rows; an unticked parameter is left exactly as stored (rule 7)', async () => {
    const { calls, summary } = await run(edits, { 'parameterList:2': false, 'operations:2': false, 'bundles:2': false, 'sowSections:2': false });
    expect(calls.filter((c) => c[0] !== 'createUploadLog')).toEqual([
      ['updateParameterSet', 's1', { parameters: [{ id: 'volume', name: 'Volume', type: 'number', price: 4 }, expect.objectContaining({ id: 'ph' })] }],
      ['updateService', 'op1', { parameters: [{ id: 'cycles', name: 'Cycles', type: 'number', description: 'How many' }] }]
    ]);
    // No log for a sheet nothing was applied from.
    expect(Object.keys(summary.sheets)).toEqual(['parameterList']);
    expect(summary.sheets.parameterList).toEqual({ created: 1, updated: 1, skipped: 1, failed: 0 });
  });

  it('hides the ticked "hide" rows and never anything else (rule 14)', async () => {
    const raw: RawWorkbook = { ignoredSheets: [], sheets: { operations: rawSheet('operations', ['id', 'name'], [['op1', 'PCR']]) } };
    const { calls, summary, logs } = await run(raw, {}, {}, true);
    expect(calls[0]).toEqual(['updateService', 'op9', { hiddenFromClients: true }]);
    expect(summary.sheets.operations).toEqual({ created: 0, updated: 1, skipped: 1, failed: 0 });
    expect(logs()[0].fieldSnapshots).toEqual([{ itemId: 'op9', action: 'UPDATE', before: { hiddenFromClients: false }, after: { hiddenFromClients: true } }]);
    const unticked = await run(raw, { 'hide:op9': false }, {}, true);
    expect(unticked.calls).toEqual([]);
  });

  it('does nothing at all when nothing is ticked', async () => {
    const { calls, summary } = await run(chained, { 'parameterList:2': false, 'parameterList:3': false, 'operations:2': false, 'bundles:2': false, 'sowSections:2': false });
    expect(calls).toEqual([]);
    expect(summary).toEqual({ sheets: {}, rowErrors: {}, errors: [] });
  });
});

describe('applyWorkbook — failures (rules 8, 20)', () => {
  it('a row whose dependency was unticked is an error on that row, and the rest still apply (Review Focus 5)', async () => {
    const { names, summary } = await run(chained, { 'parameterList:2': false });
    expect(summary.rowErrors).toEqual({
      'operations:2': 'Parameter set “Salts” was not created.',
      'parameterList:3': 'Operation “Ligation” was not created.',
      'bundles:2': 'Operation “Ligation” was not created.'
    });
    expect(names().filter((n) => n !== 'createUploadLog')).toEqual(['createSowTextPreset']);
    expect(summary.sheets.operations).toEqual({ created: 0, updated: 0, skipped: 0, failed: 1 });
    expect(summary.sheets.sowSections).toEqual({ created: 1, updated: 0, skipped: 0, failed: 0 });
  });

  it('a row whose dependency failed on the server is an error too', async () => {
    const { summary, names } = await run(chained, {}, { createParameterSet: 'A parameter set named "salts" already exists.' });
    expect(summary.rowErrors).toEqual({
      'parameterList:2': 'A parameter set named "salts" already exists.',
      'operations:2': 'Parameter set “Salts” was not created.',
      'parameterList:3': 'Operation “Ligation” was not created.',
      'bundles:2': 'Operation “Ligation” was not created.'
    });
    expect(names().filter((n) => n !== 'createUploadLog')).toEqual(['createParameterSet', 'createSowTextPreset']);
  });

  it('shows the server’s own refusal on every row of the owner it refused (rule 20)', async () => {
    const clash = 'Saving "Buffers" would give "PCR" the same parameter id from two sets. Rename the parameter or remove one of the sets from those operations first.';
    const raw: RawWorkbook = { ignoredSheets: [], sheets: { parameterList: rawSheet('parameterList', ['parameterSet', 'parameter', 'description'], [['Buffers', 'Volume', 'x'], ['Buffers', 'pH', '']]) } };
    const { summary } = await run(raw, {}, { updateParameterSet: clash });
    expect(summary.rowErrors).toEqual({ 'parameterList:2': clash, 'parameterList:3': clash });
    expect(summary.sheets.parameterList).toEqual({ created: 0, updated: 0, skipped: 0, failed: 2 });
  });

  it('says so when an upload log fails, without undoing the rows', async () => {
    const { summary } = await run(chained, {}, { createUploadLog: 'down' });
    expect(summary.rowErrors).toEqual({});
    expect(summary.errors).toEqual([
      'The upload history record for Operations could not be saved: down',
      'The upload history record for Parameter List could not be saved: down',
      'The upload history record for Bundles could not be saved: down',
      'The upload history record for SOW Sections could not be saved: down'
    ]);
  });

  it('M2/F24: a failed category write is reported by operation and category; the written operation still counts, as the upload log has it', async () => {
    const { summary, plan } = await run(chained, {}, { createCategory: 'boom' });
    const operationRow = plan.operations!.rows[0].key;
    expect(summary.rowErrors).toEqual({});
    expect(summary.errors).toEqual([`Operation “${plan.operations!.rows[0].label}” was saved, but category “Sequencing” could not be saved: boom`]);
    expect(summary.sheets.operations).toEqual({ created: 1, updated: 0, skipped: 0, failed: 0 });
    expect(operationRow).toBeTruthy();
    // The operation itself was written, so the rows that depend on it still went ahead.
    expect(summary.sheets.bundles).toEqual({ created: 1, updated: 0, skipped: 0, failed: 0 });
  });

  it('M2/F24: a failed update of the category an operation left is reported against that operation, and it counts as updated', async () => {
    const { summary } = await run(
      { ignoredSheets: [], sheets: { operations: rawSheet('operations', ['id', 'serviceCategory'], [['op1', 'Cloning']]) } }, {}, { updateCategory: 'locked' }
    );
    expect(summary.rowErrors).toEqual({});
    expect(summary.errors).toHaveLength(1);
    expect(summary.errors[0]).toMatch(/^Operation “.+” was saved, but category “Molecular Biology” could not be saved: locked$/);
    expect(summary.sheets.operations).toEqual({ created: 0, updated: 1, skipped: 0, failed: 0 });
  });

  it('M2/F24: a failed category write is never reported as if the category had been saved', async () => {
    const { summary } = await run(chained, {}, { createCategory: 'boom' });
    expect(summaryText(summary)).toContain('could not be saved: boom');
    expect(completionMessage(summary).severity).toBe('warning');
  });
});

describe('summaryText', () => {
  it('reads one clause per sheet applied, then the failures', () => {
    expect(summaryText({ sheets: { operations: { created: 1, updated: 2, skipped: 3, failed: 0 }, bundles: { created: 0, updated: 1, skipped: 0, failed: 1 } }, rowErrors: { 'bundles:2': 'x' }, errors: ['Category “A”: boom'] })).toBe(
      'Import complete — Operations: 1 created, 2 updated, 3 skipped. Bundles: 0 created, 1 updated, 0 skipped, 1 failed. Category “A”: boom'
    );
    expect(summaryText({ sheets: {}, rowErrors: {}, errors: [] })).toBe('Import complete — nothing was applied.');
  });
});

describe('F20: an import that threw reads on its own terms', () => {
  it('does not say nothing was applied, and says rows may be written', () => {
    const text = summaryText(stoppedSummary(new Error('Network down')));
    expect(text).toBe('The import stopped unexpectedly: Network down Rows written before it stopped stay written, so check the catalog and the upload history.');
    expect(text).not.toContain('nothing was applied');
    expect(text).not.toContain('Import complete');
  });

  it('is an error, not a warning, and shows the cause', () => {
    expect(completionMessage(stoppedSummary(new Error('Network down')))).toMatchObject({ severity: 'error', text: expect.stringContaining('Network down') });
  });

  it('keeps the ordinary messages: success, and warning with the failed rows listed', () => {
    expect(completionMessage({ sheets: { bundles: { created: 1, updated: 0, skipped: 0, failed: 0 } }, rowErrors: {}, errors: [] })).toEqual({ severity: 'success', text: 'Import complete — Bundles: 1 created, 0 updated, 0 skipped.' });
    expect(completionMessage({ sheets: { bundles: { created: 0, updated: 0, skipped: 0, failed: 1 } }, rowErrors: { 'bundles:2': 'x' }, errors: [] })).toEqual({
      severity: 'warning', text: 'Import complete — Bundles: 0 created, 0 updated, 0 skipped, 1 failed. 1 row failed: x'
    });
  });
});
