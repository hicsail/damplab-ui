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
  /** False on fields the document cannot be sent to the customer without. */
  allowsEmpty: boolean;
  /** Staff flag: when true, the customer must type their initials for this section before they can sign. */
  requiresInitials: boolean;
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
  /** What the line bills: `unitCost` x `multiplier`. Invoices read this. */
  cost: number;
  /** Price of a single run, before the multiplier. Absent on lines written
   *  before unit prices were recorded — treat `cost` as the whole story there. */
  unitCost?: number | null;
  /** Everything baked into cost on top of `unitCost` — the run count and any
   *  other multiplier parameter. Comes from the workflow; not editable here. */
  multiplier?: number | null;
  /** The run count alone. Superseded by `multiplier`; still returned for older documents. */
  runCount?: number | null;
}

/** The multiplier a line actually applies, defaulting to 1 on anything unset or nonsensical. */
export function serviceMultiplier(s: Pick<SowVersionService, 'multiplier'>): number {
  const m = Number(s.multiplier);
  return Number.isFinite(m) && m > 0 ? m : 1;
}

/** What the box in the Fee Schedule editor shows: the unit price, falling back
 *  to the line total on a document that predates unit prices. */
export function serviceUnitCost(s: Pick<SowVersionService, 'unitCost' | 'cost'>): number {
  // `== null` rather than a truthiness or Number() check: the server sends null
  // for a line that predates unit prices, and Number(null) is a perfectly finite
  // 0 — which would quietly present every legacy line as free.
  if (s.unitCost == null) return Number(s.cost) || 0;
  const u = Number(s.unitCost);
  return Number.isFinite(u) ? u : Number(s.cost) || 0;
}

/** A unit price times its multiplier, to the cent. Mirrors the server's round2. */
export function serviceLineCost(unitCost: number, multiplier: number): number {
  return Math.round(unitCost * multiplier * 100) / 100;
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

export interface SowSectionInitial {
  key: string;
  label: string;
  initials: string;
}

export interface SowConsent {
  name: string;
  signedAt: string;
  consentedGroups?: SowFieldKind[];
  sectionInitials?: SowSectionInitial[];
  /** Drawn signature carried over by the migration; absent on new signatures. */
  legacySignatureDataUrl?: string | null;
}

export interface SowVersion {
  id: string;
  versionNumber: number;
  /** Human-facing "<sent-count>.<sub-revision>" label, e.g. "1.2". See sow-version.service.ts. */
  displayVersion?: string | null;
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
  /** What each current service line should cost right now — read fresh on every
   *  query, independent of whatever a local draft's inputs.services holds. */
  liveServices?: SowVersionService[];
  /** The job's current pricing category — may differ from a stale local draft's. */
  liveCustomerCategory?: string | null;
  currentVersion?: SowVersion | null;
  activeVersion?: { versionNumber: number; displayVersion?: string | null; status: SowStatus } | null;
  versions?: SowVersion[];
}

export const CUSTOM_KEY_PREFIX = 'custom-';

/** Shared labels for job / SOW pricing-category selects and read-only displays. */
export const CUSTOMER_CATEGORY_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'INTERNAL_CUSTOMERS', label: 'Internal customers' },
  { value: 'EXTERNAL_CUSTOMER_ACADEMIC', label: 'External (Academic)' },
  { value: 'EXTERNAL_CUSTOMER_MARKET', label: 'External (Market)' },
  { value: 'EXTERNAL_CUSTOMER_NO_SALARY', label: 'External (No salary)' }
];

