import { describe, expect, it } from 'vitest';
import { prepareParametersForSave, withDragKeys } from './parameterSave';
import { applyTypeChoice } from './parameterTypeChoice';

describe('prepareParametersForSave', () => {
  it('strips drag keys, fills a blank id from the name, and de-duplicates ids', () => {
    const { parameters, errors } = prepareParametersForSave(
      [
        { _dragKey: 'k1', id: '', name: 'Sample count', type: 'number' },
        { _dragKey: 'k2', id: 'sample_count', name: 'Other', type: 'string' }
      ]
    );
    expect(errors).toEqual([]);
    expect(parameters.map((p) => p.id)).toEqual(['sample_count', 'sample_count_2']);
    expect(parameters[0]).not.toHaveProperty('_dragKey');
  });

  describe('a Table (table-upload rules 2, 5, 6, 7, 12, 13a)', () => {
    const table = (over: Record<string, any> = {}): any => ({ _dragKey: 'k', id: 't', name: 'Plate map', type: 'table', ...over });

    it('writes the typed columns as [{ header, field }] and never stores the editing text', () => {
      const { parameters, errors } = prepareParametersForSave([table({ _columnsText: ' Inducer \n\nConcentration' })]);
      expect(errors).toEqual([]);
      expect(parameters[0].tableData).toEqual({ columns: [{ header: 'Inducer', field: 'inducer' }, { header: 'Concentration', field: 'concentration' }] });
      expect(parameters[0]).not.toHaveProperty('_columnsText');
    });

    it('keeps an existing column’s field and leaves tableData.rows exactly as stored', () => {
      const rows = [{ id: 1, a: 'x' }];
      const stored = table({ tableData: { columns: [{ header: 'Inducer', field: 'col_a' }], rows }, _columnsText: 'Location\ninducer' });
      const { parameters } = prepareParametersForSave([stored]);
      expect(parameters[0].tableData).toEqual({ columns: [{ header: 'Location', field: 'location' }, { header: 'inducer', field: 'col_a' }], rows });
    });

    it('leaves tableData untouched when the Columns field was not edited', () => {
      const tableData = { columns: [{ header: 'Inducer', field: 'col_a', width: 90 }], rows: [{ id: 1 }] };
      const { parameters, errors } = prepareParametersForSave([table({ tableData })]);
      expect(errors).toEqual([]);
      expect(parameters[0].tableData).toBe(tableData);
    });

    it('saves a stored sampleSheet as `sampleSheet` — the string it is stored with — and keeps its templateFile (R2b)', () => {
      const templateFile = { key: 'sample-sheet-templates/a.xlsx', filename: 'blank.xlsx' };
      const [loaded] = withDragKeys([{ id: 't', name: 'Samples', type: 'sampleSheet', templateFile }]);
      expect(loaded._storedTable).toEqual({ type: 'sampleSheet', allowMultipleValues: undefined });
      const { parameters, errors } = prepareParametersForSave([{ ...loaded, name: 'Samples renamed' }]);
      expect(errors).toEqual([]);
      expect(parameters[0]).toMatchObject({ type: 'sampleSheet', name: 'Samples renamed', templateFile });
      expect(parameters[0]).not.toHaveProperty('_storedTable');
    });

    // Review Focus 8: the type list has one "Table" entry, so switching away and back picks `table`.
    it('restores the stored string when the type was switched to Text and back to Table before saving', () => {
      const [loaded] = withDragKeys([{ id: 't', name: 'Samples', type: 'sampleSheet', templateFile: { key: 'sample-sheet-templates/a.xlsx' } }]);
      const switched = { ...loaded, ...applyTypeChoice('string'), ...applyTypeChoice('table') };
      expect(switched.type).toBe('table');
      expect(prepareParametersForSave([switched]).parameters[0].type).toBe('sampleSheet');
    });

    it('keeps `table` for a parameter stored as `table`', () => {
      const [loaded] = withDragKeys([{ id: 't', name: 'Plate map', type: 'table', tableData: { columns: [{ header: 'A', field: 'a' }] } }]);
      expect(prepareParametersForSave([loaded]).parameters[0].type).toBe('table');
    });

    it('does not mark a parameter loaded as another type', () => {
      expect(withDragKeys([{ id: 's', name: 'Notes', type: 'string' }])[0]).not.toHaveProperty('_storedTable');
    });

    it('drops a removed template rather than storing null', () => {
      const { parameters } = prepareParametersForSave([table({ templateFile: null, _columnsText: 'A' })]);
      expect(parameters[0]).not.toHaveProperty('templateFile');
    });

    it('writes `table`, holding one file, for a new Table and for another type turned into one', () => {
      expect(prepareParametersForSave([table({ allowMultipleValues: true, _columnsText: 'A' })]).parameters[0]).toMatchObject({ type: 'table', allowMultipleValues: false });
      const [loaded] = withDragKeys([{ id: 's', name: 'Notes', type: 'string', allowMultipleValues: true }]);
      const turned = { ...loaded, ...applyTypeChoice('table'), _columnsText: 'A' };
      expect(prepareParametersForSave([turned]).parameters[0]).toMatchObject({ type: 'table', allowMultipleValues: false });
    });

    it('never rewrites allowMultipleValues on a stored Table: pricing reads it (R2c)', () => {
      const [on] = withDragKeys([{ id: 't', name: 'Plate map', type: 'table', allowMultipleValues: true, tableData: { columns: [{ header: 'A', field: 'a' }] } }]);
      expect(prepareParametersForSave([on]).parameters[0].allowMultipleValues).toBe(true);
      // Stored without the flag at all: it is saved without it, whatever the editor set meanwhile.
      const [unset] = withDragKeys([{ id: 't', name: 'Samples', type: 'sampleSheet', templateFile: { key: 'sample-sheet-templates/a.xlsx' } }]);
      expect(prepareParametersForSave([{ ...unset, allowMultipleValues: true }]).parameters[0]).not.toHaveProperty('allowMultipleValues');
    });

    it('refuses two column names equal ignoring case, with the parameter number', () => {
      expect(prepareParametersForSave([table({ _columnsText: 'Inducer\ninducer' })]).errors).toContain('Parameter 1: Columns - Column “inducer” is listed twice.');
    });

    it('refuses a Table with no columns and no staff template', () => {
      expect(prepareParametersForSave([table()]).errors).toContain('Parameter 1: Columns - Add at least one column.');
      expect(prepareParametersForSave([table({ tableData: { columns: [{ header: 'A', field: 'a' }] }, _columnsText: '' })]).errors).toContain('Parameter 1: Columns - Add at least one column.');
      expect(prepareParametersForSave([table({ type: 'sampleSheet' })]).errors).toContain('Parameter 1: Columns - Add at least one column.');
    });

    it('does not touch tableData on a parameter that is not a Table', () => {
      const { parameters } = prepareParametersForSave([{ _dragKey: 'k', id: 's', name: 'S', type: 'string', _columnsText: 'A' }]);
      expect(parameters[0]).not.toHaveProperty('tableData');
      expect(parameters[0]).not.toHaveProperty('_columnsText');
    });
  });

  it('reports validation errors with the parameter number', () => {
    const { errors } = prepareParametersForSave([{ _dragKey: 'k', id: '', name: '', type: 'string' }]);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/^Parameter 1: /);
  });

  it('reserves a locked id first, so a new unlocked parameter that derives the same id is the one renamed', () => {
    // The new row's id is 'buffer_volume' here because the Name field's onChange
    // derives it from the name as the person types — not because it starts blank.
    const isIdLocked = (p: { _dragKey: string }) => p._dragKey === 'saved';
    const { parameters, errors } = prepareParametersForSave(
      [
        { _dragKey: 'new', id: 'buffer_volume', name: 'Buffer volume', type: 'number' },
        { _dragKey: 'saved', id: 'buffer_volume', name: 'Buffer volume', type: 'number' }
      ],
      isIdLocked
    );
    expect(errors).toEqual([]);
    expect(parameters.map((p) => p.id)).toEqual(['buffer_volume_2', 'buffer_volume']);
  });

  it('with no isIdLocked argument, behaves exactly as before (no reservation)', () => {
    const { parameters } = prepareParametersForSave(
      [
        { _dragKey: 'a', id: '', name: 'Buffer volume', type: 'number' },
        { _dragKey: 'b', id: 'buffer_volume', name: 'Buffer volume', type: 'number' }
      ]
    );
    expect(parameters.map((p) => p.id)).toEqual(['buffer_volume', 'buffer_volume_2']);
  });
});

