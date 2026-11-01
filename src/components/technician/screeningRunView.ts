import { formatSOWInstant } from '../../utils/sowDateUtils';
import {
  biosecurityFromJob,
  biosecurityStatusLabel,
  type BiosecurityScreeningStatus,
  type BiosecurityScreenings
} from './biosecurityStatus';
import { ACLID_FRAMEWORK_LABELS, ACLID_REASON_CODES } from './aclidReasonCodes';
import type { CustomerScreeningStatus, JobAcceptanceScreening, ScreeningRunCard, ScreeningRunSummary } from './screeningRunTypes';
import type { ScreeningBatch } from '../../securedna/types';

export const NO_SCREENINGS_TEXT = 'No screenings recorded yet';
export const DETAILS_NOT_AVAILABLE_TEXT = 'Details not available yet';

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);

/** One history entry: `<date time> · <outcome> · <n> sequences`. */
export function screeningRunOptionLabel(run: Pick<ScreeningRunSummary, 'startedAt' | 'status' | 'sequenceCount'>): string {
  const n = run.sequenceCount;
  return `${formatSOWInstant(run.startedAt, 'datetime')} · ${biosecurityStatusLabel(run.status)} · ${n} ${n === 1 ? 'sequence' : 'sequences'}`;
}

/** The second line: who or what started it, and how many values were not DNA. */
export function screeningRunSecondary(run: Pick<ScreeningRunSummary, 'trigger' | 'triggeredBy' | 'skippedCount'>): string {
  const who = run.trigger === 'RERUN' ? (run.triggeredBy ? `Rerun by ${run.triggeredBy}` : 'Rerun') : 'On submission';
  return run.skippedCount > 0 ? `${who} · ${run.skippedCount} skipped` : who;
}

export function regulatoryLabel(status: unknown): string {
  if (status === 'controlled') return 'Controlled';
  if (status === 'not_controlled') return 'Not controlled';
  return '—';
}

/** The spec's description of a reason code under its framework, else among the common exemptions. */
export function reasonCodeDescription(framework: string, code: string | null | undefined): string | null {
  if (!code) return null;
  return ACLID_REASON_CODES[framework]?.[code] ?? ACLID_REASON_CODES['*']?.[code] ?? null;
}

export interface FindingRow {
  framework: string;
  frameworkLabel: string;
  reasonCode: string | null;
  reasonDescription: string | null;
  regulatoryStatus: string | null;
  material: string | null;
}

/** Aclid `findings` (framework → Finding) as rows; anything that is not a Finding is skipped. */
export function aclidFindingRows(findings: unknown): FindingRow[] {
  if (!isObject(findings)) return [];
  return Object.entries(findings)
    .filter((entry): entry is [string, Json] => isObject(entry[1]))
    .map(([framework, finding]) => ({
      framework,
      frameworkLabel: ACLID_FRAMEWORK_LABELS[framework] ?? framework,
      reasonCode: str(finding.reason_code),
      reasonDescription: reasonCodeDescription(framework, str(finding.reason_code)),
      regulatoryStatus: str(finding.regulatory_status),
      material: str(finding.material)
    }));
}

const RISK_FACTORS: ReadonlyArray<[string, string]> = [
  ['distant_matches', 'Only distant matches'],
  ['poorly_characterized', 'Poorly characterized'],
  ['close_match', 'Close sequence match'],
  ['virulence', 'Key virulence protein covered'],
  ['virulence_covered', 'High pathogenesis gene coverage']
];

export interface MaterialRow {
  material: string;
  controlType: string | null;
  coverage: number | null;
  uniqueCoverage: number | null;
  totalSequences: number | null;
  riskFactors: Array<{ key: string; label: string; on: boolean }>;
}

/** Aclid `material_summary` (material → MaterialSummary) as rows, with all five risk factors in the spec's order. */
export function materialRows(summary: unknown): MaterialRow[] {
  if (!isObject(summary)) return [];
  return Object.entries(summary)
    .filter((entry): entry is [string, Json] => isObject(entry[1]))
    .map(([material, m]) => {
      const factors = isObject(m.risk_factors) ? m.risk_factors : {};
      return {
        material,
        controlType: str(m.control_type),
        coverage: num(m.coverage),
        uniqueCoverage: num(m.unique_coverage),
        totalSequences: num(m.total_sequences),
        riskFactors: RISK_FACTORS.map(([key, label]) => ({ key, label, on: factors[key] === true }))
      };
    });
}

export interface MatchRow {
  organism: string | null;
  gene: string | null;
  function: string | null;
  pident: number | null;
  qcov: number | null;
  evalue: number | null;
  pathogenesis: boolean;
  housekeeping: boolean;
  funsocs: string[];
}

export interface MatchGroupView {
  regulatoryStatus: string | null;
  findings: FindingRow[];
  matches: MatchRow[];
}

