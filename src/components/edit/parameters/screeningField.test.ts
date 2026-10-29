import { describe, expect, it } from 'vitest';
import { screeningColumnOptions, screeningFieldError, screeningFieldsOf } from './screeningField';

describe('screening columns field', () => {
  it('offers the columns as currently typed, before the save resolves them', () => {
    expect(screeningColumnOptions({ type: 'table', _columnsText: 'Well\n\nInsert ' })).toEqual(['Well', 'Insert']);
    expect(screeningColumnOptions({ type: 'table', tableData: { columns: [{ header: 'A' }] } })).toEqual(['A']);
  });

  it('reads the stored fields, ignoring junk', () => {
    expect(screeningFieldsOf({ screeningFields: ['Insert', 3, ''] })).toEqual(['Insert']);
    expect(screeningFieldsOf({})).toEqual([]);
  });

  it('shows the rule against the typed columns', () => {
    expect(screeningFieldError({ type: 'table', _columnsText: 'Well\nInsert', screening: true, screeningFields: ['Vector'] })).toBe('Screening column “Vector” is not one of this Table\'s columns.');
    expect(screeningFieldError({ type: 'table', _columnsText: 'Well\nVector', screening: true, screeningFields: ['vector'] })).toBeNull();
  });
});
