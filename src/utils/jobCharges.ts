/**
 * The UI's read of a job's charge ledger: which SOW positions are already
 * released, what a new release request should send, and how the Charges
 * list orders and labels what has already been added.
 *
 * Pure and here for the same reason as `equipmentBilling.ts` — no jsdom in
 * this repo, so anything worth testing has to live outside a component.
 */

import { formatMoney } from './equipmentBilling';

export interface ReleaseRow {
  sourceIndex: number;
  serviceId: string;
  name: string;
  cost: number;
  description: string;
  released: boolean;
  releasedAt: string | null;
  mismatch: string | null;
}

interface BillableLineLike {
  serviceId?: string | null;
  name?: string | null;
  description?: string | null;
  cost?: number | null;
}

interface JobChargeLike {
  id?: string | null;
  kind?: string | null;
  label?: string | null;
  amount?: number | null;
  serviceId?: string | null;
  sourceIndex?: number | null;
  addedAt?: string | Date | null;
  voidedAt?: string | Date | null;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** `MM/DD/YYYY` from the charge's local date parts, matching the documents' own habit. */
function formatMMDDYYYY(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${pad2(d.getMonth() + 1)}/${pad2(d.getDate())}/${d.getFullYear()}`;
}

/**
 * Which SOW positions the job's live SERVICE_LINE charges hold. A charge
 * counts as holding a position only when it is a SERVICE_LINE, is not
 * voided, and carries a numeric `sourceIndex` — the same three conditions
 * `JobChargeService` enforces when it writes one.
 */
function releasedByPosition(charges: readonly JobChargeLike[]): Map<number, JobChargeLike> {
  const byPosition = new Map<number, JobChargeLike>();
  for (const charge of charges) {
    if (charge.kind !== 'SERVICE_LINE') continue;
    if (charge.voidedAt) continue;
    if (typeof charge.sourceIndex !== 'number') continue;
    byPosition.set(charge.sourceIndex, charge);
  }
  return byPosition;
}

/**
 * One row per SOW billable-line position, marked with whatever the charge
 * ledger already knows about it.
 *
 * A released line keeps the amount and the service it was released against
 * forever — the ledger is authoritative for the money, never the current
 * SOW version — so `mismatch` surfaces the two ways a version can now
 * disagree with what was already billed: a different price at that
 * position, or the position naming a different service altogether. The
 * service check runs first because a moved position can coincidentally
 * still show the same cost.
 */
export function buildReleaseRows(billableLines: readonly BillableLineLike[], charges: readonly JobChargeLike[]): ReleaseRow[] {
  const byPosition = releasedByPosition(charges);

  return billableLines.map((line, sourceIndex) => {
    const charge = byPosition.get(sourceIndex);
    const released = charge !== undefined;

    let mismatch: string | null = null;
    if (charge) {
      const lineServiceId = String(line.serviceId ?? '');
      const chargeServiceId = String(charge.serviceId ?? '');
      if (chargeServiceId !== lineServiceId) {
        mismatch = `Released as “${charge.label ?? ''}”; this version lists “${line.name ?? ''}” at that position.`;
      } else {
        const chargedAmount = Number(charge.amount) || 0;
        const currentCost = Number(line.cost) || 0;
        if (chargedAmount !== currentCost) {
          mismatch = `Released at ${formatMoney(chargedAmount)}; this version lists ${formatMoney(currentCost)}.`;
        }
      }
    }

    return {
      sourceIndex,
      serviceId: String(line.serviceId ?? ''),
      name: String(line.name ?? ''),
      cost: Number(line.cost) || 0,
      description: String(line.description ?? ''),
      released,
      releasedAt: released ? formatMMDDYYYY(charge!.addedAt) : null,
      mismatch
    };
  });
}

/**
 * Every row ticked by default: a released line's box stays checked (and is
 * disabled in the UI — it cannot be released twice) while an unreleased
 * line starts checked because an invoice usually covers the whole job.
 */
export function defaultCheckedRows(rows: readonly ReleaseRow[]): number[] {
  return rows.map((row) => row.sourceIndex);
}

/**
 * What a release request sends: only the positions that are checked and not
 * already released — releasing an already-released line would double-charge
 * it. Sorted by position, so the statement lists new lines in document order
 * regardless of click order.
 */
export function buildReleaseSelections(rows: readonly ReleaseRow[], checked: readonly number[]): Array<{ sourceIndex: number; serviceId: string }> {
  const checkedSet = new Set(checked);
  return rows
    .filter((row) => checkedSet.has(row.sourceIndex) && !row.released)
    .slice()
    .sort((a, b) => a.sourceIndex - b.sourceIndex)
    .map((row) => ({ sourceIndex: row.sourceIndex, serviceId: row.serviceId }));
}

/** Words a charge's kind for the Charges list. */
export function chargeKindLabel(kind: string | null | undefined): string {
  if (kind === 'SERVICE_LINE') return 'Service line';
  if (kind === 'CUSTOM') return 'Custom';
  if (kind === 'DEPOSIT') return 'Deposit';
  return 'Charge';
}

/**
 * Orders the Charges list: released SOW positions first, in document order,
 * then everything else (custom lines, deposits) oldest first — the order
 * they were actually added to the ledger.
 */
export function sortChargesForDisplay<T extends { kind?: string | null; sourceIndex?: number | null; addedAt?: string | Date | null }>(
  charges: readonly T[]
): T[] {
  const serviceLines: T[] = [];
  const rest: T[] = [];
  for (const charge of charges) {
    if (charge.kind === 'SERVICE_LINE' && typeof charge.sourceIndex === 'number') {
      serviceLines.push(charge);
    } else {
      rest.push(charge);
    }
  }
  serviceLines.sort((a, b) => (a.sourceIndex as number) - (b.sourceIndex as number));
  rest.sort((a, b) => new Date(a.addedAt ?? 0).getTime() - new Date(b.addedAt ?? 0).getTime());
  return [...serviceLines, ...rest];
}