/** One sequence's `MatchGroup` from the details map (keyed by slice name), or null when absent. */
export function sequenceMatchGroup(details: unknown, name: string): MatchGroupView | null {
  if (!isObject(details) || !isObject(details[name])) return null;
  const group = details[name] as Json;
  const matches = Array.isArray(group.matches) ? group.matches.filter(isObject) : [];
  return {
    regulatoryStatus: str(group.regulatory_status),
    findings: aclidFindingRows(group.findings),
    matches: matches.map((m) => ({
      organism: str(m.organism),
      gene: str(m.gene),
      function: str(m.function),
      pident: num(m.pident),
      qcov: num(m.qcov),
      evalue: num(m.evalue),
      pathogenesis: m.pathogenesis === true,
      housekeeping: m.housekeeping === true,
      funsocs: Array.isArray(m.funsocs) ? m.funsocs.filter(isObject).map((f) => str(f.name)).filter((n): n is string => !!n) : []
    }))
  };
}

/** SecureDNA hazard hits per slice name, for the sequence table. */
export function secureDnaHitCounts(batch: Pick<ScreeningBatch, 'sequences'> | null | undefined): Map<string, number> {
  const counts = new Map<string, number>();
  for (const slice of batch?.sequences ?? []) {
    const name = (slice as { name?: string }).name;
    if (name) counts.set(name, (slice.threats ?? []).length);
  }
  return counts;
}

/**
 * Whether the run modal should still spin. A run that resolved `null` (no error) is loaded: the
 * modal says "No screening run found." Data for a different run than the one requested is stale.
 */
export function screeningRunIsLoading(args: { loading: boolean; hasError: boolean; data: { screeningRun: { id: string } | null } | undefined; requestedId: string | null }): boolean {
  if (args.loading) return true;
  if (args.hasError) return false;
  if (!args.data) return true;
  return args.data.screeningRun !== null && args.data.screeningRun.id !== args.requestedId;
}

export const PLANNED_FEATURE_TEXT = 'Planned feature; implementation pending';
export const NOT_SCREENED_TEXT = 'Not screened';

export interface ScreeningCardView {
  status: BiosecurityScreeningStatus;
  statusText: string;
  lines: string[];
}

const HOMOLOGY_TEXT: Record<BiosecurityScreeningStatus, string> = {
  PASSED: 'Passed',
  FAILED: 'Failed',
  IN_PROGRESS: 'In progress',
  UNAVAILABLE: 'Unavailable'
};

export const NOTHING_TO_SCREEN_TEXT = 'Nothing to screen';

/**
 * A completed run that found no DNA to screen. A run with unscreened notes (a collection threw, a
 * table could not be read) also has zero sequences, but it blocks, so it is not "nothing to screen".
 */
export function isNothingToScreen(run: ScreeningRunCard | null | undefined): boolean {
  return (
    !!run &&
    run.status === 'UNAVAILABLE' &&
    run.sequenceCount === 0 &&
    (run.unscreenedNotes ?? []).length === 0 &&
    run.aclid?.homologyStatus !== 'IN_PROGRESS'
  );
}

/** The Homology card for a run: the count, Aclid's regulatory status and findings, SecureDNA's verdict. */
export function homologyCardView(run: ScreeningRunCard | null): ScreeningCardView {
  if (!run) return { status: 'UNAVAILABLE', statusText: NOT_SCREENED_TEXT, lines: [] };
  const notes = run.unscreenedNotes ?? [];
  if (isNothingToScreen(run)) {
    return { status: 'UNAVAILABLE', statusText: NOTHING_TO_SCREEN_TEXT, lines: run.detail ? [run.detail] : [] };
  }
  const status: BiosecurityScreeningStatus =
    run.status === 'UNAVAILABLE' && run.aclid?.homologyStatus === 'IN_PROGRESS' ? 'IN_PROGRESS' : run.status;

  const lines: string[] = [];
  if ((status === 'PASSED' || status === 'FAILED') && run.sequenceCount > 0) {
    const bp = run.sequences.reduce((sum, s) => sum + s.length, 0);
    lines.push(`${run.sequenceCount} ${run.sequenceCount === 1 ? 'sequence' : 'sequences'} · ${bp.toLocaleString('en-US')} bp screened`);
  }
  if (run.aclid) {
    const finished = run.aclid.homologyStatus === 'PASSED' || run.aclid.homologyStatus === 'FAILED';
    if (finished && run.aclid.regulatoryStatus) lines.push(`Regulatory status: ${regulatoryLabel(run.aclid.regulatoryStatus)}`);
    const rows = aclidFindingRows(run.aclid.findings);
    if (finished && rows.length === 0) lines.push('No findings');
    for (const r of rows) lines.push(`${r.frameworkLabel}: ${r.reasonCode ?? '—'}${r.material ? ` · ${r.material}` : ''}`);
  }
  if (run.secureDna) lines.push(`SecureDNA: ${biosecurityStatusLabel(run.secureDna.status)}`);
  if (status !== 'PASSED' && run.detail) lines.push(run.detail);
  lines.push(...notes);
  return { status, statusText: HOMOLOGY_TEXT[status], lines };
}

