/**
 * Which SOW service lines an invoice covers.
 *
 * Lines are picked by **position**, not by service id. A job can use the same
 * catalog service twice — two PCR nodes with different parameters are two lines
 * at different prices sharing one `serviceId` — so an id names a service, never
 * a line. Keying the picker on ids ganged those checkboxes together (ticking one
 * ticked both) and the server, resolving through a map on the same id, billed
 * the last of them twice and dropped the other.
 *
 * The positions here are positions in `SOW.billableServices`, which is the array
 * the server bills from. That matters: the picker used to list `sow.services`,
 * the live billing core, while invoices bill the version frozen with the
 * customer. Those two disagreeing is what `documentStale` reports, so listing
 * one and billing the other made a position mean two different things.
 */

export interface BillableServiceLine {
  serviceId?: string | null;
  name?: string | null;
  description?: string | null;
  cost?: number | null;
}

export interface InvoiceServiceSelection {
  index: number;
  serviceId: string;
}

/** Every line selected — the default when the dialog opens, since an invoice usually covers the whole job. */
export function allLineIndexes(lines: readonly BillableServiceLine[] | null | undefined): number[] {
  return (lines ?? []).map((_line, index) => index);
}

export function toggleLineIndex(selected: readonly number[], index: number): number[] {
  return selected.includes(index) ? selected.filter((i) => i !== index) : [...selected, index];
}

/**
 * The mutation payload for the chosen lines.
 *
 * Sorted, so the invoice lists its lines in document order however the boxes
 * were clicked. `serviceId` rides along as the server's guard against the array
 * having been re-synced since this dialog was opened — it is compared against
 * whatever now sits at that index, and a mismatch is refused rather than billed.
 */
export function buildInvoiceServiceSelections(lines: readonly BillableServiceLine[] | null | undefined, selected: readonly number[]): InvoiceServiceSelection[] {
  const all = lines ?? [];
  const unique = [...new Set(selected)].sort((a, b) => a - b);

  return unique.map((index) => {
    const line = all[index];
    if (!line) throw new Error('A selected service is no longer on this Statement of Work. Reload the job and try again.');
    const serviceId = String(line.serviceId ?? '');
    if (!serviceId) throw new Error('A selected service has no identifier and cannot be invoiced.');
    return { index, serviceId };
  });
}

/** An invoice already generated for this job, as the picker needs to read it. */
export interface BilledInvoiceLike {
  invoiceNumber?: string | null;
  sowVersionNumber?: number | null;
  services?: ReadonlyArray<{ sourceIndex?: number | null }> | null;
}

/**
 * Which lines earlier invoices for this job already cover, mapped to the invoice
 * that covers them.
 *
 * Positions only mean something within one SOW version — a re-synced document
 * can reorder its lines — so an invoice billed from a different version is not
 * comparable and is left out. So is one written before positions were recorded.
 * Those cases are not silently treated as "unbilled": the server refuses a
 * provable overlap and records a warning on the invoice for everything it could
 * not prove, and this list only drives what the dialog ticks by default.
 */
export function billedLineIndexes(
  invoices: readonly BilledInvoiceLike[] | null | undefined,
  sowVersionNumber: number | null | undefined
): Map<number, string> {
  const billed = new Map<number, string>();
  if (sowVersionNumber == null) return billed;

  for (const invoice of invoices ?? []) {
    if (invoice?.sowVersionNumber !== sowVersionNumber) continue;
    for (const line of invoice.services ?? []) {
      if (typeof line?.sourceIndex !== 'number') continue;
      if (!billed.has(line.sourceIndex)) billed.set(line.sourceIndex, String(invoice.invoiceNumber ?? ''));
    }
  }
  return billed;
}

/**
 * What the dialog should tick when it opens: everything not already invoiced.
 *
 * An invoice usually covers the whole job, which is why this used to be simply
 * every line. Once a job has been part-invoiced, "every line" is the one
 * selection guaranteed to be refused.
 */
export function unbilledLineIndexes(
  lines: readonly BillableServiceLine[] | null | undefined,
  billed: ReadonlyMap<number, string>
): number[] {
  return allLineIndexes(lines).filter((index) => !billed.has(index));
}
