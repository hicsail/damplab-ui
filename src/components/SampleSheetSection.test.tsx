import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

const mutate = vi.fn(async () => ({ data: {} }));
vi.mock('@apollo/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@apollo/client')>()),
  useMutation: () => [mutate]
}));

import SampleSheetSection, { useSampleSheetUpload } from './SampleSheetSection';
import type { SampleSheetSlot } from './JobWorkflowCards';

const text = (markup: string): string => markup.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const slot = (over: Partial<SampleSheetSlot> = {}): SampleSheetSlot => ({
  nodeDbId: 'n1',
  nodeLabel: 'Induction',
  parameterId: 'plate',
  parameterName: 'Plate map',
  columns: ['Inducer', 'Concentration'],
  setUp: true,
  ...over
});
const render = (slots: SampleSheetSlot[], canEdit = true): string =>
  renderToStaticMarkup(<SampleSheetSection jobId='j1' slots={slots} canEdit={canEdit} onChanged={() => {}} />);

describe('SampleSheetSection — the Tables on a job page', () => {
  it('offers Upload for a Table that is set up, and Replace once a file is attached', () => {
    expect(text(render([slot()]))).toContain('Upload');
    expect(text(render([slot({ filename: 'plate.xlsx', sampleCount: 3 })]))).toContain('Replace');
  });

  // M4 / rule 16: no upload can be offered, and the customer is told why.
  it('says the table has not been set up, and offers no upload, for an unconfigured Table', () => {
    const markup = render([slot({ columns: [], setUp: false })]);
    expect(text(markup)).toContain('This table has not been set up yet.');
    expect(text(markup)).not.toContain('No spreadsheet uploaded yet');
    expect(markup).not.toContain('type="file"');
  });

  it('offers the upload for a legacy staff-template Table that has no columns (rule 20)', () => {
    const markup = render([slot({ columns: [], setUp: true })]);
    expect(markup).toContain('type="file"');
    expect(text(markup)).toContain('No spreadsheet uploaded yet');
  });

  it('offers no upload to a reader who cannot edit', () => {
    expect(render([slot()], false)).not.toContain('type="file"');
  });
});

describe('useSampleSheetUpload — the column check runs before anything is uploaded (rule 17)', () => {
  it('refuses a file missing a column without asking for an upload URL or storing anything', async () => {
    let upload: ReturnType<typeof useSampleSheetUpload>['upload'] | undefined;
    const Probe = (): null => {
      upload = useSampleSheetUpload('j1', () => {}).upload;
      return null;
    };
    renderToStaticMarkup(<Probe />);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    const file = new File(['Inducer\nIPTG\n'], 'plate.csv', { type: 'text/csv' });
    await upload!(slot(), file);
    expect(mutate).not.toHaveBeenCalled();
    expect(fetchSpy).not.toHaveBeenCalled();
    // Control: a file that does carry the columns goes on to ask for an upload URL.
    await upload!(slot({ columns: ['Inducer'] }), file);
    expect(mutate).toHaveBeenCalledTimes(1);
    fetchSpy.mockRestore();
  });
});