const CUSTOMER_VIEW: Record<CustomerScreeningStatus, { tone: BiosecurityScreeningStatus; text: string }> = {
  PASSED: { tone: 'PASSED', text: 'Passed' },
  NEEDS_REVIEW: { tone: 'FAILED', text: 'Needs review' },
  FAILED: { tone: 'FAILED', text: 'Failed' },
  IN_PROGRESS: { tone: 'IN_PROGRESS', text: 'In progress' },
  NOT_AVAILABLE: { tone: 'UNAVAILABLE', text: 'Not available' },
  NOT_RUN: { tone: 'UNAVAILABLE', text: 'Not run' },
  UNAVAILABLE: { tone: 'UNAVAILABLE', text: 'Unavailable' }
};

const NOT_AVAILABLE_LINE = 'Customer screening is not enabled for this Aclid account. It does not block acceptance.';
const NOT_RUN_LINE = 'This run has no Aclid screen to attach it to.';
const CHECK_STATES: Record<string, string> = { confirmed: 'Confirmed', could_not_confirm: 'Could not confirm', issue: 'Issue', not_run: 'Not run' };
const CHECK_GROUPS: Record<string, string> = { person: 'Person', institution: 'Institution' };

/** The Customer card for a run: Aclid's verdict, then each person and institution check. */
export function customerCardView(run: ScreeningRunCard | null): ScreeningCardView {
  if (!run) return { status: 'UNAVAILABLE', statusText: NOT_SCREENED_TEXT, lines: [] };
  const leg = run.customer;
  if (!leg) return { status: 'UNAVAILABLE', statusText: CUSTOMER_VIEW.NOT_RUN.text, lines: [NOT_RUN_LINE] };
  const { tone, text } = CUSTOMER_VIEW[leg.status] ?? CUSTOMER_VIEW.UNAVAILABLE;
  const lines: string[] = [];
  if (leg.status === 'NOT_AVAILABLE') lines.push(NOT_AVAILABLE_LINE);
  else if (leg.status === 'NOT_RUN') lines.push(NOT_RUN_LINE);
  else {
    if (leg.verdict) lines.push(`Verdict: ${leg.verdict.replace(/_/g, ' ')}`);
    if (Array.isArray(leg.checks)) {
      for (const c of leg.checks) {
        if (!isObject(c)) continue;
        const finding = str(c.finding);
        if (!finding) continue;
        const group = str(c.group);
        const state = str(c.state);
        const label = [group && (CHECK_GROUPS[group] ?? group), state && (CHECK_STATES[state] ?? state)].filter(Boolean).join(' · ');
        lines.push(label ? `${label}: ${finding}` : finding);
      }
    }
    if (leg.detail && leg.status !== 'PASSED') lines.push(leg.detail);
  }
  return { status: tone, statusText: text, lines };
}

/** The pane's glance statuses: the run's when there is one, the job's own fields otherwise. */
export function screeningsFromRun(job: Parameters<typeof biosecurityFromJob>[0], run: ScreeningRunCard | null): BiosecurityScreenings {
  const fromJob = biosecurityFromJob(job);
  if (!run) return fromJob;
  return { ...fromJob, HOMOLOGY: homologyCardView(run).status, CUSTOMER: customerCardView(run).status };
}

const STUCK_RUN_MS = 10 * 60 * 1000;

export function screeningButtonLabel(runCount: number, busy: boolean): 'Screening…' | 'Run screening' | 'Rerun screening' {
  if (busy) return 'Screening…';
  return runCount === 0 ? 'Run screening' : 'Rerun screening';
}

/** Refresh re-reads Aclid's customer verdict and screen; worth offering only while one of them is still open. */
export function showRefreshResults(run: ScreeningRunCard | null): boolean {
  if (!run) return false;
  const customer = run.customer?.status;
  return customer === 'IN_PROGRESS' || customer === 'NEEDS_REVIEW' || run.aclid?.homologyStatus === 'IN_PROGRESS';
}

/**
 * Whether the screening button is held. A row left IN_PROGRESS by a server crash frees itself after
 * ten minutes (the longest real run is about three), so the acceptance gate cannot wedge a job.
 */
export function screeningBusy(
  homology: { status?: string | null; startedAt?: string | null } | null | undefined,
  rerunning: boolean,
  nowMs: number
): boolean {
  if (rerunning) return true;
  if (homology?.status !== 'IN_PROGRESS' || !homology.startedAt) return false;
  return nowMs - Date.parse(homology.startedAt) < STUCK_RUN_MS;
}

/**
 * The Review modal's Accept gate, the UI twin of the server's. While the answer loads Accept is held;
 * a failed check leaves it on, because the server refuses an ungated accept regardless.
 */
export function acceptanceGateView(args: {
  data: JobAcceptanceScreening | null | undefined;
  loading: boolean;
  hasError: boolean;
}): { disabled: boolean; note: string | null } {
  const { data, loading, hasError } = args;
  if (loading) return { disabled: true, note: 'Checking screening…' };
  if (hasError || !data) return { disabled: false, note: null };
  if (data.state === 'CLEAR' || data.state === 'NOT_REQUIRED') return { disabled: false, note: null };
  return { disabled: true, note: data.message };
}
