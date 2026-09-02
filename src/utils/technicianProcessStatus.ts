import { jobVersionDisplayLabel, type JobVersionLike } from './jobGraphDiff';
import { versionDisplayLabel, type SowStatus } from '../components/sow/sowTypes';

export type PartyBadge = 'paper' | 'check' | null;

export interface PartyStatus {
  customer: PartyBadge;
  staff: PartyBadge;
}

const BOTH_CHECKS: PartyStatus = { customer: 'check', staff: 'check' };

/** Who holds the job vs who has already committed to it. Paper wins over check. */
export function jobPartyStatus(state?: string | null): PartyStatus {
  switch (state) {
    case 'CREATING':
      return { customer: null, staff: 'paper' };
    case 'SUBMITTED':
      return { customer: 'check', staff: 'paper' };
    case 'CHANGES_REQUESTED':
      return { customer: 'paper', staff: null };
    case 'ACCEPTED':
    case 'WAITING_FOR_SOW':
    case 'QUEUED':
    case 'IN_PROGRESS':
    case 'COMPLETE':
    case 'CLOSED':
      return BOTH_CHECKS;
    case 'REJECTED':
      return { customer: 'check', staff: null };
    default:
      return { customer: null, staff: null };
  }
}

/** Job review is done; the card can start collapsed. */
export function isJobProcessSettled(state?: string | null): boolean {
  switch (state) {
    case 'ACCEPTED':
    case 'WAITING_FOR_SOW':
    case 'QUEUED':
    case 'IN_PROGRESS':
    case 'COMPLETE':
    case 'CLOSED':
    case 'CANCELLED':
      return true;
    default:
      return false;
  }
}

/** SOW has been countersigned. */
export function isSowProcessSettled(status?: string | null): boolean {
  return status === 'FINAL';
}

export function sowPartyStatus(input: {
  currentStatus?: SowStatus | string | null;
  activeStatus?: SowStatus | string | null;
}): PartyStatus {
  const current = input.currentStatus ?? null;
  const active = input.activeStatus ?? null;
  if (!current && !active) return { customer: null, staff: null };
  if (current === 'CANCELLED') return { customer: null, staff: null };

  if (active === 'SENT') return { customer: 'paper', staff: 'check' };
  if (active === 'SIGNED' || current === 'SIGNED') return { customer: 'check', staff: 'paper' };
  if (active === 'FINAL' || current === 'FINAL') return BOTH_CHECKS;
  if (current === 'DRAFT') return { customer: null, staff: 'paper' };

  return { customer: null, staff: null };
}

type JobVersionPick = Pick<JobVersionLike, 'versionNumber' | 'authorRole' | 'isEvent' | 'displayVersion'> & {
  visibleToCustomer?: boolean | null;
};

function isJobVisibleToCustomer(version: JobVersionPick): boolean {
  if (version.authorRole === 'CUSTOMER') return true;
  return version.visibleToCustomer !== false;
}

function newest(versions: JobVersionPick[]): JobVersionPick | null {
  if (!versions.length) return null;
  return versions.reduce((best, v) => (v.versionNumber > best.versionNumber ? v : best));
}

/** Newest version that party can see, including accept/send event rows. */
export function latestCustomerVisibleJobVersion(versions: JobVersionPick[]): JobVersionPick | null {
  return newest(versions.filter(isJobVisibleToCustomer));
}

export function latestStaffVisibleJobVersion(versions: JobVersionPick[]): JobVersionPick | null {
  return newest(versions);
}

type SowVersionPick = { versionNumber: number; visibleToCustomer?: boolean | null; displayVersion?: string | null };

export function latestCustomerVisibleSowVersion(versions: SowVersionPick[]): SowVersionPick | null {
  return newest(versions.filter((v) => v.visibleToCustomer === true));
}

export function latestStaffVisibleSowVersion(versions: SowVersionPick[]): SowVersionPick | null {
  return newest(versions);
}

export function partyVersionLabel(version: { versionNumber: number; displayVersion?: string | null } | null | undefined): string {
  if (!version) return '—';
  const label = version.displayVersion || jobVersionDisplayLabel(version.versionNumber);
  return label.startsWith('v') ? label : `v${label}`;
}

export function sowPartyVersionLabel(version: { versionNumber: number; displayVersion?: string | null } | null | undefined): string {
  if (!version) return '—';
  const label = versionDisplayLabel(version);
  if (!label) return '—';
  return label.startsWith('v') ? label : `v${label}`;
}

export type ChipStatusColor = 'default' | 'info' | 'warning' | 'success' | 'error';

/**
 * Translucent pane tint matching MUI chip colors. Every status pane on the job
 * page resolves its background through here, so a status means the same colour
 * whichever document it belongs to — the green below is the one the Job card
 * used to hand-write for ACCEPTED, and SOW FINAL now shares it.
 */
export function chipStatusBackground(color: ChipStatusColor): string {
  switch (color) {
    case 'info':
      return 'rgba(2, 136, 209, 0.18)';
    case 'warning':
      return 'rgba(255, 152, 0, 0.4)';
    case 'success':
      return 'rgba(0, 255, 0, 0.5)';
    case 'error':
      return 'rgba(211, 47, 47, 0.22)';
    default:
      return 'rgba(120, 120, 120, 0.18)';
  }
}

/**
 * Job lifecycle in the same five-colour vocabulary the SOW uses
 * (`STATUS_COLORS` in components/sow/sowTypes.ts). Sharing the palette merges
 * neighbours by design: ACCEPTED and COMPLETE are both green, exactly as SIGNED
 * and FINAL are on the SOW side.
 */
const JOB_STATUS_COLORS: Record<string, ChipStatusColor> = {
  CREATING: 'default',
  SUBMITTED: 'info',
  CHANGES_REQUESTED: 'warning',
  ACCEPTED: 'success',
  WAITING_FOR_SOW: 'info',
  QUEUED: 'info',
  IN_PROGRESS: 'info',
  COMPLETE: 'success',
  REJECTED: 'error',
  CLOSED: 'default',
  CANCELLED: 'error'
};

export function jobStatusColor(state?: string | null): ChipStatusColor {
  return (state && JOB_STATUS_COLORS[state]) || 'default';
}

/** Readable wording for a job state — the pane used to print the raw enum. */
const JOB_STATUS_LABELS: Record<string, string> = {
  CREATING: 'Creating',
  SUBMITTED: 'Submitted',
  CHANGES_REQUESTED: 'Changes Requested',
  ACCEPTED: 'Accepted',
  WAITING_FOR_SOW: 'Waiting for SOW',
  QUEUED: 'Queued',
  IN_PROGRESS: 'In Progress',
  COMPLETE: 'Complete',
  REJECTED: 'Rejected',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled by client'
};

export function jobStatusLabel(state?: string | null): string {
  return (state && JOB_STATUS_LABELS[state]) || (state ?? '—');
}

export function invoiceVersionLabel(invoices: Array<{ invoiceNumber?: string | null }>): string {
  if (!invoices.length) return '—';
  const latest = invoices[invoices.length - 1];
  return latest?.invoiceNumber?.trim() || '—';
}
