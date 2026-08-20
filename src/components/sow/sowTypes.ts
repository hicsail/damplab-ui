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
  /** Client-only. A stable identity for the reorder list, since periods have no
   *  server id and their array index is the thing being changed. Stripped by
   *  toInputsPayload, so it reaches neither the mutation nor the dirty check. */
  _dragKey?: string;
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

export type SowAdjustmentType = 'DISCOUNT' | 'ADDITIONAL_COST';

/** What the adjustment is charging for. Absent on adjustments written before categories existed. */
export type SowAdjustmentCategory = 'SERVICE' | 'CONSUMABLE' | 'STAFF' | 'DAYS' | 'SAMPLES';

export const SOW_ADJUSTMENT_CATEGORIES: { value: SowAdjustmentCategory; label: string }[] = [
  { value: 'SERVICE', label: 'Service' },
  { value: 'CONSUMABLE', label: 'Consumable' },
  { value: 'STAFF', label: 'Staff' },
  { value: 'DAYS', label: 'Days' },
  { value: 'SAMPLES', label: 'Samples' }
];

export interface SowVersionAdjustment {
  type: SowAdjustmentType;
  description: string;
  /** What the adjustment moves: `unitAmount` x `multiplier`. Invoices read this. */
  amount: number;
  /** Amount for a single unit, before the multiplier. Absent on adjustments
   *  written before unit amounts existed — treat `amount` as the whole story there. */
  unitAmount?: number | null;
  /** How many units the unit amount is charged for. Absent means 1. */
  multiplier?: number | null;
  category?: SowAdjustmentCategory | null;
  reason?: string | null;
}

/** The multiplier an adjustment applies, defaulting to 1 on anything unset or nonsensical. */
export function adjustmentMultiplier(a: Pick<SowVersionAdjustment, 'multiplier'>): number {
  const m = Number(a.multiplier);
  return Number.isFinite(m) && m > 0 ? m : 1;
}

/** What the amount box shows: the unit amount, falling back to the stored total
 *  on an adjustment that predates unit amounts. The `== null` check is the same
 *  one serviceUnitCost makes, for the same reason — Number(null) is a finite 0,
 *  which would present every legacy adjustment as $0. */
export function adjustmentUnitAmount(a: Pick<SowVersionAdjustment, 'unitAmount' | 'amount'>): number {
  if (a.unitAmount == null) return Number(a.amount) || 0;
  const u = Number(a.unitAmount);
  return Number.isFinite(u) ? u : Number(a.amount) || 0;
}

/**
 * The one line of wording an adjustment carries.
 *
 * Description and reason were separate boxes, and the Fee Schedule joins them
 * with this same dash (see buildFeeSchedule) — so an adjustment written back
 * then reads here exactly as it reads in the document, and folding the reason
 * into the description leaves the generated text unchanged.
 */
export function adjustmentDescriptionText(a: Pick<SowVersionAdjustment, 'description' | 'reason'>): string {
  return [(a.description || '').trim(), (a.reason || '').trim()].filter(Boolean).join(' — ');
}

/** A unit amount times its multiplier, to the cent. Mirrors the server's round2. */
export function adjustmentLineAmount(unitAmount: number, multiplier: number): number {
  return Math.round(unitAmount * multiplier * 100) / 100;
}

