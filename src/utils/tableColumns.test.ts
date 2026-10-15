import { describe, expect, it } from 'vitest';
import { columnNamesFromText, columnsError, columnsText, resolveTableColumns } from './tableColumns';

describe('resolveTableColumns (rules 6, 7)', () => {
  it('trims names, drops blank ones and keeps the order', () => {
    expect(resolveTableColumns(['  Inducer ', '', '   ', 'Concentration'], []).columns.map((c) => c.header)).toEqual(['Inducer', 'Concentration']);
  });

  it('gives a new column a field slugged from its header', () => {
    expect(resolveTableColumns(['Inducer', 'Final Concentration (mM)'], [])).toEqual({
      columns: [{ header: 'Inducer', field: 'inducer' }, { header: 'Final Concentration (mM)', field: 'final_concentration_(mm)' }],
      errors: []
    });
  });

  it('keeps an existing column’s field — and anything else stored on it — matched by header ignoring case, wherever it moves', () => {
    const stored = [{ header: 'Inducer', field: 'col_a', width: 120 }, { header: 'Location', field: 'loc' }];
    expect(resolveTableColumns(['Location', 'inducer', 'Notes'], stored).columns).toEqual([
      { header: 'Location', field: 'loc' },
      { header: 'inducer', field: 'col_a', width: 120 },
      { header: 'Notes', field: 'notes' }
    ]);
  });

  it('keeps a new field unique within the parameter, against kept fields and earlier new ones', () => {
    const stored = [{ header: 'Sample', field: 'notes' }];
    expect(resolveTableColumns(['Sample', 'Notes', 'notes!'], stored).columns.map((c) => c.field)).toEqual(['notes', 'notes_2', 'notes!']);
    expect(resolveTableColumns(['A B', 'a  b'], []).columns.map((c) => c.field)).toEqual(['a_b', 'a_b_2']);
  });

  it('gives a matched stored column with a blank field a slugged one, keeping what else it carries', () => {
    expect(resolveTableColumns(['Inducer'], [{ header: 'Inducer', field: '', width: 1 }]).columns).toEqual([{ header: 'Inducer', field: 'inducer', width: 1 }]);
    // A stored column that does not match by header is not carried over.
    expect(resolveTableColumns(['Inducer'], [{ header: 'Other', field: '', width: 1 }]).columns).toEqual([{ header: 'Inducer', field: 'inducer' }]);
  });

  it('refuses two names equal ignoring case, once per repeated name', () => {
    expect(resolveTableColumns(['Inducer', 'inducer ', 'INDUCER', 'Location'], []).errors).toEqual(['Column “inducer” is listed twice.']);
  });

  it('is empty for no names', () => {
    expect(resolveTableColumns([], [{ header: 'A', field: 'a' }])).toEqual({ columns: [], errors: [] });
  });
});

describe('the Columns field', () => {
  it('reads one name per line', () => {
    expect(columnNamesFromText('Inducer\r\n  Concentration \n\nLocation\n')).toEqual(['Inducer', 'Concentration', 'Location']);
    expect(columnNamesFromText('A; B')).toEqual(['A; B']);
  });

  it('shows what is being typed, else the stored headers one per line', () => {
    const stored = { type: 'table', tableData: { columns: [{ header: 'Inducer', field: 'inducer' }, { header: 'Location', field: 'location' }] } };
    expect(columnsText(stored)).toBe('Inducer\nLocation');
    expect(columnsText({ ...stored, _columnsText: 'Inducer\n' })).toBe('Inducer\n');
    expect(columnsText({ type: 'table' })).toBe('');
  });

  it('errors on a repeated name, and on no columns when there is no staff template (rule 12)', () => {
    expect(columnsError({ type: 'table', _columnsText: 'A\na' })).toBe('Column “a” is listed twice.');
    expect(columnsError({ type: 'table' })).toBe('Add at least one column.');
    expect(columnsError({ type: 'table', tableData: { columns: [{ header: 'A', field: 'a' }] }, _columnsText: '  \n' })).toBe('Add at least one column.');
    expect(columnsError({ type: 'sampleSheet', templateFile: { key: 'sample-sheet-templates/a.xlsx' } })).toBeNull();
    expect(columnsError({ type: 'table', _columnsText: 'A' })).toBeNull();
    expect(columnsError({ type: 'string' })).toBeNull();
  });

  // M3: the save refuses a repeated name only in what was typed; the field must not contradict it.
  it('reports a repeated name only in the text being edited, not in columns already stored', () => {
    const stored = { type: 'table', tableData: { columns: [{ header: 'A', field: 'a' }, { header: 'a', field: 'a_2' }] } };
    expect(columnsError(stored)).toBeNull();
    expect(columnsError({ ...stored, _columnsText: 'A\na' })).toBe('Column “a” is listed twice.');
  });
});
