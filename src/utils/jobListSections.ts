import { sowStatusLabel, statusColor } from '../components/sow/sowTypes';
import { ChipStatusColor, jobStatusColor, jobStatusLabel } from './technicianProcessStatus';

/**
 * The per-section status chips a row in the jobs list carries.
 *
 * One chip per card on the job page, in the same order and — importantly — in the
 * same colours, so a row and the page it opens agree at a glance. The list used
 * to print the raw job state in `default` grey and every SOW in `success` green
 * regardless of its status, which made an unsent draft and a countersigned
 * document look identical.
 *
 * Every section is always present, including ones nothing has happened to yet:
 * "no invoices" is a status, and a row whose chips appear and disappear is
 * harder to scan than one whose chips only change colour.
 *
 * Biosecurity is deliberately absent. It is a placeholder on the staff job page
 * and is not shown to customers at all, and this list serves both.
 */

export interface JobSectionChip {
  key: 'job' | 'sow' | 'invoices';
  label: string;
  color: ChipStatusColor;
}

export interface JobSectionSource {
  state?: string | null;
  sow?: { status?: string | null } | null;
  invoiceCount?: number | null;
}

export function jobListSectionChips(job: JobSectionSource): JobSectionChip[] {
  const invoices = job.invoiceCount ?? 0;

  return [
    {
      key: 'job',
      label: jobStatusLabel(job.state),
      color: jobStatusColor(job.state)
    },
    {
      key: 'sow',
      // `statusColor` already answers "not started" with `default` for a null
      // status, so the two branches differ only in wording.
      label: job.sow?.status ? `SOW · ${sowStatusLabel(job.sow.status)}` : 'SOW · Not started',
      color: statusColor((job.sow?.status ?? null) as any)
    },
    {
      key: 'invoices',
      label: invoices > 0 ? `Invoices · ${invoices}` : 'Invoices · None',
      // Matches the job page, where the Invoices pane is `info` once anything has
      // been billed and neutral before that.
      color: invoices > 0 ? 'info' : 'default'
    }
  ];
}
