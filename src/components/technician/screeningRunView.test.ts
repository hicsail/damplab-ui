import { describe, expect, it } from 'vitest';
import {
  aclidFindingRows, DETAILS_NOT_AVAILABLE_TEXT, materialRows, NO_SCREENINGS_TEXT, reasonCodeDescription, regulatoryLabel,
  screeningRunIsLoading, screeningRunOptionLabel, screeningRunSecondary, secureDnaHitCounts, sequenceMatchGroup
} from './screeningRunView';

const run = { id: 'r1', jobId: 'j1', trigger: 'RERUN', triggeredBy: 'staff@bu.edu', status: 'PASSED', startedAt: '2026-10-29T16:05:00.000Z', completedAt: null, sequenceCount: 192, skippedCount: 2, detail: null } as const;

describe('screening run view helpers', () => {
  it('pins the empty-state and no-details sentences (behaviours 10, 13)', () => {
    expect(NO_SCREENINGS_TEXT).toBe('No screenings recorded yet');
    expect(DETAILS_NOT_AVAILABLE_TEXT).toBe('Details not available yet');
  });

  it('labels a history entry as <date time> · <outcome> · <n> sequences', () => {
    expect(screeningRunOptionLabel(run)).toMatch(/^.+ · Passed · 192 sequences$/);
    expect(screeningRunOptionLabel({ ...run, sequenceCount: 1 })).toMatch(/ · 1 sequence$/);
    expect(screeningRunSecondary(run)).toBe('Rerun by staff@bu.edu · 2 skipped');
    expect(screeningRunSecondary({ ...run, trigger: 'SUBMISSION', triggeredBy: null, skippedCount: 0 })).toBe('On submission');
  });

  it('reads regulatory status the way staff say it', () => {
    expect(regulatoryLabel('controlled')).toBe('Controlled');
    expect(regulatoryLabel('not_controlled')).toBe('Not controlled');
    expect(regulatoryLabel(null)).toBe('—');
  });

  it('finds a reason code’s description from the spec’s table, falling back to the common exemptions', () => {
    expect(reasonCodeDescription('us_ccl_export_control', 'toxin')).toMatch(/^This gene encodes a controlled toxin or subunit\./);
    expect(reasonCodeDescription('eu_dual_use_export_control', 'housekeeping')).toMatch(/housekeeping or metabolic/);
    expect(reasonCodeDescription('us_ccl_export_control', 'made_up')).toBeNull();
    expect(reasonCodeDescription('nowhere', null)).toBeNull();
  });

  it('turns findings into one row per framework', () => {
    expect(aclidFindingRows({ us_ccl_export_control: { reason_code: 'toxin', regulatory_status: 'controlled', material: 'Ricin' }, junk: 3 })).toEqual([
      { framework: 'us_ccl_export_control', frameworkLabel: 'US Commerce Control List', reasonCode: 'toxin', reasonDescription: expect.stringMatching(/toxin/), regulatoryStatus: 'controlled', material: 'Ricin' }
    ]);
    expect(aclidFindingRows(null)).toEqual([]);
  });

  it('turns the material summary into rows with all five risk factors', () => {
    const rows = materialRows({ Ricin: { control_type: 'toxin', coverage: 0.42, unique_coverage: 0.1, total_sequences: 2, risk_factors: { distant_matches: false, poorly_characterized: false, close_match: true, virulence: true, virulence_covered: false } } });
    expect(rows[0]).toMatchObject({ material: 'Ricin', controlType: 'toxin', coverage: 0.42, uniqueCoverage: 0.1, totalSequences: 2 });
    expect(rows[0].riskFactors.map((f) => [f.label, f.on])).toEqual([
      ['Only distant matches', false], ['Poorly characterized', false], ['Close sequence match', true], ['Key virulence protein covered', true], ['High pathogenesis gene coverage', false]
    ]);
  });

  it('reads one sequence’s match group from the details map, or null', () => {
    const details = {
      s1: {
        regulatory_status: 'controlled',
        findings: { us_select_agent: { reason_code: 'toxin', regulatory_status: 'controlled', material: 'Ricin' } },
        matches: [{ organism: 'Ricinus communis', gene: 'RCA', function: 'toxin', pident: 98.5, qcov: 100, evalue: 1e-50, pathogenesis: true, housekeeping: false, funsocs: [{ name: 'Toxin', description: 'x' }] }]
      }
    };
    const group = sequenceMatchGroup(details, 's1')!;
    expect(group.regulatoryStatus).toBe('controlled');
    expect(group.findings).toHaveLength(1);
    expect(group.matches[0]).toEqual({ organism: 'Ricinus communis', gene: 'RCA', function: 'toxin', pident: 98.5, qcov: 100, evalue: 1e-50, pathogenesis: true, housekeeping: false, funsocs: ['Toxin'] });
    expect(sequenceMatchGroup(details, 'missing')).toBeNull();
    expect(sequenceMatchGroup(null, 's1')).toBeNull();
  });

  it('counts SecureDNA hits per slice name', () => {
    const counts = secureDnaHitCounts({ sequences: [{ name: 'a', threats: [{}, {}] }, { name: 'b', threats: [] }] } as any);
    expect(counts.get('a')).toBe(2);
    expect(counts.get('b')).toBe(0);
    expect(secureDnaHitCounts(null).size).toBe(0);
  });
});

describe('screeningRunIsLoading (F13)', () => {
  it('spins until the requested run arrives, but treats a loaded null as loaded', () => {
    expect(screeningRunIsLoading({ loading: true, hasError: false, data: undefined, requestedId: 'r1' })).toBe(true);
    expect(screeningRunIsLoading({ loading: false, hasError: false, data: undefined, requestedId: 'r1' })).toBe(true);
    expect(screeningRunIsLoading({ loading: false, hasError: false, data: { screeningRun: { id: 'r0' } }, requestedId: 'r1' })).toBe(true);
    expect(screeningRunIsLoading({ loading: false, hasError: false, data: { screeningRun: { id: 'r1' } }, requestedId: 'r1' })).toBe(false);
    expect(screeningRunIsLoading({ loading: false, hasError: false, data: { screeningRun: null }, requestedId: 'r1' })).toBe(false);
    expect(screeningRunIsLoading({ loading: false, hasError: true, data: undefined, requestedId: 'r1' })).toBe(false);
  });
});
