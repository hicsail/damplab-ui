/**
 * The wording the equipment-billing surfaces share.
 *
 * Pure and here rather than inside the components because there is no jsdom in
 * this repo: a label that must never print "$-30.00 due" has to be testable
 * somewhere, and this is that somewhere.
 */

import { isEquipmentLineDescription } from './servicePricing';

export type InvoiceKindName = 'SOW' | 'EQUIPMENT' | 'STATEMENT';

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
 * True for every invoice written before statements existed — the two retired
 * generators' documents. Drives the "Legacy" chip so staff can tell a
 * one-off SOW or equipment invoice apart from the running statement that
 * replaced them.
 */
export function isLegacyInvoice(invoice: { kind?: string | null } | null | undefined): boolean {
  return invoiceKindOf(invoice) !== 'STATEMENT';
}

export function formatMoney(n: number | null | undefined): string {
  return `$${(Number(n) || 0).toFixed(2)}`;
}

/**
 * The three lines a running statement ends with: what's been charged, what's
 * been paid, and what's currently owed. A running total, not a bill for new
 * work — the last row is the one figure the customer acts on. `balanceDue` is
 * derived only when the invoice does not carry one — a legacy shape this
 * still has to render rather than blank.
 *
 * This is `buildEquipmentTotals` generalised: the EQUIPMENT invoice and the
 * STATEMENT invoice state the same three lines, so both read from here.
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
 * Explains why the deposit line just vanished from the balance. Only ever
 * non-empty right after the drop happens — `depositsDropped` is itself
 * already conditioned on a service line having released since the deposit
 * was charged, so there is no case where this fires and nothing changed.
 */
export function depositDropNote(balance: { depositsDropped?: boolean | null } | null | undefined): string {
  return balance?.depositsDropped
    ? 'Deposits have dropped off now that services are released; the payment against them carries forward.'
    : '';
}

/**
 * The note printed under a statement's equipment-use service row, marking it
 * as an estimate rather than a fixed price. Reads the same suffix
 * `isEquipmentLineDescription` recognises, so the two agree about which lines
 * qualify.
 */
export function equipmentEstimateNote(description: string | null | undefined): string {
  return isEquipmentLineDescription(description) ? 'Estimated · billed at actual booked hours' : '';
}

/** Trailing zeros off an hours figure, so 2 hours does not print as "2.00 hrs". */
function formatHours(n: number | null | undefined): string {
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

/** The heading over the balance figure on the statement. */
export function balanceHeading(balanceDue: number | null | undefined): string {
  return (Number(balanceDue) || 0) < 0 ? 'Credit balance' : 'Balance due';
}

export function paymentsCountLabel(count: number): string {
  if (!count) return 'No payments';
  return count === 1 ? '1 payment' : `${count} payments`;
}

/**
 * What the Equipment Booking card appends once there is confirmed usage.
 *
 * Keyed on the HOURS, not the money: time confirmed at a zero rate is still
 * work the lab did, and reporting "0 hrs confirmed" on a job with none would
 * add a line that says nothing.
 */
export function confirmedUsageSuffix(balance: { confirmedHours?: number | null; chargesToDate?: number | null } | null | undefined): string {
  const hours = Number(balance?.confirmedHours) || 0;
  if (hours <= 0) return '';
  return ` · ${formatHours(hours)} hrs confirmed · ${formatMoney(balance?.chargesToDate)}`;
}
