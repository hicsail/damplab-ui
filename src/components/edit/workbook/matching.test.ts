import { describe, expect, it } from 'vitest';
import { matchRows } from './matching';

const existing = [{ id: 'op1', name: 'PCR' }, { id: 'op2', name: 'Gibson Assembly ' }, { id: 'op3', name: 'Twin' }, { id: 'op4', name: 'Twin' }];
const row = (rowNumber: number, id: string, name: string) => ({ rowNumber, id, name });

describe('matchRows (rules 3–5)', () => {
  it('a non-blank id that matches is an update', () => {
    expect(matchRows([row(2, 'op1', 'PCR renamed')], existing, 'operation')[0]).toEqual({ action: 'update', existingId: 'op1', matchedByName: false, errors: [], warnings: [], selectedByDefault: true });
  });

  it('a non-blank id that matches nothing is an error', () => {
    expect(matchRows([row(2, 'nope', 'PCR')], existing, 'operation')[0].errors).toEqual(['No operation has id “nope”.']);
  });

  it('with a blank id, an equal name (after trimming) is an update "matched by name"', () => {
    expect(matchRows([row(2, '', 'Gibson Assembly')], existing, 'operation')[0]).toMatchObject({ action: 'update', existingId: 'op2', matchedByName: true, errors: [] });
  });

  it('with a blank id and no equal name, the row is a create', () => {
    expect(matchRows([row(2, '', 'Ligation')], existing, 'operation')[0]).toMatchObject({ action: 'create', matchedByName: false, errors: [], warnings: [], selectedByDefault: true });
  });

  it('a create that only differs by case or spacing warns and is unticked (rule 4)', () => {
    const [result] = matchRows([row(2, '', 'gibson  assembly')], existing, 'operation');
    expect(result).toMatchObject({ action: 'create', warnings: ['Looks like “Gibson Assembly” — a near-duplicate'], selectedByDefault: false });
  });

  it('two new rows that only differ by case warn about each other', () => {
    const results = matchRows([row(2, '', 'Ligation'), row(3, '', 'ligation')], existing, 'operation');
    expect(results[0].warnings).toEqual(['Looks like “ligation” — a near-duplicate']);
    expect(results[1].warnings).toEqual(['Looks like “Ligation” — a near-duplicate']);
    expect(results.every((r) => r.selectedByDefault === false)).toBe(true);
  });

  it('a name that matches two existing records is an error (rule 5)', () => {
    expect(matchRows([row(2, '', 'Twin')], existing, 'operation')[0].errors).toEqual(['2 operations are named “Twin” — add the id to say which.']);
  });

  it('two rows that resolve to the same record are both errors', () => {
    const results = matchRows([row(2, 'op1', 'PCR'), row(5, '', 'PCR')], existing, 'operation');
    expect(results[0].errors).toEqual(['Rows 2 and 5 both resolve to “PCR”.']);
    expect(results[1].errors).toEqual(['Rows 2 and 5 both resolve to “PCR”.']);
  });

  it('two rows that would create the same name are both errors', () => {
    const results = matchRows([row(2, '', 'Ligation'), row(3, '', 'Ligation')], existing, 'operation');
    expect(results[0].errors).toEqual(['Rows 2 and 3 both create “Ligation”.']);
    expect(results[1].errors).toEqual(['Rows 2 and 3 both create “Ligation”.']);
  });

  it('a new row needs a name', () => {
    expect(matchRows([row(2, '', '')], existing, 'operation')[0].errors).toEqual(['A new operation needs a name.']);
  });
});