export function customerCategoryLabel(value?: string | null): string {
  if (!value) return '—';
  return CUSTOMER_CATEGORY_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

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
      cost: Number(s.cost) || 0,
      // The server derives the total from this and the workflow's multiplier;
      // `cost` above is only read for a line that has no unit price yet.
      unitCost: s.unitCost == null ? null : Number(s.unitCost) || 0
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

/** Customer-facing wording for a SOW status — used anywhere a status appears in the UI, staff or customer side. */
const STATUS_LABELS: Record<SowStatus, string> = {
  DRAFT: 'Draft',
  SENT: 'Sent to Customer',
  SIGNED: 'Customer Signed',
  FINAL: 'Finalized',
  CANCELLED: 'Cancelled'
};

export function sowStatusLabel(status?: SowStatus | string | null): string {
  return (status && STATUS_LABELS[status as SowStatus]) || (status ?? '—');
}

/**
 * "1.2" style label for a version. `versionNumber` itself is major*1000+minor
 * (see SowVersionService on the backend) — the field is always resolved
 * whenever a query asks for it, but if some caller's selection set ever
 * forgets to, decoding versionNumber directly here still produces the right
 * label rather than the internal number falling through to the screen.
 */
export function versionDisplayLabel(v?: { displayVersion?: string | null; versionNumber: number } | null): string {
  if (!v) return '';
  if (v.displayVersion) return v.displayVersion;
  return `${Math.floor(v.versionNumber / 1000)}.${v.versionNumber % 1000}`;
}

/** What each field kind is called when describing consent — shared between the
 *  customer's signing checkbox/summary and the staff-side signature summary. */
export const GROUP_LABELS: Record<SowFieldKind, string> = {
  CALCULATED: 'the dates, people and costs',
  PROSE: 'the standard terms',
  CUSTOM: 'the additional sections'
};

export const GROUP_ORDER: SowFieldKind[] = ['CALCULATED', 'PROSE', 'CUSTOM'];

/**
 * How a stored consent reads back to a human.
 *
 * `consentedGroups` is finer-grained than the act that produced it: the customer
 * ticks a single box covering the whole document, and it is fanned out into one
 * entry per field kind present. Listing those entries separately —  "Agreed to
 * the dates, people and costs", "Agreed to the standard terms" — claims they
 * made distinct decisions they were never asked to make. The two boilerplate
 * groups therefore collapse into one line here.
 *
 * Custom sections stay their own line: their content is written per SOW, so
 * "the additional sections" is genuinely saying something the rest does not.
 *
 * Display only — the stored groups are untouched, so existing signatures keep
 * whatever they recorded.
 */
export function consentSummaryLabels(groups: SowFieldKind[] | null | undefined): string[] {
  const present = new Set(groups ?? []);
  const labels: string[] = [];
  if (present.has('CALCULATED') || present.has('PROSE')) labels.push('the terms');
  if (present.has('CUSTOM')) labels.push(GROUP_LABELS.CUSTOM);
  return labels;
}

/**
 * True when the local draft's Fee Schedule snapshot no longer matches the
 * job — either service costs drifted, or the documented pricing category
 * differs from the job's current category. Deliberately ignores adjustments —
 * those are always staff-authored, never auto-calculated, so editing one must
 * never trip this. Backs the Fee Schedule "Stale" chip.
 */
export function feeScheduleIsStale(
  inputs: Pick<SowVersionInputs, 'services' | 'customerCategory'>,
  sow?: { liveServices?: SowVersionService[] | null; liveCustomerCategory?: string | null } | null
): boolean {
  const live = sow?.liveServices;
  if (!live) return false;
  const documented = inputs.customerCategory ?? null;
  const liveCategory = sow?.liveCustomerCategory ?? null;
  if (documented != null && liveCategory != null && documented !== liveCategory) return true;
  const key = (list: SowVersionService[]) =>
    list.map((s) => `${s.serviceId}:${Number(s.cost).toFixed(2)}:${s.unitCost == null ? '' : Number(s.unitCost).toFixed(2)}:${s.multiplier ?? ''}`).join('|');
  return key(inputs.services ?? []) !== key(live);
}

/**
 * The inputs patch Recalculate applies: fresh service costs, baseCost/totalCost
 * rederived from them the same way the server does (sow-version.service.ts),
 * and adjustments left untouched — they were never auto-calculated to begin with.
 */
export function feeScheduleLivePatch(inputs: SowVersionInputs, liveServices: SowVersionService[], liveCustomerCategory?: string | null): Partial<SowVersionInputs> {
  const baseCost = liveServices.reduce((sum, s) => sum + (Number(s.cost) || 0), 0);
  const totalCost = (inputs.adjustments ?? []).reduce((sum, a) => sum + (a.type === 'DISCOUNT' ? -Math.abs(a.amount) : Math.abs(a.amount)), baseCost);
  return { services: liveServices, baseCost, totalCost, customerCategory: liveCustomerCategory ?? inputs.customerCategory };
}

/** "× 10", not "× 10.00" — but a multiplier is not always a whole number. */
export function formatMultiplier(value: number): string {
  return String(Number(Number(value).toFixed(4)));
}

export function formatCurrency(amount: number): string {
  const n = Number.isFinite(amount) ? amount : 0;
  const magnitude = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${n < 0 ? '-' : ''}$${magnitude}`;
}