export interface SowVersionInputs {
  projectManager: string;
  projectManagerId?: string;
  projectLead: string;
  projectLeadId?: string;
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

/**
 * Why a SOW cannot move to its next lifecycle stage, in the order staff should
 * clear them. The order is the point: these are steps in one repair sequence,
 * not competing alarms.
 */
export type DocumentBlocker =
  | 'NOT_ACCEPTED'
  | 'JOB_CHANGED_SINCE_ACCEPTANCE'
  | 'DOCUMENT_STALE'
  | 'DRAFT_INCOMPLETE'
  | 'NO_DRAFT_TO_SEND'
  | 'UNSENT_DRAFT'
  | 'AWAITING_CUSTOMER_SIGNATURE';

/**
 * Blockers that describe a settled document rather than something staff can fix.
 * They belong in a button's tooltip, never in a "here is what to do" checklist.
 */
export const SETTLED_BLOCKERS: readonly DocumentBlocker[] = ['NO_DRAFT_TO_SEND', 'AWAITING_CUSTOMER_SIGNATURE'];

/**
 * The step text for a blocker, with a fallback.
 *
 * The map is keyed by a hand-written union rather than by the backend enum, so a
 * blocker added server-side arrives here unmapped until the union catches up.
 * Indexing directly returned `undefined` and rendered a numbered bullet with
 * nothing in it; this at least says something true.
 */
export function blockerStep(blocker: DocumentBlocker): string {
  return BLOCKER_STEP[blocker] ?? 'This SOW is not ready to move on yet.';
}

export interface SowActionGate {
  canSend: boolean;
  sendBlockers: DocumentBlocker[];
  canCountersign: boolean;
  countersignBlockers: DocumentBlocker[];
  missingFields: string[];
}

/** What each blocker asks staff to do, in the words the banner and button use. */
export const BLOCKER_STEP: Record<DocumentBlocker, string> = {
  NOT_ACCEPTED: 'Use Review Job to accept it, so the spec these prices come from is agreed before the customer sees them.',
  JOB_CHANGED_SINCE_ACCEPTANCE: 'The job changed after it was accepted. Use Review Job to re-accept it, or to hand it back to the customer.',
  DOCUMENT_STALE: "Recalculate the Fee Schedule and save — this document still bills the job's earlier figures.",
  DRAFT_INCOMPLETE: 'Fill in the required sections.',
  NO_DRAFT_TO_SEND: 'This version has already been issued. Edit the document to start a new draft.',
  UNSENT_DRAFT: 'Send the revised version and have the customer sign it.',
  AWAITING_CUSTOMER_SIGNATURE: 'Waiting for the customer to sign.'
};

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
  /** Which lifecycle actions this SOW permits, and what is in the way of each. Enforced server-side too. */
  actionGate?: SowActionGate | null;
  currentVersion?: SowVersion | null;
  activeVersion?: { versionNumber: number; displayVersion?: string | null; status: SowStatus } | null;
  versions?: SowVersion[];
}

export const CUSTOM_KEY_PREFIX = 'custom-';

export const newPeriodDragKey = (): string =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `period-${Date.now()}-${Math.random().toString(16).slice(2)}`;

/**
 * Give every period a drag key, keeping any it already has — a draft reloaded
 * from localStorage carries its keys, and reissuing them would remount each row
 * for no reason.
 */
export function withPeriodDragKeys(inputs: SowVersionInputs): SowVersionInputs {
  return { ...inputs, periods: (inputs.periods ?? []).map((p) => (p._dragKey ? p : { ...p, _dragKey: newPeriodDragKey() })) };
}

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

/**
 * Only these reach the server; everything else is derived there.
 *
 * `refreshFeeSchedule` is an intent, not a figure: it tells the server to adopt
 * the job's current pricing instead of carrying this document's forward. The
 * numbers themselves are never sent, which is what keeps prices calculated.
 */
