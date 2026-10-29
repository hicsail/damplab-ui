import { formatSOWInstant } from '../../utils/sowDateUtils';
import { biosecurityStatusLabel } from './biosecurityStatus';
import { ACLID_FRAMEWORK_LABELS, ACLID_REASON_CODES } from './aclidReasonCodes';
import type { ScreeningRunSummary } from './screeningRunTypes';
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
