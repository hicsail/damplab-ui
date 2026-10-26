import { describe, expect, it } from 'vitest';
import { matrixError, matrixLayouts, parseMatrix } from './parameterMatrix';
import { hiddenParameterIds } from './parameterConditions';

// A small Blood (New): an instrument, a +1 assay list in column 1, a dilution and a replicate count per assay.
const ASSAYS = [
  { id: 'afp', name: 'AFP' },
  { id: 'ca125', name: 'CA 125' },
  { id: 'hbc', name: 'Anti-HBc' },
  { id: 'hbcm', name: 'Anti-HBc IgM' }
];
const assayIs = (name: string) => ({ parameterId: 'assays', op: 'includes', value: name });
const definitions: any[] = [
  { id: 'instrument', name: 'Instrument', type: 'dropdown', options: [{ id: 'i', name: 'Alinity i' }] },
  { id: 'assays', name: 'Alinity i Assays', type: 'dropdown', allowMultipleValues: true, options: ASSAYS, matrix: 'matrixA;1' },
  ...ASSAYS.map((a) => ({ id: `${a.id}_dil`, name: `${a.name} Dilution`, type: 'dropdown', options: [{ id: 'x1', name: '1x' }], showIf: assayIs(a.name), matrix: 'matrixA;2' })),
  ...ASSAYS.map((a) => ({ id: `${a.id}_rep`, name: `${a.name} Replicates Count`, type: 'number', showIf: assayIs(a.name), matrix: 'matrixA; 3' }))
];
const entryOf = (d: any) => ({ id: d.id, name: d.name, type: d.type, options: d.options ?? null, paramType: 'input', allowMultipleValues: d.allowMultipleValues || undefined, value: d.allowMultipleValues ? [''] : null });

/** The grid as parameter ids, `id#n` for a +1 choice, '' for an empty cell — over the shown entries only, as the form lays it out. */
function grid(values: Record<string, unknown>, defs: any[] = definitions): string[][] {
  const hidden = hiddenParameterIds(defs, values);
  const shown = defs.filter((d) => !hidden.has(d.id)).map(entryOf);
  const [matrix] = matrixLayouts(shown, defs, values);
  return matrix.rows.map((row) => row.cells.map((cell) => (cell ? (cell.entryIndex !== undefined ? `${cell.paramId}#${cell.entryIndex}` : cell.paramId) : '')));
}

describe('parseMatrix / matrixError', () => {
  it('reads name;column, trimmed', () => {
    expect(parseMatrix(' matrixA ; 2 ')).toEqual({ name: 'matrixA', column: 2 });
    expect(parseMatrix('matrixA')).toBeNull();
    expect(parseMatrix('matrixA;0')).toBeNull();
    expect(parseMatrix(';1')).toBeNull();
  });
  it('a blank matrix is none; a Table cannot be placed', () => {
    expect(matrixError({ matrix: '' })).toBeNull();
    expect(matrixError({ matrix: 'm;x' })).toBe('Write the matrix as name;column, e.g. matrixA;2 (the column is 1 or more).');
    expect(matrixError({ matrix: 'm;1', type: 'table' })).toBe('A Table cannot be placed in a matrix.');
  });
});

describe('matrixLayouts', () => {
  it('a row per +1 choice, each later cell on the row of the assay its condition names', () => {
    expect(grid({ instrument: 'i', assays: ['afp', 'ca125'] })).toEqual([
      ['assays#0', 'afp_dil', 'afp_rep'],
      ['assays#1', 'ca125_dil', 'ca125_rep']
    ]);
  });

  it('rows line up whatever order the assays were picked in', () => {
    expect(grid({ instrument: 'i', assays: ['ca125', 'afp'] })).toEqual([
      ['assays#0', 'ca125_dil', 'ca125_rep'],
      ['assays#1', 'afp_dil', 'afp_rep']
    ]);
  });

  it('Anti-HBc IgM does not also bring in the Anti-HBc cells', () => {
    expect(grid({ instrument: 'i', assays: ['hbcm'] })).toEqual([['assays#0', 'hbcm_dil', 'hbcm_rep']]);
    expect(grid({ instrument: 'i', assays: ['hbcm', 'hbc'] })).toEqual([
      ['assays#0', 'hbcm_dil', 'hbcm_rep'],
      ['assays#1', 'hbc_dil', 'hbc_rep']
    ]);
  });

  it('a blank choice is a row with nothing beside it yet', () => {
    expect(grid({ instrument: 'i', assays: ['afp', ''] })).toEqual([
      ['assays#0', 'afp_dil', 'afp_rep'],
      ['assays#1', '', '']
    ]);
  });

  it('removing a middle choice hides its cells and the later rows move up', () => {
    expect(grid({ instrument: 'i', assays: ['afp', 'ca125', 'hbc'].filter((a) => a !== 'ca125') })).toEqual([
      ['assays#0', 'afp_dil', 'afp_rep'],
      ['assays#1', 'hbc_dil', 'hbc_rep']
    ]);
  });

  it('a cell with no link stacks into the first free cell of its column', () => {
    const notes = { id: 'notes', name: 'Notes', type: 'string', matrix: 'matrixA;2' };
    expect(grid({ instrument: 'i', assays: ['afp', ''] }, [...definitions, notes])).toEqual([
      ['assays#0', 'afp_dil', 'afp_rep'],
      ['assays#1', 'notes', '']
    ]);
  });

  it('the same assay picked twice: the second row stays empty', () => {
    expect(grid({ instrument: 'i', assays: ['afp', 'afp'] })).toEqual([
      ['assays#0', 'afp_dil', 'afp_rep'],
      ['assays#1', '', '']
    ]);
  });

  it('a hidden column-1 parameter gives no rows; matrix names match case-insensitively', () => {
    expect(matrixLayouts([], definitions, {})).toEqual([]);
    const [m] = matrixLayouts(
      [entryOf({ id: 'a', name: 'A', type: 'string' }), entryOf({ id: 'b', name: 'B', type: 'string' })],
      [{ id: 'a', matrix: 'M;1' }, { id: 'b', matrix: 'm;2' }],
      {}
    );
    expect(m.rows.map((r) => r.cells.map((c) => c?.paramId))).toEqual([['a', 'b']]);
  });
});
