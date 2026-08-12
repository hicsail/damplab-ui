/**
 * Types for the versioned SOW document.
 *
 * The server owns every generated value; the editor owns what the staff member
 * has changed. That split is why `value` and `calculatedValue` are separate:
 * `calculatedValue` is refreshed from the server on every preview, while `value`
 * only moves when the generator moves and the field is not overridden.
 */

export type SowFieldKind = 'CALCULATED' | 'PROSE' | 'CUSTOM';

export type SowStatus = 'DRAFT' | 'SENT' | 'SIGNED' | 'FINAL' | 'CANCELLED';

export interface SowField {
  key: string;
  label: string;
  kind: SowFieldKind;
  order: number;
  /** What the reader sees. */
  value: string;
  /** What the generator would produce right now; the target of "revert". */
  calculatedValue?: string | null;
  isOverridden: boolean;
  isEnabled: boolean;
  /** False on Fee Schedule, whose figures invoices bill from. */
  allowsTextOverride: boolean;
}

export interface SowPeriod {
  startDate: string;
  durationDays: number;
  label?: string | null;
}

export interface SowVersionService {
  serviceId: string;
  name: string;
  description?: string | null;
  cost: number;
}

export type SowAdjustmentType = 'DISCOUNT' | 'ADDITIONAL_COST';

export interface SowVersionAdjustment {
  type: SowAdjustmentType;
  description: string;
  amount: number;
  reason?: string | null;
}

export interface SowVersionInputs {
  projectManager: string;
  projectLead: string;
  sowTitle?: string | null;
  scopeOfWork: string[];
  deliverables: string[];
  periods: SowPeriod[];
  services: SowVersionService[];
  adjustments: SowVersionAdjustment[];
  baseCost?: number;
  totalCost?: number;
  customerCategory?: string | null;
}

export interface SowConsent {
  name: string;
  signedAt: string;
  consentedGroups?: SowFieldKind[];
  /** Drawn signature carried over by the migration; absent on new signatures. */
  legacySignatureDataUrl?: string | null;
}

export interface SowVersion {
  id: string;
  versionNumber: number;
  status: SowStatus;
  visibleToCustomer: boolean;
  sentToCustomerAt?: string | null;
  note?: string | null;
  createdByName: string;
  createdAt: string;
  clientSignature?: SowConsent | null;
  staffSignature?: SowConsent | null;
  fields: SowField[];
  inputs: SowVersionInputs;
}

export interface SowEditorState {
  id: string;
  sowNumber: string;
  currentVersionNumber: number;
  activeVersionNumber: number;
  documentStale: boolean;
  questions: Array<{ authorName: string; isStaff: boolean; text: string; versionNumber?: number | null; createdAt: string }>;
  currentVersion?: SowVersion | null;
  activeVersion?: { versionNumber: number; status: SowStatus } | null;
  versions?: SowVersion[];
}

export const CUSTOM_KEY_PREFIX = 'custom-';

export function isCustomField(key: string): boolean {
  return key.startsWith(CUSTOM_KEY_PREFIX);
}

/** Only these reach the server; everything else is derived there. */
export function toInputsPayload(inputs: SowVersionInputs): Record<string, unknown> {
  return {
    projectManager: inputs.projectManager ?? '',
    projectLead: inputs.projectLead ?? '',
    sowTitle: inputs.sowTitle ?? '',
    scopeOfWork: inputs.scopeOfWork ?? [],
    deliverables: inputs.deliverables ?? [],
    periods: (inputs.periods ?? []).map((p) => ({
      startDate: p.startDate,
      durationDays: Number(p.durationDays) || 0,
      label: p.label || null
    })),
    services: (inputs.services ?? []).map((s) => ({
      serviceId: s.serviceId,
      name: s.name,
      description: s.description ?? '',
      cost: Number(s.cost) || 0
    })),
    adjustments: (inputs.adjustments ?? []).map((a) => ({
      type: a.type,
      description: a.description ?? '',
      amount: Number(a.amount) || 0,
      reason: a.reason || null
    }))
  };
}

const STATUS_COLORS: Record<SowStatus, 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  DRAFT: 'default',
  SENT: 'info',
  SIGNED: 'success',
  FINAL: 'success',
  CANCELLED: 'error'
};

export function statusColor(status?: SowStatus | null): 'default' | 'info' | 'warning' | 'success' | 'error' {
  return status ? STATUS_COLORS[status] ?? 'default' : 'default';
}

export function formatCurrency(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const magnitude = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? '-' : ''}$${magnitude}`;
}
