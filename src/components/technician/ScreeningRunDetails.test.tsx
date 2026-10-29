import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ScreeningHistory from './ScreeningHistory';
import { ScreeningRunDetailsContent } from './ScreeningRunDetailsModal';
import type { ScreeningRunDetail } from './screeningRunTypes';

const run: ScreeningRunDetail = {
  id: 'r1', jobId: 'j1', trigger: 'RERUN', triggeredBy: 'staff@bu.edu', status: 'FAILED', startedAt: '2026-10-29T16:05:00.000Z', completedAt: '2026-10-29T16:06:00.000Z',
  sequenceCount: 2, skippedCount: 1, detail: 'Aclid controlled; 1 value skipped: not DNA',
  sequences: [
    { name: 's1', label: 'Plates › Plate map › row 1 › Insert', length: 960, aclidEligible: true },
    { name: 's2', label: 'Plates › Plate map › row 2 › Insert', length: 25, aclidEligible: false }
  ],
  aclid: {
    screenId: 'scr_1', homologyStatus: 'FAILED', status: 'succeeded', regulatoryStatus: 'controlled', verificationStatus: 'pending', decisionStatus: 'awaiting', matchCount: 4, materialCount: 1,
    findings: { us_ccl_export_control: { reason_code: 'toxin', regulatory_status: 'controlled', material: 'Ricin' } },
    materialSummary: { Ricin: { control_type: 'toxin', coverage: 0.4, unique_coverage: 0.1, total_sequences: 1, risk_factors: { close_match: true } } },
    details: { s1: { regulatory_status: 'controlled', findings: null, matches: [{ organism: 'Ricinus communis', gene: 'RCA', function: 'toxin', pident: 98.5, qcov: 100, evalue: 1e-50, pathogenesis: true, housekeeping: false, funsocs: [] }] } },
    raw: { id: 'scr_1', length: 985 }, detail: null
  },
  secureDna: { batchId: null, status: 'PASSED', detail: null }
};

describe('screening run details (biosecurity-update)', () => {
  it('shows each sequence under its label, Aclid’s header, findings, materials and per-sequence matches (behaviour 13)', () => {
    const html = renderToStaticMarkup(<ScreeningRunDetailsContent run={run} batch={null} />);
    for (const text of ['Plates › Plate map › row 1 › Insert', 'Controlled', 'US Commerce Control List', 'toxin', 'Ricin', 'Close sequence match', 'Ricinus communis', '98.5%', 'Total length', '985']) {
      expect(html).toContain(text);
    }
  });

  it('says the details are not available yet when the run has none (behaviour 13)', () => {
    const html = renderToStaticMarkup(<ScreeningRunDetailsContent run={{ ...run, aclid: { ...run.aclid!, details: null } }} batch={null} />);
    expect(html).toContain('Details not available yet');
  });

  it('the history reads “No screenings recorded yet” with no runs, and a dropdown otherwise (behaviour 10)', () => {
    expect(renderToStaticMarkup(<ScreeningHistory runs={[]} onSelect={() => undefined} />)).toContain('No screenings recorded yet');
    expect(renderToStaticMarkup(<ScreeningHistory runs={[run]} onSelect={() => undefined} />)).toContain('Screening history (1)');
  });
});
