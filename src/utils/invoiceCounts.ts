/**
 * How the job detail pane names the invoices a job has.
 *
 * This pane counts **records**, while the jobs-list chip (`Job.invoiceCount`,
 * server-side) counts only invoices that still *stand* — it answers "has this been
 * billed?", and a job whose one invoice was voided has not been. The two numbers
 * therefore differ on purpose, and without care the same job would read
 * "Invoices · None" in the list and "1 invoice" on its own page.
 *
 * That is what the voided qualifier is for: saying "1 invoice, voided" on the same
 * line makes the pane agree with the list rather than appear to contradict it.
 */
export interface VoidableInvoice {
  voidedAt?: string | Date | null;
}

export function invoiceCountLabel(invoices: readonly VoidableInvoice[] | null | undefined): string {
  const rows = invoices ?? [];
  if (rows.length === 0) return 'No invoices yet';

  const standing = rows.filter((invoice) => !invoice?.voidedAt).length;
  const noun = rows.length === 1 ? '1 invoice' : `${rows.length} invoices`;
  if (standing > 0) return noun;
  return rows.length === 1 ? '1 invoice, voided' : `${noun}, all voided`;
}
