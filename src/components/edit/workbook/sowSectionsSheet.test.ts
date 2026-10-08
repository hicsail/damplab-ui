import { describe, expect, it } from 'vitest';
import { planSowSections, sowSectionsExportRows } from './sowSectionsSheet';
import { catalogOf, rawSheet } from './testSupport';

const catalog = catalogOf({
  sowSectionKeys: ['invoiceProcedures', 'terms'],
  sowPresets: [
    { id: 'p1', sectionKey: 'terms', name: 'Default', text: 'Net 30.\n- No refunds\n', order: 1000 },
    { id: 'p2', sectionKey: 'terms', name: 'Net-60', text: 'Net 60.', order: 2000 },
    { id: 'p3', sectionKey: 'invoiceProcedures', name: 'Default', text: '', order: 1000 }
  ]
});
const plan = (columns: string[], rows: string[][]) => planSowSections(rawSheet('sowSections', columns, rows), catalog);

describe('SOW Sections — download rows (rule 33)', () => {
  it('writes id, sectionKey, name, text, order', () => {
    expect(sowSectionsExportRows(catalog)).toEqual([
      ['id', 'sectionKey', 'name', 'text', 'order'],
      ['p1', 'terms', 'Default', 'Net 30.\n- No refunds', 1000],
      ['p2', 'terms', 'Net-60', 'Net 60.', 2000],
      ['p3', 'invoiceProcedures', 'Default', '', 1000]
    ]);
  });
});

describe('SOW Sections — upload (rules 2, 3, 5, 33)', () => {
  it('a downloaded sheet uploaded unchanged is all "unchanged", with and without ids', () => {
    const [header, ...rows] = sowSectionsExportRows(catalog);
    const asText = rows.map((r) => r.map(String));
    expect(plan(header.map(String), asText).rows.map((r) => r.action)).toEqual(['unchanged', 'unchanged', 'unchanged']);
    expect(plan(header.map(String).slice(1), asText.map((r) => r.slice(1))).rows.map((r) => r.action)).toEqual(['unchanged', 'unchanged', 'unchanged']);
  });

  it('matches by sectionKey + name, so two sections may each have a "Default"', () => {
    const result = plan(['sectionKey', 'name', 'text'], [['invoiceProcedures', 'Default', 'Invoices are sent monthly.']]);
    expect(result.rows[0]).toMatchObject({ action: 'update', matchedByName: true, changed: ['text'], label: 'invoiceProcedures › Default' });
    expect(result.work.rows['sowSections:2']).toEqual({ existingId: 'p3', changes: { text: 'Invoices are sent monthly.' }, before: { text: '' } });
  });

  it('creates a block in a known section', () => {
    const result = plan(['sectionKey', 'name', 'text'], [['terms', 'Net-90', 'Net 90.']]);
    expect(result.rows[0]).toMatchObject({ action: 'create', errors: [] });
    expect(result.work.rows['sowSections:2']).toEqual({ create: { sectionKey: 'terms', name: 'Net-90', text: 'Net 90.' } });
  });

  it('refuses an unknown sectionKey', () => {
    expect(plan(['sectionKey', 'name'], [['warranty', 'Default']]).rows[0].errors).toEqual(['Unknown sectionKey “warranty”.']);
  });

  it('renames by id, and refuses to move a block to another section', () => {
    expect(plan(['id', 'sectionKey', 'name'], [['p2', 'terms', 'Net 60']]).work.rows['sowSections:2'].changes).toEqual({ name: 'Net 60' });
    expect(plan(['id', 'sectionKey', 'name'], [['p2', 'invoiceProcedures', 'Net-60']]).rows[0].errors).toEqual(['sectionKey cannot be changed by an upload (it is “terms”).']);
  });

  it('ignores a changed order, and says where order is set', () => {
    const result = plan(['id', 'sectionKey', 'name', 'order'], [['p2', 'terms', 'Net-60', '500']]);
    expect(result.rows[0]).toMatchObject({ action: 'unchanged', warnings: ['order is set by dragging in the SOW section editor; the cell is ignored.'] });
  });

  it('a block needs a name', () => {
    expect(plan(['sectionKey', 'name'], [['terms', '']]).rows[0].errors).toEqual(['A new SOW text block needs a name.']);
  });
});

describe('SOW Sections — M6: stored CRLF reads as the same as the LF the reader gives', () => {
  it('is unchanged when only the line ends differ', () => {
    const crlf = catalogOf({ sowSectionKeys: ['terms'], sowPresets: [{ id: 'p1', sectionKey: 'terms', name: 'Default', text: 'Net 30.\r\n- No refunds', order: 1000 }] });
    const result = planSowSections(rawSheet('sowSections', ['id', 'sectionKey', 'name', 'text'], [['p1', 'terms', 'Default', 'Net 30.\n- No refunds']]), crlf);
    expect(result.rows[0].action).toBe('unchanged');
  });
});

describe('SOW Sections — F17b: the order warning only fires on a different number', () => {
  const warnings = (order: string) => plan(['id', 'sectionKey', 'name', 'order'], [['p1', 'terms', 'Default', order]]).rows[0].warnings;
  it('is quiet for a blank cell and for a numerically equal one', () => {
    expect(warnings('')).toEqual([]);
    expect(warnings('1000.0')).toEqual([]);
    expect(warnings('1000')).toEqual([]);
  });
  it('still warns for a different number or a non-number', () => {
    expect(warnings('500')).toHaveLength(1);
    expect(warnings('soon')).toHaveLength(1);
  });
});
