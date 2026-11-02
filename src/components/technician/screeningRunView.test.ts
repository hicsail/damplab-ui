import { describe, expect, it } from 'vitest';
import type { ScreeningRunCard } from './screeningRunTypes';
import {
  aclidFindingRows, customerCardView, DETAILS_NOT_AVAILABLE_TEXT, homologyCardView, isNothingToScreen, paneNothingToScreen, screeningsFromRun, materialRows, NO_SCREENINGS_TEXT, reasonCodeDescription, regulatoryLabel,
  acceptanceGateView, aclidResultLegs, paneStatusLabel, staffHomologyNoteFromRun, screeningBusy, screeningButtonLabel, showRefreshResults, screeningRunIsLoading, screeningRunOptionLabel, screeningRunSecondary, secureDnaHitCounts, sequenceMatchGroup
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

const base: ScreeningRunCard = {
  id: 'r1', status: 'PASSED', completedAt: '2026-10-29T16:05:00.000Z', sequenceCount: 2, skippedCount: 0, detail: null, unscreenedNotes: [],
  sequences: [{ length: 900 }, { length: 100 }],
  aclid: { screenId: 'scr_1', homologyStatus: 'PASSED', status: 'succeeded', regulatoryStatus: 'not_controlled', findings: null, detail: null },
  secureDna: null, customer: null
};

describe('homologyCardView (behaviour 15)', () => {
  it('passed: count and total bp, then the regulatory status', () => {
    const v = homologyCardView(base);
    expect(v).toMatchObject({ status: 'PASSED', statusText: 'Passed' });
    expect(v.lines).toEqual(['2 sequences · 1,000 bp screened', 'Regulatory status: Not controlled', 'No findings']);
  });
  it('failed: lists each finding', () => {
    const v = homologyCardView({ ...base, status: 'FAILED', aclid: { ...base.aclid!, regulatoryStatus: 'controlled', findings: { us_ccl_export_control: { reason_code: 'toxin', regulatory_status: 'controlled', material: 'Ricin' } } } });
    expect(v.status).toBe('FAILED');
    expect(v.lines.join(' ')).toContain('US Commerce Control List');
    expect(v.lines.join(' ')).toContain('Ricin');
  });
  it('zero sequences reads as nothing to screen', () => {
    expect(homologyCardView({ ...base, status: 'UNAVAILABLE', sequenceCount: 0, sequences: [], aclid: null })).toMatchObject({ status: 'UNAVAILABLE', statusText: 'Nothing to screen' });
  });
  it('a real zero-sequence run carries a detail and still reads as nothing to screen', () => {
    const v = homologyCardView({ ...base, status: 'UNAVAILABLE', sequenceCount: 0, sequences: [], aclid: null, detail: 'No screenable DNA sequences on this job' });
    expect(v).toMatchObject({ status: 'UNAVAILABLE', statusText: 'Nothing to screen' });
    expect(v.lines).toEqual(['No screenable DNA sequences on this job']);
  });
  it('zero sequences with an unscreened note stays unavailable, with its reason', () => {
    const v = homologyCardView({ ...base, status: 'UNAVAILABLE', sequenceCount: 0, sequences: [], aclid: null, detail: 'No screenable DNA sequences on this job', unscreenedNotes: ['Plate: a.csv could not be read'] });
    expect(v).toMatchObject({ status: 'UNAVAILABLE', statusText: 'Unavailable' });
    expect(v.lines).toContain('Plate: a.csv could not be read');
  });
  it('isNothingToScreen: only a completed unavailable run with no sequences and no notes', () => {
    const zero = { ...base, status: 'UNAVAILABLE' as const, sequenceCount: 0, sequences: [], aclid: null };
    expect(isNothingToScreen(zero)).toBe(true);
    expect(isNothingToScreen({ ...zero, detail: 'No screenable DNA sequences on this job' })).toBe(true);
    expect(isNothingToScreen({ ...zero, unscreenedNotes: ['x'] })).toBe(false);
    expect(isNothingToScreen({ ...zero, status: 'PASSED' })).toBe(false);
    expect(isNothingToScreen({ ...zero, sequenceCount: 2 })).toBe(false);
    expect(isNothingToScreen(null)).toBe(false);
  });
  it('the pane reads nothing to screen only when the gate is clear too', () => {
    const zero = { ...base, status: 'UNAVAILABLE' as const, sequenceCount: 0, sequences: [], aclid: null, detail: 'No screenable DNA sequences on this job' };
    expect(paneNothingToScreen(zero, 'CLEAR')).toBe(true);
    expect(paneNothingToScreen(zero, 'NOT_REQUIRED')).toBe(true);
    for (const state of ['NOT_PASSED', 'STALE', 'IN_PROGRESS', 'NOT_RUN'] as const) expect(paneNothingToScreen(zero, state)).toBe(false);
    expect(paneNothingToScreen(zero, undefined)).toBe(false);
    expect(paneNothingToScreen(zero, null)).toBe(false);
    expect(paneNothingToScreen({ ...zero, unscreenedNotes: ['x'] }, 'CLEAR')).toBe(false);
    expect(paneNothingToScreen(null, 'CLEAR')).toBe(false);
  });
  it('a slow Aclid screen reads as in progress', () => {
    expect(homologyCardView({ ...base, status: 'UNAVAILABLE', aclid: { ...base.aclid!, homologyStatus: 'IN_PROGRESS' } })).toMatchObject({ status: 'IN_PROGRESS', statusText: 'In progress' });
  });
  it('an unfinished Aclid screen does not read as clear', () => {
    const v = homologyCardView({ ...base, status: 'UNAVAILABLE', aclid: { ...base.aclid!, homologyStatus: 'IN_PROGRESS', findings: null } });
    expect(v.lines.join(' ')).not.toContain('No findings');
    expect(v.lines.join(' ')).not.toContain('Regulatory status');
  });
  it('an errored Aclid leg shows no findings or regulatory line, but the reason', () => {
    const v = homologyCardView({ ...base, status: 'UNAVAILABLE', detail: 'Aclid unavailable: boom', aclid: { ...base.aclid!, homologyStatus: 'UNAVAILABLE', findings: null, detail: 'boom' } });
    expect(v.lines.join(' ')).not.toContain('No findings');
    expect(v.lines.join(' ')).not.toContain('Regulatory status');
    expect(v.lines).toContain('Aclid unavailable: boom');
  });
  it('a run still going reads as in progress', () => {
    expect(homologyCardView({ ...base, status: 'IN_PROGRESS', completedAt: null }).status).toBe('IN_PROGRESS');
  });
  it('no provider verdict reads as unavailable, with the reason', () => {
    const v = homologyCardView({ ...base, status: 'UNAVAILABLE', detail: 'Aclid unavailable: boom', aclid: null });
    expect(v).toMatchObject({ status: 'UNAVAILABLE', statusText: 'Unavailable' });
    expect(v.lines).toContain('Aclid unavailable: boom');
  });
  it('unscreened notes appear whatever the status', () => {
    expect(homologyCardView({ ...base, unscreenedNotes: ['Plate: a.csv was not uploaded'] }).lines).toContain('Plate: a.csv was not uploaded');
  });
  it('no run reads as not screened', () => {
    expect(homologyCardView(null)).toMatchObject({ status: 'UNAVAILABLE', statusText: 'Not screened' });
  });
});

describe('customerCardView (behaviour 15)', () => {
  const leg = (over: object) => ({ ...base, customer: { status: 'PASSED', requesterId: 'r', verdict: 'no_issues_found', decisionStatus: 'awaiting', checks: [], counts: null, detail: null, ...over } }) as ScreeningRunCard;
  it.each([
    ['PASSED', 'PASSED', 'Passed'], ['NEEDS_REVIEW', 'FAILED', 'Needs review'], ['FAILED', 'FAILED', 'Failed'], ['IN_PROGRESS', 'IN_PROGRESS', 'In progress'],
    ['NOT_AVAILABLE', 'UNAVAILABLE', 'Not available'], ['NOT_RUN', 'UNAVAILABLE', 'Not run'], ['UNAVAILABLE', 'UNAVAILABLE', 'Unavailable']
  ])('%s has tone %s and reads %s', (status, tone, text) => {
    expect(customerCardView(leg({ status }))).toMatchObject({ status: tone, statusText: text });
  });
  it('shows the verdict, then each person and institution check', () => {
    const v = customerCardView(leg({ checks: [
      { id: 'person_watchlist', group: 'person', state: 'confirmed', finding: 'No watchlist match' },
      { id: 'legal_entity', group: 'institution', state: 'issue', finding: 'Entity not found' }
    ] }));
    expect(v.lines).toEqual(['Verdict: no issues found', 'Person · Confirmed: No watchlist match', 'Institution · Issue: Entity not found']);
  });
  it('tolerates checks that are not an array, and malformed entries', () => {
    expect(customerCardView(leg({ checks: { x: 1 } })).lines).toEqual(['Verdict: no issues found']);
    expect(customerCardView(leg({ checks: [null, 'x', {}] })).lines).toEqual(['Verdict: no issues found']);
  });
  it('explains Not available and Not run in words', () => {
    expect(customerCardView(leg({ status: 'NOT_AVAILABLE', verdict: null })).lines).toEqual(['Customer screening is not enabled for this Aclid account. It does not block acceptance.']);
    expect(customerCardView(leg({ status: 'NOT_RUN', verdict: null })).lines).toEqual(['This run has no Aclid screen to attach it to.']);
  });
  it('shows the reason when unavailable', () => {
    expect(customerCardView(leg({ status: 'UNAVAILABLE', verdict: null, detail: 'Aclid returned 500' })).lines).toContain('Aclid returned 500');
  });
  it('a run with no leg says it was not part of the run; the NOT_RUN status keeps "Not run" (M1)', () => {
    expect(customerCardView({ ...base, customer: null })).toMatchObject({ status: 'UNAVAILABLE', statusText: 'Not part of this run', lines: ['Customer screening was not part of this run.'] });
    expect(customerCardView(leg({ status: 'NOT_RUN', verdict: null }))).toMatchObject({ statusText: 'Not run', lines: ['This run has no Aclid screen to attach it to.'] });
    expect(customerCardView(null).statusText).toBe('Not screened');
  });
});

describe('screeningsFromRun', () => {
  it('uses the run when there is one, and the job otherwise', () => {
    const job = { homologyScreening: { status: 'FAILED' }, aclidScreening: { customerStatus: 'IN_PROGRESS' } };
    // The runs query has not answered: the job's own fields stand in.
    expect(screeningsFromRun(job, null)).toMatchObject({ HOMOLOGY: 'FAILED', CUSTOMER: 'IN_PROGRESS' });
    expect(screeningsFromRun(job, null, false)).toMatchObject({ HOMOLOGY: 'FAILED', CUSTOMER: 'IN_PROGRESS' });
    expect(screeningsFromRun(job, { ...base, customer: { status: 'NOT_AVAILABLE' } as any })).toMatchObject({ HOMOLOGY: 'PASSED', CUSTOMER: 'UNAVAILABLE' });
  });
  it('a job whose runs query answered with none reads Homology and Customer as unavailable (I2)', () => {
    const job = { homologyScreening: { status: 'FAILED' }, aclidScreening: { customerStatus: 'IN_PROGRESS' } };
    expect(screeningsFromRun(job, null, true)).toMatchObject({ HOMOLOGY: 'UNAVAILABLE', CUSTOMER: 'UNAVAILABLE' });
  });
});

describe('paneStatusLabel (F6)', () => {
  const needsReview = { ...base, customer: { status: 'NEEDS_REVIEW' } as any };
  it('reads Needs review when the customer leg is the only reason the composite failed', () => {
    expect(paneStatusLabel('FAILED', needsReview)).toBe('Needs review');
  });
  it('still reads Failed when homology failed too, or the customer leg failed outright', () => {
    expect(paneStatusLabel('FAILED', { ...needsReview, status: 'FAILED', aclid: { ...base.aclid!, homologyStatus: 'FAILED' } })).toBe('Failed');
    expect(paneStatusLabel('FAILED', { ...base, customer: { status: 'FAILED' } as any })).toBe('Failed');
  });
  it('leaves every other composite alone', () => {
    expect(paneStatusLabel('PASSED', needsReview)).toBe('Passed');
    expect(paneStatusLabel('FAILED', null)).toBe('Failed');
  });
});

describe('aclidResultLegs (M2)', () => {
  it('credits Aclid with homology only when the run has an Aclid screen, and with customer only when it has a requester', () => {
    const withCustomer = { ...base, customer: { status: 'PASSED', requesterId: 'r1' } as any };
    expect(aclidResultLegs(withCustomer)).toEqual({ HOMOLOGY: true, CUSTOMER: true });
    expect(aclidResultLegs({ ...base, aclid: { ...base.aclid!, screenId: null }, customer: { status: 'NOT_AVAILABLE', requesterId: null } as any })).toEqual({ HOMOLOGY: false, CUSTOMER: false });
    expect(aclidResultLegs({ ...base, aclid: null, customer: null })).toEqual({ HOMOLOGY: false, CUSTOMER: false });
    expect(aclidResultLegs(null)).toEqual({ HOMOLOGY: false, CUSTOMER: false });
  });
});

describe('staffHomologyNoteFromRun (M4)', () => {
  it('reads the run, so a lifted run does not repeat the job row\'s stale "still running"', () => {
    const { note } = staffHomologyNoteFromRun({ ...base, status: 'PASSED', aclid: { ...base.aclid!, homologyStatus: 'PASSED', detail: null } });
    expect(note).toContain('cleared by Aclid');
    expect(note).not.toContain('still running');
  });
  it('carries a SecureDNA backup sentence from the run', () => {
    const { backup } = staffHomologyNoteFromRun({ ...base, detail: 'SecureDNA backup (after Aclid error)', aclid: { ...base.aclid!, homologyStatus: 'UNAVAILABLE' } });
    expect(backup).toBe('SecureDNA backup (after Aclid error)');
  });
});

describe('Run / Rerun / Refresh (behaviour 20, Review Focus 5)', () => {
  it('the button reads Run screening with no run, Rerun screening with one (behaviour 20)', () => {
    expect(screeningButtonLabel(0, false)).toBe('Run screening');
    expect(screeningButtonLabel(1, false)).toBe('Rerun screening');
    expect(screeningButtonLabel(1, true)).toBe('Screening…');
  });
  it.each([
    ['IN_PROGRESS', 'PASSED', true], ['NEEDS_REVIEW', 'PASSED', true], ['PASSED', 'IN_PROGRESS', true],
    ['PASSED', 'PASSED', false], ['NOT_AVAILABLE', 'PASSED', false], ['UNAVAILABLE', 'PASSED', false]
  ])('Refresh results: customer %s, Aclid %s → %s', (customer, aclid, shown) => {
    expect(showRefreshResults({ ...base, customer: { status: customer } as any, aclid: { ...base.aclid!, homologyStatus: aclid as any } })).toBe(shown);
  });
  it('no refresh without a run', () => expect(showRefreshResults(null)).toBe(false));

  describe('screeningBusy (Review Focus 5)', () => {
    const now = Date.parse('2026-11-01T12:00:00Z');
    it("is busy during this page's own rerun", () => expect(screeningBusy({ status: 'PASSED' }, true, now)).toBe(true));
    it('is busy while a recent run is in progress', () => expect(screeningBusy({ status: 'IN_PROGRESS', startedAt: '2026-11-01T11:55:00Z' }, false, now)).toBe(true));
    it('frees the button when a run has sat in progress for over ten minutes', () => expect(screeningBusy({ status: 'IN_PROGRESS', startedAt: '2026-11-01T11:45:00Z' }, false, now)).toBe(false));
    it('frees the button when there is no start time', () => expect(screeningBusy({ status: 'IN_PROGRESS' }, false, now)).toBe(false));
    it('is free with no homology row', () => expect(screeningBusy(null, false, now)).toBe(false));
  });
});

describe('acceptanceGateView (behaviour 13)', () => {
  it('holds Accept while the answer is loading', () => {
    expect(acceptanceGateView({ data: undefined, loading: true, hasError: false })).toEqual({ disabled: true, note: 'Checking screening…' });
  });
  it.each(['CLEAR', 'NOT_REQUIRED'] as const)('%s leaves Accept on, with no note', (state) => {
    expect(acceptanceGateView({ data: { state, message: null }, loading: false, hasError: false })).toEqual({ disabled: false, note: null });
  });
  it.each(['NOT_RUN', 'IN_PROGRESS', 'NOT_PASSED', 'STALE'] as const)('%s disables Accept with the server\'s message', (state) => {
    expect(acceptanceGateView({ data: { state, message: 'Rerun screening.' }, loading: false, hasError: false })).toEqual({ disabled: true, note: 'Rerun screening.' });
  });
  it('a failed check leaves Accept on: the server still enforces the gate', () => {
    expect(acceptanceGateView({ data: undefined, loading: false, hasError: true })).toEqual({ disabled: false, note: null });
  });
});
