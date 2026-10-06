import type { JobListItem } from '../components/SubmittedJobsList';

/**
 * One row of the jobs list, from one item of `jobsForViewer`. Every field the
 * row renders has to be copied here by name: one that is selected in the query
 * but left out below arrives as undefined, and the row reads that as "none".
 */
export function toJobListItem(j: Record<string, unknown>): JobListItem {
  const sow = j.sow as Record<string, unknown> | null | undefined;
  return {
    id: String(j.id ?? ''),
    name: String(j.name ?? ''),
    state: String(j.state ?? ''),
    submitted: String(j.submitted ?? ''),
    username: j.username != null ? String(j.username) : undefined,
    institute: j.institute != null ? String(j.institute) : undefined,
    email: j.email != null ? String(j.email) : undefined,
    isArchived: Boolean(j.isArchived),
    archivedAt: j.archivedAt != null ? String(j.archivedAt) : undefined,
    archivedBy: j.archivedBy != null ? String(j.archivedBy) : undefined,
    archivedFromState: j.archivedFromState != null ? String(j.archivedFromState) : undefined,
    invoiceStatus: typeof j.invoiceStatus === 'string' ? j.invoiceStatus : null,
    sow: sow
      ? {
          id: String(sow.id ?? ''),
          sowNumber: String(sow.sowNumber ?? ''),
          sowTitle: sow.sowTitle != null ? String(sow.sowTitle) : undefined,
          status: String(sow.status ?? '')
        }
      : null
  };
}
