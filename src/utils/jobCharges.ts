/**
 * The UI's read of a job's charges — the custom lines and the deposit every
 * invoice version restates — and of what issuing a new version would add.
 *
 * Pure and here for the same reason as `equipmentBilling.ts` — no jsdom in
 * this repo, so anything worth testing has to live outside a component.
 */

function round2(n: number): number {
  return Math.round((Number(n) || 0) * 100) / 100;
}

/** Words a charge's kind for the Charges list. */
export function chargeKindLabel(kind: string | null | undefined): string {
  if (kind === 'SERVICE_LINE') return 'Service line';
  if (kind === 'CUSTOM') return 'Custom';
  if (kind === 'DEPOSIT') return 'Deposit';
  return 'Charge';
}

/**
 * Orders the Charges list: legacy released SOW positions first, in document
 * order, then everything else (custom lines, deposits) oldest first — the
 * order they were actually added.
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

/*
 * Verbatim copies of `CHARGE_MESSAGES` in `job-charge.service.ts` — the
 * dialog validates client-side with the server's own wording so a refusal
 * never surprises staff with a different message than the one they'd see
 * on submit.
 */
const LABEL_REQUIRED = 'A label is required for a charge.';
const AMOUNT_ZERO = 'A charge amount cannot be zero.';
const DEPOSIT_NOT_POSITIVE = 'A deposit must be greater than zero.';
const DEPOSIT_DUE_REQUIRED = 'A deposit needs a due date.';

/** One custom-line draft row in the issue dialog. */
export interface CustomLineDraft {
  label: string;
  amount: string;
  note: string;
}

export function emptyCustomLine(): CustomLineDraft {
  return { label: '', amount: '', note: '' };
}

/** A row with nothing typed into it yet — dropped silently rather than validated. */
export function isBlankCustomLine(row: CustomLineDraft): boolean {
  return row.label.trim() === '' && row.amount.trim() === '';
}

/** The server's exact refusal for this row, or null when it is fine or blank. */
export function customLineError(row: CustomLineDraft): string | null {
  if (isBlankCustomLine(row)) return null;
  if (row.label.trim() === '') return LABEL_REQUIRED;
  const n = Number(row.amount.trim());
  if (!Number.isFinite(n) || n === 0) return AMOUNT_ZERO;
  return null;
}

/** The first offending row's message, for the dialog to show once. */
export function customLineErrors(rows: readonly CustomLineDraft[]): string | null {
  for (const row of rows) {
    const error = customLineError(row);
    if (error) return error;
  }
  return null;
}

/** Blank rows dropped, everything else trimmed; `note` omitted entirely when blank. */
export function buildCustomLineInputs(rows: readonly CustomLineDraft[]): Array<{ label: string; amount: number; note?: string }> {
  const inputs: Array<{ label: string; amount: number; note?: string }> = [];
  for (const row of rows) {
    if (isBlankCustomLine(row)) continue;
    const label = row.label.trim();
    const amount = Number(row.amount.trim());
    const note = row.note.trim();
    inputs.push(note ? { label, amount, note } : { label, amount });
  }
  return inputs;
}

/** The server's exact refusal for a deposit amount field, or null. */
export function depositError(amount: string): string | null {
  const n = Number(amount.trim());
  if (!Number.isFinite(n) || n <= 0) return DEPOSIT_NOT_POSITIVE;
  return null;
}

/** The deposit being set in the issue dialog, as typed. `dueDate` is `yyyy-MM-dd`. */
export interface DepositDraft {
  amount: string;
  label: string;
  dueDate: string;
}

/** The server's exact refusal for the deposit draft, or null when there is none or it is fine. */
export function depositDraftError(draft: DepositDraft | null | undefined): string | null {
  if (!draft) return null;
  const amount = depositError(draft.amount);
  if (amount) return amount;
  if (!draft.dueDate.trim()) return DEPOSIT_DUE_REQUIRED;
  return null;
}

/**
 * A `yyyy-MM-dd` day as noon local time, in ISO form. Noon, not midnight: a
 * date-only string parsed as UTC midnight renders as the previous day in every
 * negative-offset timezone, which is where this lab is.
 */
export function noonIso(day: string): string {
  return new Date(`${day}T12:00:00`).toISOString();
}

/** The mutation's deposit input, or null when there is no (valid) draft. */
export function buildDepositInput(draft: DepositDraft | null | undefined): { amount: number; label?: string; dueDate: string } | null {
  if (!draft || depositDraftError(draft)) return null;
  const label = draft.label.trim();
  return { amount: Number(draft.amount.trim()), ...(label ? { label } : {}), dueDate: noonIso(draft.dueDate) };
}

export interface IssuePreview {
  charges: number;
  payments: number;
  balance: number;
  paid: boolean;
  depositOutstanding: number;
}

/**
 * What the version about to be issued will state, from the job's live balance
 * plus whatever the dialog adds — the same arithmetic `JobBalanceService`
 * performs, so the preview and the issued document agree: new lines add to
 * the charges; a deposit never does, and what it asks for is capped at the
 * balance.
 */
export function issuePreview(
  balance: { chargesToDate?: number | null; paymentsToDate?: number | null; depositAmount?: number | null } | null | undefined,
  customLines: readonly CustomLineDraft[],
  deposit: DepositDraft | null | undefined
): IssuePreview {
  const added = buildCustomLineInputs(customLines.filter((row) => customLineError(row) === null)).reduce((sum, line) => sum + line.amount, 0);
  const charges = round2((Number(balance?.chargesToDate) || 0) + added);
  const payments = round2(Number(balance?.paymentsToDate) || 0);
  const due = round2(charges - payments);
  const depositAmount = deposit && !depositError(deposit.amount) ? Number(deposit.amount) : balance?.depositAmount != null ? Number(balance.depositAmount) : null;
  const depositOutstanding = depositAmount == null ? 0 : round2(Math.max(0, Math.min(depositAmount - payments, due)));
  return { charges, payments, balance: due, paid: Math.round(payments * 100) >= Math.round(charges * 100), depositOutstanding };
}
