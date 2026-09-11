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

/** `yyyy-MM-dd` from a date's local parts — what a date input holds. '' for a missing or unreadable date. */
export function localDay(value: string | Date | null | undefined): string {
  if (!value) return '';
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const cents = (n: unknown): number => Math.round((Number(n) || 0) * 100);

/** The job's deposit as the dialog's editable draft, or null when it has none. "Deposit" shows as the placeholder, not as typed text. */
export function depositDraftFrom(deposit: { label?: string | null; amount?: number | null; dueDate?: string | Date | null } | null | undefined): DepositDraft | null {
  if (!deposit || deposit.amount == null) return null;
  const label = deposit.label?.trim() ?? '';
  return { amount: (Number(deposit.amount) || 0).toFixed(2), label: label === 'Deposit' ? '' : label, dueDate: localDay(deposit.dueDate) };
}

/**
 * What the mutation says about the deposit: nothing when the draft is the
 * deposit the job already has, `removeDeposit` when staff removed it, the
 * draft otherwise. A draft that is not valid yet says nothing — the dialog
 * blocks on it, and the preview keeps showing the job's deposit meanwhile.
 */
export function depositChangeInput(
  draft: DepositDraft | null | undefined,
  existing: { label?: string | null; amount?: number | null; dueDate?: string | Date | null } | null | undefined
): { deposit?: { amount: number; label?: string; dueDate: string }; removeDeposit?: true } {
  if (!draft) return existing ? { removeDeposit: true } : {};
  const input = buildDepositInput(draft);
  if (!input) return {};
  const unchanged =
    !!existing &&
    cents(existing.amount) === cents(input.amount) &&
    localDay(existing.dueDate) === draft.dueDate &&
    (existing.label?.trim() || 'Deposit') === (input.label ?? 'Deposit');
  return unchanged ? {} : { deposit: input };
}

/*
 * Verbatim copies of `DUE_SCHEDULE_MESSAGES` in `due-schedule.ts`, for the
 * same reason as the charge messages above.
 */
const DUE_AMOUNT_NOT_POSITIVE = 'Each due date needs an amount greater than zero.';
const DUE_DATE_REQUIRED = 'Each amount needs a due date.';
const DUE_NOTHING_OWED = 'Nothing is owed, so this invoice takes no due dates.';

/** One due-date row in the issue dialog, as typed. `dueDate` is `yyyy-MM-dd`. */
export interface DueDraft {
  amount: string;
  dueDate: string;
}

/** A schedule as the dialog's editable rows. */
export function dueDraftsFrom(schedule: ReadonlyArray<{ amount?: number | null; dueDate?: string | Date | null }> | null | undefined): DueDraft[] {
  return (schedule ?? []).map((entry) => ({ amount: (Number(entry?.amount) || 0).toFixed(2), dueDate: localDay(entry?.dueDate) }));
}

function isValidDueRow(row: DueDraft): boolean {
  const amount = row.amount.trim();
  return amount !== '' && Number.isFinite(Number(amount)) && cents(amount) > 0 && row.dueDate.trim() !== '';
}

/** What the rows add up to, counting only amounts that parse. */
export function dueDraftTotal(rows: readonly DueDraft[]): number {
  return round2(rows.reduce((sum, row) => sum + (Number.isFinite(Number(row.amount.trim())) ? Number(row.amount.trim()) : 0), 0));
}

/** The server's exact refusal for these rows against what they must cover, or null. */
export function dueDraftsError(rows: readonly DueDraft[], target: number): string | null {
  for (const row of rows) {
    const amount = row.amount.trim();
    if (amount === '' || !Number.isFinite(Number(amount)) || cents(amount) <= 0) return DUE_AMOUNT_NOT_POSITIVE;
    if (!row.dueDate.trim()) return DUE_DATE_REQUIRED;
  }
  const targetCents = Math.max(0, cents(target));
  if (targetCents === 0) return rows.length > 0 ? DUE_NOTHING_OWED : null;
  const sum = rows.reduce((total, row) => total + cents(row.amount), 0);
  return sum === targetCents ? null : `The due dates add up to $${(sum / 100).toFixed(2)}, but $${(targetCents / 100).toFixed(2)} is owed.`;
}

/** The mutation's `dueSchedule`: every row, amounts to the cent, dates at local noon. */
export function buildDueScheduleInput(rows: readonly DueDraft[]): Array<{ amount: number; dueDate: string }> {
  return rows.map((row) => ({ amount: round2(Number(row.amount.trim())), dueDate: noonIso(row.dueDate) }));
}

/** The rows the preview can render while staff type — rows that do not parse yet are left out rather than shown as $0.00. */
export function dueDraftsAsSchedule(rows: readonly DueDraft[]): Array<{ amount: number; dueDate: string }> {
  return buildDueScheduleInput(rows.filter(isValidDueRow));
}
