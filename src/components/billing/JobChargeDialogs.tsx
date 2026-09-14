import React, { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { GET_INVOICE_PREVIEW } from '../../gql/queries';
import { CREATE_INVOICE } from '../../gql/mutations';
import type { CustomLineDraft, DepositDraft, DueDraft } from '../../utils/jobCharges';
import {
  buildCustomLineInputs,
  buildDueScheduleInput,
  customLineError,
  customLineErrors,
  depositChangeInput,
  depositDraftError,
  depositDraftFrom,
  dueDraftTotal,
  dueDraftsAsSchedule,
  dueDraftsError,
  dueDraftsFrom,
  emptyCustomLine
} from '../../utils/jobCharges';
import { dueDateLabel, formatMoney } from '../../utils/equipmentBilling';
import { formatGqlError, formatSaveError } from '../../utils/gqlError';
import InvoiceView from './InvoiceView';

/**
 * The dialog the Invoice card opens to issue a version.
 *
 * Split out of InvoicePanel because it carries enough of its own layout,
 * state and validation to be worth reading on its own.
 */

/**
 * `value`, once it has stopped changing for `ms`. Keyed on its JSON, so a
 * re-render with an equal object does not restart the wait — the preview
 * query is asked again only when what staff typed actually changed.
 */
function useSettled<T>(value: T, ms: number): T {
  const key = JSON.stringify(value);
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
    // `key` stands in for `value`: equal content must not restart the timer.
  }, [key, ms]);
  return settled;
}

function SectionTitle({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <Typography variant="subtitle2" sx={{ mt: 2, mb: 1 }}>
      {children}
    </Typography>
  );
}

interface IssueInvoiceDialogProps {
  jobId: string;
  /** The title of the invoice this version will supersede, or null when there is none. */
  supersedes: string | null;
  documentStale?: boolean;
  onClose: () => void;
  /** Called once the version is issued, before the dialog closes. */
  onIssued: () => unknown;
}

/**
 * Issuing a version. The right-hand side is the invoice itself, exactly as the
 * page will show it — the server prepares it from the job as it stands plus
 * whatever the left-hand side adds, and writes nothing until Issue.
 *
 * On the left: new charge or discount lines, the deposit (set, changed or
 * removed here — there is nowhere else to do it), and the due dates. The due
 * dates start from the server's default — the current invoice's dates carried
 * over, anything more a month out — and follow it until staff edit them.
 *
 * Mount it only while it is open: every opening starts from a clean draft, so a
 * half-typed line from a cancelled attempt is never submitted with the next.
 */
