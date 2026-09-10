/**
 * The wording the billing surfaces share: invoices, payments, and the
 * equipment booking card.
 *
 * Pure and here rather than inside the components because there is no jsdom in
 * this repo: a label that must never print "$-30.00 due" has to be testable
 * somewhere, and this is that somewhere.
 */

import { isEquipmentLineDescription } from './servicePricing';

export type InvoiceKindName = 'SOW' | 'EQUIPMENT' | 'STATEMENT';
export type InvoiceStatusName = 'ISSUED' | 'PAID' | 'SUPERSEDED' | 'VOID';

/**
 * Twin of `invoiceKindOf` in damplab-backend/src/invoice/invoice-kind.ts.
 * Kept on this side as well because the fallback has to survive a cached
 * document that predates the field being selected — the server resolves `kind`
 * for every invoice, but Apollo can hand back an older cache entry.
 */
export function invoiceKindOf(invoice: { kind?: string | null } | null | undefined): InvoiceKindName {
  const stored = String(invoice?.kind ?? '');
  if (stored === 'STATEMENT') return 'STATEMENT';
  if (stored === 'EQUIPMENT') return 'EQUIPMENT';
  return 'SOW';
}

export function invoiceKindLabel(invoice: { kind?: string | null } | null | undefined): 'SOW' | 'Equipment' | 'Statement' {
  const kind = invoiceKindOf(invoice);
  if (kind === 'STATEMENT') return 'Statement';
  if (kind === 'EQUIPMENT') return 'Equipment';
  return 'SOW';
}

/**
 * True for every invoice written before versioned invoices — the two retired
 * generators' documents. Drives the "Legacy" chip in the version history.
 */
export function isLegacyInvoice(invoice: { kind?: string | null } | null | undefined): boolean {
  return invoiceKindOf(invoice) !== 'STATEMENT';
}

/**
 * Where an invoice stands. The server's `status` decides; the void and
 * superseded fields are the fallback for a cache entry that predates `status`
 * being selected, and they win over a stale PAID.
 */
export function invoiceStatusOf(invoice: { status?: string | null; voidedAt?: unknown; supersededAt?: unknown } | null | undefined): InvoiceStatusName {
  const stored = String(invoice?.status ?? '');
  if (stored === 'VOID' || invoice?.voidedAt) return 'VOID';
  if (stored === 'SUPERSEDED' || invoice?.supersededAt) return 'SUPERSEDED';
  if (stored === 'PAID') return 'PAID';
  return 'ISSUED';
}

export function invoiceStatusLabel(status: InvoiceStatusName): 'Issued' | 'Paid' | 'Superseded' | 'Void' {
  if (status === 'PAID') return 'Paid';
  if (status === 'SUPERSEDED') return 'Superseded';
  if (status === 'VOID') return 'Void';
  return 'Issued';
}

export function invoiceStatusChipColor(status: InvoiceStatusName): 'info' | 'success' | 'default' | 'error' {
  if (status === 'PAID') return 'success';
  if (status === 'SUPERSEDED') return 'default';
  if (status === 'VOID') return 'error';
  return 'info';
}

/**
 * Twin of `invoiceVersionOf` in damplab-backend/src/invoice/invoice-kind.ts:
 * the stored version, or the invoice number's `-NNN` suffix on a document
 * issued before versioning (that suffix was always the per-job count).
 */
export function invoiceVersionOf(invoice: { versionNumber?: number | null; invoiceNumber?: string | null } | null | undefined): number | null {
  if (invoice?.versionNumber != null) return Number(invoice.versionNumber);
  const match = /-(\d+)$/.exec(String(invoice?.invoiceNumber ?? ''));
  return match ? Number(match[1]) : null;
}

/** "Invoice 00005 · v2" — the name the job page, the history and the email all use. */
export function invoiceTitle(invoice: { jobDisplayId?: string | null; versionNumber?: number | null; invoiceNumber?: string | null } | null | undefined): string {
  if (!invoice) return '';
  const version = invoiceVersionOf(invoice);
  const job = String(invoice.jobDisplayId ?? '').trim() || String(invoice.invoiceNumber ?? '').replace(/-\d+$/, '');
  if (version != null && job) return `Invoice ${job} · v${version}`;
  return `Invoice ${invoice.invoiceNumber ?? ''}`.trim();
}

/**
 * The invoice that stands: newest of those neither voided nor superseded.
 * There is at most one once versioning is in use; a job still carrying several
 * legacy invoices shows its newest until the first new version supersedes them.
 */
export function currentInvoice<T extends { status?: string | null; voidedAt?: unknown; supersededAt?: unknown; createdAt?: unknown; invoiceDate?: unknown }>(
  invoices: readonly T[] | null | undefined
): T | null {
  const standing = (invoices ?? []).filter((inv) => {
    const status = invoiceStatusOf(inv);
    return status === 'ISSUED' || status === 'PAID';
  });
  if (standing.length === 0) return null;
  const at = (inv: T): number => {
    const time = new Date((inv.createdAt ?? inv.invoiceDate ?? 0) as any).getTime();
    return Number.isNaN(time) ? -Infinity : time;
  };
  return standing.reduce((newest, candidate) => (at(candidate) > at(newest) ? candidate : newest), standing[0]);
}

