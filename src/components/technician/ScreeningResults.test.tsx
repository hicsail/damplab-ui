import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import ScreeningResults from './ScreeningResults';
import ReportingOptionsDialog, { REPORTING_OPTIONS_TEXT } from './ReportingOptionsDialog';
import { BiosecurityDemoStages, type BiosecurityDemoState } from './BiosecurityDemo';
import type { ScreeningRunCard } from './screeningRunTypes';

const run: ScreeningRunCard = {
  id: 'r1', status: 'PASSED', completedAt: '2026-10-29T16:05:00.000Z', sequenceCount: 2, skippedCount: 0, detail: null, unscreenedNotes: [],
  sequences: [{ length: 900 }, { length: 100 }],
  aclid: { screenId: 'scr_1', homologyStatus: 'PASSED', status: 'succeeded', regulatoryStatus: 'not_controlled', findings: null, detail: null },
  secureDna: null,
  customer: { status: 'NOT_RUN', requesterId: null, verdict: null, decisionStatus: null, checks: null, counts: null, detail: null }
};

describe('ScreeningResults', () => {
  it('shows the Homology and Customer cards with their lines', () => {
    const html = renderToStaticMarkup(<ScreeningResults run={run} />);
    for (const t of ['Homology', 'Customer', '1,000 bp screened', 'Not run']) expect(html).toContain(t);
  });

  it('additional screening is collapsed by default, each block reading the planned text (behaviour 16)', () => {
    const html = renderToStaticMarkup(<ScreeningResults run={run} />);
    expect(html).toContain('aria-expanded="false"');
    for (const t of ['Additional Screening', 'Metadata', 'Watermarking', 'Functional']) expect(html).toContain(t);
    expect(html.split('Planned feature; implementation pending')).toHaveLength(4);
  });

  it('has no Reporting Guidelines button (behaviour 17)', () => {
    expect(renderToStaticMarkup(<ScreeningResults run={run} />)).not.toContain('Reporting Guidelines');
  });

  it('a demo card still renders through the shared card', () => {
    const demo: BiosecurityDemoState = {
      mode: 'fail', done: true,
      stages: { HOMOLOGY: 'FAILED', CUSTOMER: 'PASSED', METADATA: 'FAILED', WATERMARKING: 'PASSED', FUNCTIONAL: 'FAILED' }
    };
    const html = renderToStaticMarkup(<BiosecurityDemoStages demo={demo} />);
    expect(html).toContain('Reporting Guidelines');
    expect(html).toContain('Match to a regulated sequence');
  });
});

describe('Reporting options (behaviour 17)', () => {
  it('the reporting text names nobody and points to the representative', () => {
    const text = REPORTING_OPTIONS_TEXT.join(' ');
    expect(text).toContain('biosecurity representative');
    expect(text).toContain('next steps');
    expect(() => renderToStaticMarkup(<ReportingOptionsDialog open={false} onClose={() => undefined} />)).not.toThrow();
  });
});
