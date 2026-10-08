import { describe, expect, it } from 'vitest';
import { matchRows } from './matching';

const existing = [{ id: 'op1', name: 'PCR' }, { id: 'op2', name: 'Gibson Assembly ' }, { id: 'op3', name: 'Twin' }, { id: 'op4', name: 'Twin' }];
const row = (rowNumber: number, id: string, name: string) => ({ rowNumber, id, name });
const SAME_NAME = 'Same name as an existing operation — this row creates a second one. Add the id to update it instead.';

describe('matchRows — rows are matched by id only', () => {
  it('A1: a non-blank id that matches is an update', () => {
    expect(matchRows([row(2, 'op1', 'PCR renamed')], existing, 'operation')[0]).toEqual({ action: 'update', existingId: 'op1', existingIndex: 0, errors: [], warnings: [], selectedByDefault: true });
  });

  it('A1: a non-blank id that matches nothing is an error', () => {
    expect(matchRows([row(2, 'nope', 'PCR')], existing, 'operation')[0].errors).toEqual(['No operation has id “nope”.']);
  });

  it('A2: a blank id is always a create — with no equal name, ticked and quiet', () => {
    expect(matchRows([row(2, '', 'Ligation')], existing, 'operation')[0]).toEqual({ action: 'create', errors: [], warnings: [], selectedByDefault: true });
  });

  it.each([
    ['equal to a stored name', 'PCR'],
    ['equal to a stored name once that is trimmed', 'Gibson Assembly'],
    ['equal to two stored names — no longer an error', 'Twin']
  ])('A2/A3: a blank-id row whose name is %s is a create, warned and unticked — never an update', (_case, name) => {
    const [result] = matchRows([row(2, '', name)], existing, 'operation');
    expect(result).toEqual({ action: 'create', errors: [], warnings: [SAME_NAME], selectedByDefault: false });
    expect(result.existingId).toBeUndefined();
    expect('matchedByName' in result).toBe(false);
  });

  it('A3: the warning names the kind of record', () => {
    expect(matchRows([row(2, '', 'PCR')], existing, 'SOW text block')[0].warnings).toEqual(['Same name as an existing SOW text block — this row creates a second one. Add the id to update it instead.']);
  });

  it('A4: a create that only differs by case or spacing warns as a near-duplicate and is unticked', () => {
    const [result] = matchRows([row(2, '', 'gibson  assembly')], existing, 'operation');
    expect(result).toMatchObject({ action: 'create', errors: [], warnings: ['Looks like “Gibson Assembly” — a near-duplicate'], selectedByDefault: false });
  });

  it('A4: two new rows that only differ by case warn about each other', () => {
    const results = matchRows([row(2, '', 'Ligation'), row(3, '', 'ligation')], existing, 'operation');
    expect(results[0].warnings).toEqual(['Looks like “ligation” — a near-duplicate']);
    expect(results[1].warnings).toEqual(['Looks like “Ligation” — a near-duplicate']);
    expect(results.every((r) => r.selectedByDefault === false)).toBe(true);
  });

  it('A5: two blank-id rows with the same name are both errors', () => {
    const results = matchRows([row(2, '', 'Ligation'), row(3, '', 'Ligation')], existing, 'operation');
    expect(results[0].errors).toEqual(['Rows 2 and 3 both create “Ligation”.']);
    expect(results[1].errors).toEqual(['Rows 2 and 3 both create “Ligation”.']);
    expect(results.every((r) => r.selectedByDefault === false)).toBe(true);
  });

  it('A5: so are two that share a stored record’s name', () => {
    const results = matchRows([row(2, '', 'PCR'), row(3, '', 'PCR')], existing, 'operation');
    expect(results.map((r) => r.errors)).toEqual([['Rows 2 and 3 both create “PCR”.'], ['Rows 2 and 3 both create “PCR”.']]);
  });

  it('A5: two rows with the same id are both errors', () => {
    const results = matchRows([row(2, 'op1', 'PCR'), row(5, 'op1', 'PCR again')], existing, 'operation');
    expect(results[0].errors).toEqual(['Rows 2 and 5 both resolve to “PCR”.']);
    expect(results[1].errors).toEqual(['Rows 2 and 5 both resolve to “PCR”.']);
  });

  it('an id row and a blank-id row of the same name are two records: an update and a warned create', () => {
    const results = matchRows([row(2, 'op1', 'PCR'), row(5, '', 'PCR')], existing, 'operation');
    expect(results[0]).toMatchObject({ action: 'update', existingId: 'op1', errors: [] });
    expect(results[1]).toEqual({ action: 'create', errors: [], warnings: [SAME_NAME], selectedByDefault: false });
  });

  it('a new row needs a name', () => {
    expect(matchRows([row(2, '', '')], existing, 'operation')[0].errors).toEqual(['A new operation needs a name.']);
  });
});

describe('matchRows — a stored record that has no id (fix I3)', () => {
  const stored = [{ id: '', name: 'Sequencing type ' }, { id: 'vol', name: 'Volume' }, { id: '', name: 'Notes' }];

  it('a blank-id row is the one id-less record of exactly that name: an update, by position, with no warning', () => {
    expect(matchRows([row(2, '', 'Notes')], stored, 'parameter')[0]).toEqual({ action: 'update', existingId: '', existingIndex: 2, errors: [], warnings: [], selectedByDefault: true });
    expect(matchRows([row(2, '', 'Sequencing type')], stored, 'parameter')[0]).toMatchObject({ action: 'update', existingIndex: 0 });
  });

  it('never a record that has an id, and never on a near name', () => {
    expect(matchRows([row(2, '', 'Volume')], stored, 'parameter')[0]).toMatchObject({ action: 'create', selectedByDefault: false });
    expect(matchRows([row(2, '', 'notes')], stored, 'parameter')[0]).toMatchObject({ action: 'create', warnings: ['Looks like “Notes” — a near-duplicate'] });
  });

  it('two id-less records keep apart: each row is its own, and two rows for one are both errors', () => {
    const results = matchRows([row(2, '', 'Notes'), row(3, '', 'Sequencing type'), row(4, '', 'Notes')], stored, 'parameter');
    expect(results.map((r) => r.errors)).toEqual([['Rows 2 and 4 both resolve to “Notes”.'], [], ['Rows 2 and 4 both resolve to “Notes”.']]);
  });

  it('an update by id reports its position too', () => {
    expect(matchRows([row(2, 'vol', 'Volume')], stored, 'parameter')[0]).toMatchObject({ action: 'update', existingId: 'vol', existingIndex: 1 });
  });
});