describe('withDragKeys', () => {
  it('gives every parameter a distinct drag key without touching its fields', () => {
    const out = withDragKeys([{ id: 'a' }, { id: 'b' }]);
    expect(out.map((p) => p.id)).toEqual(['a', 'b']);
    expect(new Set(out.map((p) => p._dragKey)).size).toBe(2);
  });
});

describe('prepareParametersForSave — validation and display', () => {
  it('drops a blank validation, and any validation on a parameter that is not a Number', () => {
    const { parameters, errors } = prepareParametersForSave(
      [
        { _dragKey: 'a', id: 'cycles', name: 'Cycles', type: 'number', validation: '  ' },
        { _dragKey: 'b', id: 'notes', name: 'Notes', type: 'string', validation: '>0', display: 'checkboxes' },
        { _dragKey: 'c', id: 'vol', name: 'Volume', type: 'number', validation: ' >0 ' }
      ]
    );
    expect(errors).toEqual([]);
    expect(parameters[0]).toEqual({ id: 'cycles', name: 'Cycles', type: 'number' });
    expect(parameters[1]).toEqual({ id: 'notes', name: 'Notes', type: 'string' });
    expect(parameters[2]).toEqual({ id: 'vol', name: 'Volume', type: 'number', validation: '>0' });
  });

  it('refuses to save an unparseable validation (rule 23)', () => {
    const { errors } = prepareParametersForSave([{ _dragKey: 'a', id: 'cycles', name: 'Cycles', type: 'number', validation: '>0 || <5' }]);
    expect(errors).toEqual(['Parameter 1: Validation - “||” is not supported — join rules with &&.']);
  });
});