export function toInputsPayload(inputs: SowVersionInputs, refreshFeeSchedule = false): Record<string, unknown> {
  return {
    refreshFeeSchedule,
    projectManager: inputs.projectManager ?? '',
    projectManagerId: inputs.projectManagerId ?? undefined,
    projectLead: inputs.projectLead ?? '',
    projectLeadId: inputs.projectLeadId ?? undefined,
    sowTitle: inputs.sowTitle ?? '',
    scopeOfWork: inputs.scopeOfWork ?? [],
    deliverables: inputs.deliverables ?? [],
    periods: (inputs.periods ?? []).map((p) => ({
      startDate: p.startDate,
      durationDays: Number(p.durationDays) || 0,
      label: p.label || null
    })),
    // `services` is deliberately not sent. Service lines belong to the job spec;
    // the server reads them off the SOW on save (sow-version.service.ts
    // deriveInputs), so anything sent from here would be ignored at best and
    // stale at worst.
    adjustments: (inputs.adjustments ?? []).map((a) => ({
      type: a.type,
      description: a.description ?? '',
      // The server derives the figure from the unit amount and multiplier;
      // `amount` above is only read for an adjustment that has no unit amount yet.
      amount: Number(a.amount) || 0,
      unitAmount: a.unitAmount == null ? null : Number(a.unitAmount) || 0,
      multiplier: a.multiplier == null ? null : Number(a.multiplier) || 1,
      category: a.category ?? null,
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

/** Catalogue default — same string the backend seeds (sow-field-defaults.ts). */
export const SIGNATURES_FIELD_KEY = 'signatures';
export const DEFAULT_SIGNATURES_TEXT =
  'IN WITNESS WHEREOF, the parties hereto have caused this SOW to be effective as of the day, month and year first written above.';

/**
 * Agreement copy shown next to the customer's name field.
 *
 * Prefers the Signatures section stored on this version. A blank or missing
 * section (legacy documents) falls back to the catalogue default so signing
 * never loses its clause.
 */
export function signingAgreementText(fields: SowField[] | null | undefined): string {
  const value = (fields ?? []).find((f) => f.key === SIGNATURES_FIELD_KEY)?.value?.trim();
  return value || DEFAULT_SIGNATURES_TEXT;
}

/** Enabled sections the customer reads as the document, excluding Signatures —
 *  that clause lives in the signing block so it is not shown twice. */
export function customerDocumentFields(fields: SowField[] | null | undefined): SowField[] {
  return [...(fields ?? [])].filter((f) => f.isEnabled && f.key !== SIGNATURES_FIELD_KEY).sort((a, b) => a.order - b.order);
}

/**
 * True when the version on screen no longer prices the job the way the job
 * currently prices itself.
 *
 * The document is a static record, so this is expected and not an error — it is
 * simply the signal that a Recalculate is available. Deliberately ignores
 * adjustments: those are staff-authored on the document and are never drift.
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
  const key = (list: SowVersionService[]): string =>
    list.map((s) => `${s.serviceId}:${Number(s.cost).toFixed(2)}:${s.unitCost == null ? '' : Number(s.unitCost).toFixed(2)}:${s.multiplier ?? ''}`).join('|');
  return key(inputs.services ?? []) !== key(live);
}

/**
 * The local patch Recalculate applies: the job's figures, with totals rederived
 * the same way the server does, and adjustments left alone.
 *
 * Local only. The figures become the record when staff save, and the save sends
 * `refreshFeeSchedule: true` rather than these numbers — the server derives them
 * again from the job. This is why the editor can never author a price.
 */
export function feeScheduleLivePatch(inputs: SowVersionInputs, liveServices: SowVersionService[], liveCustomerCategory?: string | null): Partial<SowVersionInputs> {
  return { services: liveServices, ...sowTotals(liveServices, inputs.adjustments), customerCategory: liveCustomerCategory ?? inputs.customerCategory };
}

/**
 * What the Fee Schedule currently adds up to, derived the same way the server
 * derives it on save (sow-version.service.ts). The editor recomputes this on
 * every price or adjustment edit, so the figure on screen is never a saved
 * number waiting to catch up with the boxes above it.
 */
export function sowTotals(services?: SowVersionService[] | null, adjustments?: SowVersionAdjustment[] | null): { baseCost: number; totalCost: number } {
  const baseCost = (services ?? []).reduce((sum, s) => sum + (Number(s.cost) || 0), 0);
  const totalCost = (adjustments ?? []).reduce((sum, a) => sum + (a.type === 'DISCOUNT' ? -Math.abs(a.amount) : Math.abs(a.amount)), baseCost);
  return { baseCost, totalCost };
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