export function IssueInvoiceDialog({ jobId, supersedes, documentStale, onClose, onIssued }: IssueInvoiceDialogProps): React.JSX.Element {
  const [customLines, setCustomLines] = useState<CustomLineDraft[]>([emptyCustomLine()]);
  const [deposit, setDeposit] = useState<DepositDraft | null>(null);
  const [dueRows, setDueRows] = useState<DueDraft[]>([]);
  const [dueTouched, setDueTouched] = useState(false);
  /** The job's deposit as it stands, read off the first preview. `undefined` until that arrives. */
  const [existingDeposit, setExistingDeposit] = useState<any | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [createInvoice, { loading: issuing }] = useMutation(CREATE_INVOICE);

  const ready = existingDeposit !== undefined;
  const lineInputs = buildCustomLineInputs(customLines.filter((row) => customLineError(row) === null));
  const draftInput = { jobId, ...(lineInputs.length > 0 ? { customLines: lineInputs } : {}), ...(ready ? depositChangeInput(deposit, existingDeposit) : {}) };
  const previewInput = useSettled(draftInput, 400);
  const previewQuery = useQuery(GET_INVOICE_PREVIEW, { variables: { input: previewInput }, skip: !jobId, fetchPolicy: 'network-only' });
  const latest = previewQuery.data?.invoicePreview ?? null;
  // The last good preview stays up while the next one loads, so the invoice does not flash away on every edit.
  const preview = latest ?? previewQuery.previousData?.invoicePreview ?? null;

  // The first preview is the job untouched: its deposit is the one the draft starts from and compares against.
  useEffect(() => {
    if (ready || !latest) return;
    setExistingDeposit(latest.deposit ?? null);
    setDeposit(depositDraftFrom(latest.deposit));
    setDueRows(dueDraftsFrom(latest.dueSchedule));
  }, [latest, ready]);

  // Until staff edit the due dates, they follow the server's default for the job as drafted.
  useEffect(() => {
    if (ready && !dueTouched && latest) setDueRows(dueDraftsFrom(latest.dueSchedule));
  }, [latest, ready, dueTouched]);

  const target = preview ? Math.max(0, Math.round(((Number(preview.balanceDue) || 0) - (Number(preview.deposit?.outstanding) || 0)) * 100) / 100) : 0;
  const depositOutstanding = Number(preview?.deposit?.outstanding) || 0;
  const pending = previewQuery.loading || JSON.stringify(previewInput) !== JSON.stringify(draftInput);
  const blocked = customLineErrors(customLines) ?? depositDraftError(deposit) ?? (preview ? dueDraftsError(dueRows, target) : null);
  const depositChange = ready ? depositChangeInput(deposit, existingDeposit) : {};
  const shown = preview ? { ...preview, dueSchedule: dueDraftsAsSchedule(dueRows) } : null;

  const patchLine = (i: number, patch: Partial<CustomLineDraft>): void => setCustomLines(customLines.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const patchDeposit = (patch: Partial<DepositDraft>): void => setDeposit({ ...(deposit ?? { amount: '', label: '', dueDate: '' }), ...patch });
  const editDue = (rows: DueDraft[]): void => {
    setDueTouched(true);
    setDueRows(rows);
  };
  const patchDue = (i: number, patch: Partial<DueDraft>): void => editDue(dueRows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const remainder = Math.round((target - dueDraftTotal(dueRows)) * 100) / 100;

  const submit = async (): Promise<void> => {
    setError(null);
    const input: any = { jobId, dueSchedule: buildDueScheduleInput(dueRows), ...depositChange };
    const lines = buildCustomLineInputs(customLines);
    if (lines.length > 0) input.customLines = lines;
    try {
      await createInvoice({ variables: { input } });
      await onIssued();
      onClose();
    } catch (err) {
      // Stays open with the refusal visible in the dialog itself.
      setError(formatSaveError(err, 'this invoice'));
    }
  };

  return (
    <Dialog open onClose={() => (issuing ? undefined : onClose())} maxWidth="lg" fullWidth>
      <DialogTitle>{supersedes ? 'Issue a new invoice version' : 'Issue invoice'}</DialogTitle>
      <DialogContent dividers>
        {supersedes && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {`${supersedes} will be marked Superseded, and the client is emailed the new version.`}
          </Alert>
        )}
        {documentStale && (
          <Alert severity="info" sx={{ mb: 2 }}>
            The job has changed since this Statement of Work was countersigned. The invoice bills the figures the client agreed to, not the job&rsquo;s current prices.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 5fr) minmax(0, 7fr)' }, gap: 3, alignItems: 'start' }}>
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Add charge or discount lines
            </Typography>
            {customLines.map((row, i) => {
              const rowError = customLineError(row);
              return (
                <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1, flexWrap: 'wrap' }}>
                  <TextField size="small" label="Label" value={row.label} disabled={issuing} sx={{ flex: '1 1 140px' }} onChange={(e) => patchLine(i, { label: e.target.value })} />
                  <TextField
                    size="small"
                    label="Amount"
                    type="number"
                    value={row.amount}
                    disabled={issuing}
                    sx={{ width: 120 }}
                    error={rowError !== null}
                    helperText={rowError ?? 'negative for a discount'}
                    onChange={(e) => patchLine(i, { amount: e.target.value })}
                    slotProps={{ htmlInput: { step: '0.01' } }}
                  />
                  <TextField size="small" label="Note" value={row.note} disabled={issuing} sx={{ flex: '1 1 140px' }} onChange={(e) => patchLine(i, { note: e.target.value })} />
                  <IconButton size="small" aria-label={`Remove line ${i + 1}`} disabled={issuing} onClick={() => setCustomLines(customLines.filter((_, idx) => idx !== i))}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              );
            })}
            <Button size="small" startIcon={<AddIcon />} disabled={issuing} onClick={() => setCustomLines([...customLines, emptyCustomLine()])}>
              Add line
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              New lines stay on the job and carry onto every later version. To take one back, add a discount line.
            </Typography>

            <SectionTitle>Deposit</SectionTitle>
            {!ready ? (
              <CircularProgress size={16} />
            ) : deposit ? (
              <>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                  <TextField
                    size="small"
                    label="Amount"
                    type="number"
                    value={deposit.amount}
                    disabled={issuing}
                    sx={{ width: 120 }}
                    onChange={(e) => patchDeposit({ amount: e.target.value })}
                    slotProps={{ htmlInput: { step: '0.01' } }}
                  />
                  <TextField size="small" label="Label" placeholder="Deposit" value={deposit.label} disabled={issuing} sx={{ flex: '1 1 120px' }} onChange={(e) => patchDeposit({ label: e.target.value })} />
                  <TextField
                    size="small"
                    label="Deposit due"
                    type="date"
                    value={deposit.dueDate}
                    disabled={issuing}
                    onChange={(e) => patchDeposit({ dueDate: e.target.value })}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <IconButton size="small" aria-label="Remove deposit" disabled={issuing} onClick={() => setDeposit(null)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Typography variant="caption" color={depositDraftError(deposit) ? 'error' : 'text.secondary'} sx={{ display: 'block', mt: 0.5 }}>
                  {depositDraftError(deposit) ??
                    (existingDeposit && depositChange.deposit
                      ? `Replaces the current deposit (${formatMoney(existingDeposit.amount)}${dueDateLabel(existingDeposit.dueDate) ? `, ${dueDateLabel(existingDeposit.dueDate).toLowerCase()}` : ''}).`
                      : 'Part of the total, asked for by its own date — never added to it.')}
                </Typography>
              </>
            ) : (
              <>
                <Button size="small" startIcon={<AddIcon />} disabled={issuing} onClick={() => setDeposit({ amount: '', label: '', dueDate: '' })}>
                  Add a deposit
                </Button>
                {existingDeposit && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {`The current deposit (${formatMoney(existingDeposit.amount)}) will be removed. `}
                    <Button size="small" sx={{ p: 0, minWidth: 0, verticalAlign: 'baseline', textTransform: 'none' }} onClick={() => setDeposit(depositDraftFrom(existingDeposit))}>
                      Keep it
                    </Button>
                  </Typography>
                )}
              </>
            )}

            <SectionTitle>Due dates</SectionTitle>
            {!preview ? (
              <CircularProgress size={16} />
            ) : (
              <>
                {dueRows.map((row, i) => (
                  <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1 }}>
                    <TextField
                      size="small"
                      label="Amount"
                      type="number"
                      value={row.amount}
                      disabled={issuing}
                      sx={{ width: 120 }}
                      onChange={(e) => patchDue(i, { amount: e.target.value })}
                      slotProps={{ htmlInput: { step: '0.01' } }}
                    />
                    <TextField
                      size="small"
                      label="Due"
                      type="date"
                      value={row.dueDate}
                      disabled={issuing}
                      onChange={(e) => patchDue(i, { dueDate: e.target.value })}
                      slotProps={{ inputLabel: { shrink: true } }}
                    />
                    <IconButton size="small" aria-label={`Remove due date ${i + 1}`} disabled={issuing} onClick={() => editDue(dueRows.filter((_, idx) => idx !== i))}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Box>
                ))}
                {target > 0 || dueRows.length > 0 ? (
                  <>
                    <Button
                      size="small"
                      startIcon={<AddIcon />}
                      disabled={issuing}
                      onClick={() => editDue([...dueRows, { amount: remainder > 0 ? remainder.toFixed(2) : '', dueDate: '' }])}
                    >
                      Add a due date
                    </Button>
                    <Typography variant="caption" color={dueDraftsError(dueRows, target) ? 'error' : 'text.secondary'} sx={{ display: 'block' }}>
                      {dueDraftsError(dueRows, target) ??
                        `Covers the ${formatMoney(target)} owed${depositOutstanding > 0 ? ' besides the deposit' : ''}.`}
                    </Typography>
                  </>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    {depositOutstanding > 0 ? 'Nothing is owed besides the deposit.' : 'Nothing is owed — this version will show as Paid.'}
                  </Typography>
                )}
                {dueTouched ? (
                  <Button size="small" sx={{ mt: 0.5 }} disabled={issuing} onClick={() => setDueTouched(false)}>
                    Reset to the default dates
                  </Button>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    The current invoice’s dates carry over; anything more that is owed falls due a month out.
                  </Typography>
                )}
              </>
            )}
          </Box>

          <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, position: 'relative' }}>
            {shown ? (
              <>
                {previewQuery.error && (
                  <Alert severity="warning" sx={{ mb: 1 }}>
                    {formatGqlError(previewQuery.error, 'Could not refresh the preview.')}
                  </Alert>
                )}
                <Box sx={{ opacity: pending ? 0.6 : 1, transition: 'opacity 120ms' }}>
                  <InvoiceView invoice={shown} preview />
                </Box>
              </>
            ) : previewQuery.error ? (
              <Alert severity="error">{formatGqlError(previewQuery.error, 'Could not prepare the invoice.')}</Alert>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Preparing the invoice…
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={issuing}>
          Cancel
        </Button>
        <Button variant="contained" onClick={submit} disabled={issuing || !ready || !preview || pending || blocked !== null}>
          {issuing ? 'Issuing…' : supersedes ? 'Issue new version' : 'Issue invoice'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
