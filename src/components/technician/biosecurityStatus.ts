import type { ChipStatusColor } from '../../utils/technicianProcessStatus';

/**
 * Biosecurity screening — placeholder.
 *
 * Nothing here talks to the server yet. The three screenings and their rollup
 * are modelled properly so the card renders in the same idiom as Job and SOW,
 * but every job reports `PLACEHOLDER_BIOSECURITY`. When screening becomes real,
 * that const is the only thing to replace.
 */

export type BiosecurityScreeningStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'PASSED' | 'FLAGGED';

export type BiosecurityScreeningKey = 'METADATA' | 'HOMOLOGY' | 'CUSTOMER';

export const BIOSECURITY_SCREENINGS: ReadonlyArray<{ key: BiosecurityScreeningKey; label: string }> = Object.freeze([
  { key: 'METADATA', label: 'Metadata' },
  { key: 'HOMOLOGY', label: 'Homology' },
  { key: 'CUSTOMER', label: 'Customer' }
]);

export type BiosecurityScreenings = Record<BiosecurityScreeningKey, BiosecurityScreeningStatus>;

const STATUS_COLORS: Record<BiosecurityScreeningStatus, ChipStatusColor> = {
  NOT_STARTED: 'default',
  IN_PROGRESS: 'info',
  PASSED: 'success',
  FLAGGED: 'error'
};

export function biosecurityStatusColor(status?: BiosecurityScreeningStatus | null): ChipStatusColor {
  return status ? STATUS_COLORS[status] ?? 'default' : 'default';
}

const STATUS_LABELS: Record<BiosecurityScreeningStatus, string> = {
  NOT_STARTED: 'Not Started',
  IN_PROGRESS: 'In Progress',
  PASSED: 'Passed',
  FLAGGED: 'Flagged'
};

export function biosecurityStatusLabel(status?: BiosecurityScreeningStatus | null): string {
  return (status && STATUS_LABELS[status]) || 'Not Started';
}

/**
 * Worst-of rollup. A flag has to dominate — the card must never read "Passed"
 * while one screening is raising a hand — and a screening that has not run is
 * worse news than one that has passed, so `PASSED` only survives unanimously.
 */
const ROLLUP_PRECEDENCE: readonly BiosecurityScreeningStatus[] = ['FLAGGED', 'IN_PROGRESS', 'NOT_STARTED', 'PASSED'];

export function compositeBiosecurityStatus(
  screenings: Partial<BiosecurityScreenings> | null | undefined
): BiosecurityScreeningStatus {
  const present = BIOSECURITY_SCREENINGS.map((s) => screenings?.[s.key] ?? 'NOT_STARTED');
  return ROLLUP_PRECEDENCE.find((candidate) => present.includes(candidate)) ?? 'NOT_STARTED';
}

/** Every job, until screening is wired up. */
export const PLACEHOLDER_BIOSECURITY: BiosecurityScreenings = Object.freeze({
  METADATA: 'NOT_STARTED',
  HOMOLOGY: 'NOT_STARTED',
  CUSTOMER: 'NOT_STARTED'
});
