/**
 * Client mirror of the backend's invoicing gate (see `invoiceBlockedReason` in
 * `damplab-backend/src/sow/sow-access.ts`).
 *
 * Kept in sync by hand, and deliberately conservative in the same direction as
 * `jobEditing.ts`: a SOW whose state has not loaded yet is treated as blocked. The
 * server is the enforcement; this only decides what to offer, and offering a
 * button whose mutation will be refused is the worse failure.
 *
 * The four messages exist for one reason: withdrawing a SOW zeroes
 * `activeVersionNumber` exactly as never having issued one leaves it, so a staff
 * member who countersigned a document last week and then withdrew it must not be
 * told they never countersigned it.
 */

export interface SowGateFacts {
  /** Status of the version in force, or null/undefined when none is. */
  activeStatus?: string | null;
  /** Every version this SOW has, in any state. */
  versions?: ReadonlyArray<{ status?: string | null }> | null;
}

/**
 * Why this job cannot be invoiced yet, or null when it can.
 *
 * Phrased as the action that would unblock it, matching `staffEditBlockedReason`.
 */
export function invoiceBlockedMessage(sow: SowGateFacts | null | undefined): string | null {
  if (!sow) return 'This job has no Statement of Work yet. Create one, then countersign it, before invoicing.';

  const activeStatus = sow.activeStatus ?? null;
  if (activeStatus === 'FINAL') return null;

  if (activeStatus === 'CANCELLED') {
    return 'This SOW has been cancelled. Finalize a new one before invoicing.';
  }
  if (activeStatus === 'SENT' || activeStatus === 'SIGNED') {
    return 'This Statement of Work has not been countersigned yet. Countersign it before invoicing, so the invoice bills the figures both parties agreed.';
  }

  const versions = sow.versions ?? [];
  if (versions.some((version) => version?.status === 'FINAL')) {
    return 'This Statement of Work was countersigned but has since been withdrawn, so no version is in force. Send and countersign it again before invoicing.';
  }
  if (versions.length === 0) {
    return 'This Statement of Work predates document versioning and has no version to bill against. It needs the one-off SOW migration before it can be countersigned or invoiced.';
  }
  return 'This Statement of Work has not been sent to the customer or countersigned. Invoicing bills the figures they agreed to, so there is nothing to bill against yet.';
}

/** Whether to offer Create Invoice at all. */
export function canInvoice(sow: SowGateFacts | null | undefined): boolean {
  return invoiceBlockedMessage(sow) === null;
}
