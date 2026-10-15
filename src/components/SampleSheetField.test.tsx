import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import SampleSheetField from './SampleSheetField';

// MUI writes its styles inline when rendered to a string; they are not text.
const text = (markup: string): string => markup.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const columns = { columns: [{ header: 'Inducer', field: 'inducer' }, { header: 'Concentration', field: 'concentration' }] };
const render = (param: any, value: unknown = null, extra: any = {}): string =>
  renderToStaticMarkup(<SampleSheetField param={param} value={value} serviceId='svc1' onChange={() => {}} {...extra} />);

describe('SampleSheetField — a Table defined by columns (rules 14, 15)', () => {
  const param = { id: 'plate', name: 'Plate map', description: 'One row per well.', type: 'table', tableData: columns };

  it('shows the name, the description, a Download template link and a picker for .xlsx and .csv', () => {
    const markup = render(param);
    expect(text(markup)).toContain('Plate map');
    expect(text(markup)).toContain('One row per well.');
    expect(text(markup)).toContain('Download template');
    expect(markup).toContain('type="file"');
    expect(markup).toContain('accept=".xlsx,.csv"');
    expect(text(markup)).toContain('No spreadsheet attached yet.');
  });

  it('needs no Apollo client: the template is generated in the browser', () => {
    expect(() => render(param)).not.toThrow();
  });

  it('once a file is picked, shows its name, its row count and a remove control', () => {
    const markup = render(param, { __kind: 'pending-file', filename: 'plate.xlsx', sampleCount: 12 });
    expect(text(markup)).toContain('plate.xlsx');
    expect(text(markup)).toContain('12 rows');
    expect(markup).toContain('aria-label="Remove spreadsheet"');
    expect(text(markup)).toContain('Replace Plate map');
  });

  it('treats the old empty-string answer as no file', () => {
    expect(text(render(param, ''))).toContain('No spreadsheet attached yet.');
    expect(text(render(param, ['']))).toContain('No spreadsheet attached yet.');
  });

  // A stored Table that still carries allowMultipleValues gets its one file back wrapped in an array.
  it('shows the file of a Table whose answer arrives as a one-element array', () => {
    const markup = render({ ...param, allowMultipleValues: true }, [{ filename: 'plate.xlsx', url: 'https://s3/x', sampleCount: 12, countedBy: 'server' }]);
    expect(markup).toContain('href="https://s3/x"');
    expect(text(markup)).toContain('12 rows');
    expect(text(markup)).not.toContain('No spreadsheet attached yet.');
  });

  it('read-only: no picker and no remove control, the stored file still linked', () => {
    const markup = render(param, { filename: 'plate.xlsx', url: 'https://s3/x', sampleCount: 1 }, { readOnly: true });
    expect(markup).not.toContain('type="file"');
    expect(markup).not.toContain('Remove spreadsheet');
    expect(markup).toContain('href="https://s3/x"');
    expect(text(markup)).toContain('1 row');
  });
});

describe('SampleSheetField — a Table that has not been set up (rule 16)', () => {
  it('says so and offers no picker and no template', () => {
    const markup = render({ id: 'plate', name: 'Plate map', type: 'table', tableData: null });
    expect(text(markup)).toContain('Plate map');
    expect(text(markup)).toContain('This table has not been set up yet.');
    expect(markup).not.toContain('type="file"');
    expect(text(markup)).not.toContain('Download template');
  });

  it('still lists a file already stored on it (rule 31)', () => {
    const markup = render({ id: 'plate', name: 'Plate map', type: 'sampleSheet' }, { filename: 'old.xlsx', url: 'https://s3/old', sampleCount: 4 });
    expect(markup).toContain('href="https://s3/old"');
    expect(text(markup)).toContain('4 rows');
    expect(markup).not.toContain('type="file"');
  });
});
