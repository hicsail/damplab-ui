import type { ChipStatusColor } from '../../utils/technicianProcessStatus';

/**
 * Biosecurity screening — placeholder.
 *
 * Nothing here talks to the server yet. The five screenings, their two groups
 * and their rollup are modelled properly so the card renders in the same idiom
 * as Job and SOW, but every job reports `PLACEHOLDER_BIOSECURITY`. When
 * screening becomes real, that const is the only thing to replace.
 */

export type BiosecurityScreeningStatus = 'UNAVAILABLE' | 'IN_PROGRESS' | 'PASSED' | 'FAILED';

export type BiosecurityScreeningKey = 'HOMOLOGY' | 'CUSTOMER' | 'METADATA' | 'WATERMARKING' | 'FUNCTIONAL';

export interface BiosecurityScreening {
  key: BiosecurityScreeningKey;
  label: string;
}

export interface BiosecurityScreeningGroup {
  key: 'PRIMARY' | 'ADDITIONAL';
  label: string;
  screenings: ReadonlyArray<BiosecurityScreening>;
}

/**
 * The card's reading order, and the only place it is declared. Primary
 * screening is what has to clear before the lab touches the work; additional
 * screening is everything layered on top of it.
 */
export const BIOSECURITY_SCREENING_GROUPS: ReadonlyArray<BiosecurityScreeningGroup> = Object.freeze([
  Object.freeze({
    key: 'PRIMARY' as const,
    label: 'Primary Screening',
    screenings: Object.freeze([
      { key: 'HOMOLOGY' as const, label: 'Homology' },
      { key: 'CUSTOMER' as const, label: 'Customer' }
    ])
  }),
  Object.freeze({
    key: 'ADDITIONAL' as const,
    label: 'Additional Screening',
    screenings: Object.freeze([
      { key: 'METADATA' as const, label: 'Metadata' },
      { key: 'WATERMARKING' as const, label: 'Watermarking' },
      { key: 'FUNCTIONAL' as const, label: 'Functional' }
    ])
  })
]);

/** Every screening, in card order, flattened across the groups. */
export const BIOSECURITY_SCREENINGS: ReadonlyArray<BiosecurityScreening> = Object.freeze(
  BIOSECURITY_SCREENING_GROUPS.flatMap((group) => [...group.screenings])
);

export type BiosecurityScreenings = Record<BiosecurityScreeningKey, BiosecurityScreeningStatus>;

const STATUS_COLORS: Record<BiosecurityScreeningStatus, ChipStatusColor> = {
  UNAVAILABLE: 'default',
  IN_PROGRESS: 'info',
  PASSED: 'success',
  FAILED: 'error'
};

export function biosecurityStatusColor(status?: BiosecurityScreeningStatus | null): ChipStatusColor {
  return status ? STATUS_COLORS[status] ?? 'default' : 'default';
}

const STATUS_LABELS: Record<BiosecurityScreeningStatus, string> = {
  UNAVAILABLE: 'Unavailable',
  IN_PROGRESS: 'In Progress',
  PASSED: 'Passed',
  FAILED: 'Failed'
};

export function biosecurityStatusLabel(status?: BiosecurityScreeningStatus | null): string {
  return (status && STATUS_LABELS[status]) || 'Unavailable';
}

/**
 * Worst-of rollup over the screenings that actually reported. A failure has to
 * dominate — the card must never read "Passed" while one screening is raising a
 * hand — and a screening still running outranks one that has cleared.
 *
 * `UNAVAILABLE` is not a verdict: it says the screening could not run for this
 * job, so it neither drags the card down nor props it up. It only surfaces when
 * nothing else did, which is the honest reading of a card with no results.
 */
const ROLLUP_PRECEDENCE: readonly BiosecurityScreeningStatus[] = ['FAILED', 'IN_PROGRESS', 'PASSED'];

export function compositeBiosecurityStatus(
  screenings: Partial<BiosecurityScreenings> | null | undefined
): BiosecurityScreeningStatus {
  const present = BIOSECURITY_SCREENINGS.map((s) => screenings?.[s.key] ?? 'UNAVAILABLE');
  return ROLLUP_PRECEDENCE.find((candidate) => present.includes(candidate)) ?? 'UNAVAILABLE';
}

/**
 * The four screenings that have no implementation behind them yet. Homology is
 * real — see `biosecurityFromJob` — so it is deliberately absent here rather
 * than carrying a fake value something could read by mistake.
 */
export const PLACEHOLDER_BIOSECURITY: Omit<BiosecurityScreenings, 'HOMOLOGY'> = Object.freeze({
  CUSTOMER: 'IN_PROGRESS',
  METADATA: 'UNAVAILABLE',
  WATERMARKING: 'UNAVAILABLE',
  FUNCTIONAL: 'UNAVAILABLE'
});

/** What the server reports for the one screening that actually runs. */
export interface HomologyScreeningResult {
  status?: string | null;
  detail?: string | null;
  sequenceCount?: number | null;
  completedAt?: string | null;
}

/**
 * The server's four `HomologyScreeningStatus` values are the card's four
 * statuses by construction, so this is a validation rather than a translation:
 * anything unrecognised — including a job submitted before screening existed,
 * which carries no `homologyScreening` at all — reads as unavailable.
 */
export function homologyStatusFrom(result?: HomologyScreeningResult | null): BiosecurityScreeningStatus {
  const status = result?.status;
  switch (status) {
    case 'PASSED':
    case 'FAILED':
    case 'IN_PROGRESS':
      return status;
    default:
      return 'UNAVAILABLE';
  }
}

/** The full set the card renders: a live Homology beside four placeholders. */
export function biosecurityFromJob(job?: { homologyScreening?: HomologyScreeningResult | null } | null): BiosecurityScreenings {
  return { ...PLACEHOLDER_BIOSECURITY, HOMOLOGY: homologyStatusFrom(job?.homologyScreening) };
}

/**
 * The one-line "why" under a screening, when there is one worth showing.
 * Passed needs no explanation; the others do.
 */
export function homologyDetail(result?: HomologyScreeningResult | null): string | null {
  const status = homologyStatusFrom(result);
  if (status === 'PASSED') {
    const count = result?.sequenceCount ?? 0;
    return count > 0 ? `${count} sequence${count === 1 ? '' : 's'} cleared by SecureDNA` : null;
  }
  if (status === 'IN_PROGRESS') return 'Screening with SecureDNA…';
  return result?.detail?.trim() || null;
}
