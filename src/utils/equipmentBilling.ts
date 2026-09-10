/**
 * The wording the equipment-billing surfaces share.
 *
 * Pure and here rather than inside the components because there is no jsdom in
 * this repo: a label that must never print "$-30.00 due" has to be testable
 * somewhere, and this is that somewhere.
 */

export type InvoiceKindName = 'SOW' | 'EQUIPMENT';

/**
 * Twin of `invoiceKindOf` in damplab-backend/src/invoice/invoice-kind.ts.
 * Kept on this side as well because the fallback has to survive a cached
 * document that predates the field being selected — the server resolves `kind`
 * for every invoice, but Apollo can hand back an older cache entry.
 */
export function invoiceKindOf(invoice: { kind?: string | null } | null | undefined): InvoiceKindName {
  return String(invoice?.kind ?? '') === 'EQUIPMENT' ? 'EQUIPMENT' : 'SOW';
}

export function invoiceKindLabel(invoice: { kind?: string | null } | null | undefined): 'SOW' | 'Equipment' {
  return invoiceKindOf(invoice) === 'EQUIPMENT' ? 'Equipment' : 'SOW';
}

export function formatMoney(n: number | null | undefined): string {
  return `$${(Number(n) || 0).toFixed(2)}`;
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