describe('prepareParametersForSave — "Show only if" (show-only-if rules 30, 31)', () => {
  const sample = { _dragKey: 'a', id: 'sample', name: 'Sample Type', type: 'dropdown', options: [{ id: 'bact', name: 'Bacteria' }, { id: 'yeast', name: 'Yeast' }] };
  const extraction = { id: 'set1', name: 'Extraction', parameters: [{ id: 'volume', name: 'Volume', type: 'number' }] };

  it('stores typed text as a tree keyed by ids, and never the text', () => {
    const { parameters, errors } = prepareParametersForSave(
      [sample, { _dragKey: 'b', id: 'kit', name: 'Kit', type: 'string', _showIfText: ' "Sample Type" == "Bacteria" && "Extraction"."Volume" > 5 ' }],
      undefined,
      { sets: [extraction] }
    );
    expect(errors).toEqual([]);
    expect(parameters[1].showIf).toEqual({ all: [{ parameterId: 'sample', op: 'eq', optionIds: ['bact'] }, { parameterId: 'volume', parameterSetId: 'set1', op: 'gt', value: 5 }] });
    expect(parameters[1]).not.toHaveProperty('_showIfText');
    expect(parameters[0]).not.toHaveProperty('showIf');
  });

  it('leaves a stored condition exactly as it is when its text was not touched', () => {
    const showIf = { parameterId: 'no-longer-here', op: 'eq', value: 'x' };
    const { parameters, errors } = prepareParametersForSave([{ _dragKey: 'b', id: 'kit', name: 'Kit', type: 'string', showIf }]);
    expect(errors).toEqual([]);
    expect(parameters[0].showIf).toEqual(showIf);
  });

  it('clearing the field removes the condition', () => {
    const { parameters, errors } = prepareParametersForSave([sample, { _dragKey: 'b', id: 'kit', name: 'Kit', type: 'string', showIf: { parameterId: 'sample', op: 'eq', optionIds: ['bact'] }, _showIfText: '  ' }]);
    expect(errors).toEqual([]);
    expect(parameters[1]).not.toHaveProperty('showIf');
  });

  it('a rule-6 error blocks the save, numbered like every other parameter error', () => {
    const { errors } = prepareParametersForSave([sample, { _dragKey: 'b', id: 'kit', name: 'Kit', type: 'string', _showIfText: '"Sample Type"=="Fungi"' }]);
    expect(errors).toEqual(['Parameter 2: Show only if - “Fungi” is not an option of “Sample Type”.']);
  });

  it('resolves against final ids: a parameter added in this session can be named', () => {
    const { parameters, errors } = prepareParametersForSave(
      [
        { _dragKey: 'saved', id: 'volume', name: 'Volume', type: 'number' },
        { _dragKey: 'new', id: 'volume', name: 'Volume (final)', type: 'number' },
        { _dragKey: 'c', id: 'kit', name: 'Kit', type: 'string', _showIfText: '"Volume (final)">5' }
      ],
      (p) => p._dragKey === 'saved'
    );
    expect(errors).toEqual([]);
    expect(parameters[1].id).toBe('volume_2');
    expect(parameters[2].showIf).toEqual({ parameterId: 'volume_2', op: 'gt', value: 5 });
  });

  it('refuses a loop among the conditions being saved, and judges it on the new texts only', () => {
    const a = { _dragKey: 'a', id: 'a', name: 'A', type: 'string' };
    const b = { _dragKey: 'b', id: 'b', name: 'B', type: 'string' };
    const loop = prepareParametersForSave([{ ...a, _showIfText: '"B"=="x"' }, { ...b, _showIfText: '"A"=="x"' }]);
    expect(loop.errors).toEqual(['Parameter 2: Show only if - This condition would form a loop: the parameter it depends on depends, in turn, on this one.']);
    // B used to depend on A. Reversing the direction in one save is not a loop.
    const reversed = prepareParametersForSave([{ ...a, _showIfText: '"B"=="x"' }, { ...b, showIf: { parameterId: 'a', op: 'eq', value: 'x' }, _showIfText: '' }]);
    expect(reversed.errors).toEqual([]);
    expect(reversed.parameters[0].showIf).toEqual({ parameterId: 'b', op: 'eq', value: 'x' });
  });

  it('in a parameter set, an unqualified name is a parameter of that set', () => {
    const { parameters, errors } = prepareParametersForSave([sample, { _dragKey: 'b', id: 'kit', name: 'Kit', type: 'string', _showIfText: '"Extraction"."Sample Type"!="Yeast"' }], undefined, {
      setId: 'set1',
      sets: [{ id: 'set1', name: 'Extraction', parameters: [] }]
    });
    expect(errors).toEqual([]);
    // Naming the set being edited is the same list: stored unqualified, resolved against the list on screen, not the saved copy.
    expect(parameters[1].showIf).toEqual({ parameterId: 'sample', op: 'ne', optionIds: ['yeast'] });
  });
});