export function formatMoney(n: number | null | undefined): string {
  return `$${(Number(n) || 0).toFixed(2)}`;
}

/**
 * The three lines an invoice ends with: what's been charged, what's been paid,
 * and what's currently owed. The last row is the one figure the customer acts
 * on. `balanceDue` is derived only when the invoice does not carry one — a
 * legacy shape this still has to render rather than blank.
 */
export function buildStatementTotals(
  invoice: { subtotal?: number | null; paymentsToDate?: number | null; balanceDue?: number | null } | null | undefined
): Array<{ label: string; amount: string }> {
  const charges = Number(invoice?.subtotal) || 0;
  const payments = Number(invoice?.paymentsToDate) || 0;
  const balance = invoice?.balanceDue != null ? Number(invoice.balanceDue) : charges - payments;
  return [
    { label: 'Charges to date', amount: formatMoney(charges) },
    { label: 'Payments to date', amount: `-${formatMoney(payments)}` },
    // Said in words rather than as a minus sign: a negative total reads as a
    // rendering fault, not as money the lab owes back.
    { label: balanceHeading(balance), amount: formatMoney(Math.abs(balance)) }
  ];
}

/** Thin alias: kept so the EQUIPMENT layout's existing import keeps working unchanged. */
export const buildEquipmentTotals = buildStatementTotals;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * `Due MM/DD/YYYY`, from the date's local parts — the same habit the invoice
 * documents already format dates with. Empty for a legacy document, which
 * carries no due date at all.
 */
export function dueDateLabel(dueDate: string | Date | null | undefined): string {
  if (!dueDate) return '';
  const d = dueDate instanceof Date ? dueDate : new Date(dueDate);
  if (Number.isNaN(d.getTime())) return '';
  return `Due ${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`;
}

/**
 * One line for the deposit: what it is, when it is due, and whether anything
 * is still owed against it. The deposit is part of the invoice total, so this
 * never reads as an extra charge.
 */
export function depositSummary(
  deposit: { label?: string | null; amount?: number | null; dueDate?: string | Date | null; outstanding?: number | null } | null | undefined
): string {
  if (!deposit || deposit.amount == null) return '';
  const due = dueDateLabel(deposit.dueDate);
  const base = `${deposit.label?.trim() || 'Deposit'} ${formatMoney(deposit.amount)}${due ? ` · ${due}` : ''}`;
  const outstanding = Number(deposit.outstanding) || 0;
  return outstanding > 0 ? `${base} · ${formatMoney(outstanding)} outstanding` : `${base} · covered by payments`;
}

/**
 * The note printed under an equipment-use service row, marking it as an
 * estimate rather than a fixed price. Reads the same suffix
 * `isEquipmentLineDescription` recognises, so the two agree about which lines
 * qualify.
 */
export function equipmentEstimateNote(description: string | null | undefined): string {
  return isEquipmentLineDescription(description) ? 'Estimated · billed at actual booked hours' : '';
}

/** Trailing zeros off an hours figure, so 2 hours does not print as "2.00 hrs". */
export function formatHours(n: number | null | undefined): string {
  const value = Number(n) || 0;
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

/**
 * The customer's line on the Payments rail. A negative balance is a credit and
 * is said so in words: "$-30.00 due" is the failure this exists to prevent.
 */
export function balanceRailLabel(balanceDue: number | null | undefined): string {
  const value = Number(balanceDue) || 0;
  return value < 0 ? `${formatMoney(Math.abs(value))} credit` : `${formatMoney(value)} due`;
}

/** The heading over the balance figure on the invoice. */
export function balanceHeading(balanceDue: number | null | undefined): string {
  return (Number(balanceDue) || 0) < 0 ? 'Credit balance' : 'Balance due';
}

export function paymentsCountLabel(count: number): string {
  if (!count) return 'No payments';
  return count === 1 ? '1 payment' : `${count} payments`;
}

/**
 * What the Equipment Booking card appends once there is confirmed usage: the
 * hours and what they cost — the equipment charges alone, never the job's
 * whole total, which now includes the SOW's services.
 *
 * Keyed on the HOURS, not the money: time confirmed at a zero rate is still
 * work the lab did, and reporting "0 hrs confirmed" on a job with none would
 * add a line that says nothing.
 */
export function confirmedUsageSuffix(balance: { confirmedHours?: number | null; equipmentCharges?: number | null } | null | undefined): string {
  const hours = Number(balance?.confirmedHours) || 0;
  if (hours <= 0) return '';
  return ` · ${formatHours(hours)} hrs confirmed · ${formatMoney(balance?.equipmentCharges)}`;
}
