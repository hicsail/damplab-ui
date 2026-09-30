import { describe, expect, it } from 'vitest';
import { buildExportSheet, ExportField, offeredFields } from './exportFields';

type Row = { a: string; b?: number | null; secret: string };
const fields: ExportField<Row>[] = [
  { key: 'a', label: 'A', value: (r) => r.a },
  { key: 'b', label: 'B', value: (r) => r.b },
  { key: 'secret', label: 'Secret', internal: true, value: (r) => r.secret }
];

describe('export fields', () => {
  it('offers internal fields only to callers who may see them (pin 21)', () => {
    expect(offeredFields(fields, false).map((f) => f.key)).toEqual(['a', 'b']);
    expect(offeredFields(fields, true).map((f) => f.key)).toEqual(['a', 'b', 'secret']);
  });

  it('writes exactly the ticked columns, in listed order, blanks for missing values', () => {
    const sheet = buildExportSheet([{ a: 'x', b: null, secret: 's' }], fields, new Set(['secret', 'a']));
    expect(sheet).toEqual([['A', 'Secret'], ['x', 's']]);
    expect(buildExportSheet([{ a: 'x', b: undefined, secret: 's' }], fields, new Set(['b']))).toEqual([['B'], ['']]);
  });
});
