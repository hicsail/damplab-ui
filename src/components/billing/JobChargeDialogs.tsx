import React from 'react';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { CustomLineDraft, DepositDraft } from '../../utils/jobCharges';
import { customLineError, customLineErrors, depositDraftError, emptyCustomLine, issuePreview } from '../../utils/jobCharges';
import { balanceHeading, dueDateLabel, formatHours, formatMoney } from '../../utils/equipmentBilling';
import { formatGqlError } from '../../utils/gqlError';

/**
 * The dialog the Invoice card opens to issue a version.
 *
 * Split out of InvoicePanel because it carries enough of its own layout and
 * validation to be worth reading on its own.
 */

/** A signed amount: a discount prints "-$50.00", never "$-50.00". */
function signedMoney(n: number | null | undefined): string {
  const value = Number(n) || 0;
  return value < 0 ? `-${formatMoney(Math.abs(value))}` : formatMoney(value);
}

interface IssueInvoiceDialogProps {
  open: boolean;
  busy: boolean;
  error: string | null;
  /** The title of the invoice this version will supersede, or null when there is none. */
  supersedes: string | null;
  balance: any | null;
  balanceLoading?: boolean;
  balanceError?: unknown;
  /** Live CUSTOM charges already on the job — carried onto every version. */
  existingCustom: any[];
  /** The job's live DEPOSIT charge, if any. */
  existingDeposit: any | null;
  customLines: CustomLineDraft[];
  onCustomLines: (rows: CustomLineDraft[]) => void;
  /** A deposit being set in this dialog, or null. Only offered when the job has none. */
  deposit: DepositDraft | null;
  onDeposit: (draft: DepositDraft | null) => void;
  dueDate: string;
  onDueDate: (iso: string) => void;
  documentStale?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Issuing a version: a read-only look at everything it restates — the
 * countersigned SOW's services, confirmed equipment use, the charges already
 * on the job, payments — plus new charge or discount lines, the deposit when
 * the job has none yet, and the due date. The preview underneath states what
 * the version will say, including whether it will already read as Paid.
 */
export function IssueInvoiceDialog({
  open,
  busy,
  error,
  supersedes,
  balance,
  balanceLoading,
  balanceError,
  existingCustom,
  existingDeposit,
  customLines,
  onCustomLines,
  deposit,
  onDeposit,
  dueDate,
  onDueDate,
  documentStale,
  onCancel,
  onConfirm
}: IssueInvoiceDialogProps): React.JSX.Element {
  const patchLine = (i: number, patch: Partial<CustomLineDraft>): void => onCustomLines(customLines.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  const patchDeposit = (patch: Partial<DepositDraft>): void => onDeposit({ ...(deposit ?? { amount: '', label: '', dueDate: '' }), ...patch });

  // The server's own wording, so the confirm button and the refusal never disagree.
  const blocked = customLineErrors(customLines) ?? depositDraftError(deposit);
  const preview = issuePreview(balance, customLines, deposit);
  const summaryRow = (label: string, value: string): React.JSX.Element => (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );

  return (
    <Dialog open={open} onClose={() => (busy ? undefined : onCancel())} maxWidth="sm" fullWidth>
      <DialogTitle>{supersedes ? 'Issue a new invoice version' : 'Issue invoice'}</DialogTitle>
      <DialogContent>
        {supersedes && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {`${supersedes} will be marked Superseded. The new version restates the whole job as it stands now.`}
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

        <Box sx={{ p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            On this invoice
          </Typography>
          {!balance ? (
            balanceLoading ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={16} />
                <Typography variant="body2" color="text.secondary">
                  Loading…
                </Typography>
              </Box>
            ) : (
              <Alert severity="error">{formatGqlError(balanceError, 'Could not load the job’s charges.')}</Alert>
            )
          ) : (
            <>
              {summaryRow('Services (countersigned SOW)', formatMoney(balance.serviceCharges))}
              {Number(balance.adjustmentCharges) !== 0 && summaryRow('SOW adjustments', signedMoney(balance.adjustmentCharges))}
              {summaryRow(`Equipment usage · ${formatHours(balance.confirmedHours)} hrs confirmed`, formatMoney(balance.equipmentCharges))}
              {balance.unconfirmedBookings > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {`${balance.unconfirmedBookings} booking${balance.unconfirmedBookings === 1 ? '' : 's'} not yet confirmed, so not on this invoice.`}
                </Typography>
              )}
              {existingCustom.map((c: any) => (
                <React.Fragment key={c.id}>{summaryRow(c.label, signedMoney(c.amount))}</React.Fragment>
              ))}
              {summaryRow('Payments to date', `-${formatMoney(balance.paymentsToDate)}`)}
              {existingDeposit && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {`${existingDeposit.label} ${formatMoney(existingDeposit.amount)}${dueDateLabel(existingDeposit.dueDate) ? ` · ${dueDateLabel(existingDeposit.dueDate)}` : ''} — carried onto every version. To change it, void it from the Charges list first.`}
                </Typography>
              )}
            </>
          )}
        </Box>

        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Add charge or discount lines
          </Typography>
          {customLines.map((row, i) => {
            const rowError = customLineError(row);
            return (
              <Box key={i} sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mb: 1 }}>
                <TextField size="small" label="Label" value={row.label} disabled={busy} sx={{ flex: 1 }} onChange={(e) => patchLine(i, { label: e.target.value })} />
                <TextField
                  size="small"
                  label="Amount"
                  type="number"
                  value={row.amount}
                  disabled={busy}
                  sx={{ width: 128 }}
                  error={rowError !== null}
                  helperText={rowError ?? 'negative for a discount'}
                  onChange={(e) => patchLine(i, { amount: e.target.value })}
                  slotProps={{ htmlInput: { step: '0.01' } }}
                />
                <TextField size="small" label="Note" value={row.note} disabled={busy} sx={{ flex: 1 }} onChange={(e) => patchLine(i, { note: e.target.value })} />
                <IconButton size="small" aria-label={`Remove line ${i + 1}`} disabled={busy} onClick={() => onCustomLines(customLines.filter((_, idx) => idx !== i))}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Box>
            );
          })}
          <Button size="small" startIcon={<AddIcon />} disabled={busy} onClick={() => onCustomLines([...customLines, emptyCustomLine()])}>
            Add line
          </Button>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
            New lines stay on the job and carry onto every later version.
          </Typography>
        </Box>

        {!existingDeposit && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Deposit
            </Typography>
            {deposit ? (
              <>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start' }}>
                  <TextField
                    size="small"
                    label="Amount"
                    type="number"
                    value={deposit.amount}
                    disabled={busy}
                    sx={{ width: 128 }}
                    onChange={(e) => patchDeposit({ amount: e.target.value })}
                    slotProps={{ htmlInput: { step: '0.01' } }}
                  />
                  <TextField size="small" label="Label" placeholder="Deposit" value={deposit.label} disabled={busy} sx={{ flex: 1 }} onChange={(e) => patchDeposit({ label: e.target.value })} />
                  <TextField
                    size="small"
                    label="Deposit due"
                    type="date"
                    value={deposit.dueDate}
                    disabled={busy}
                    onChange={(e) => patchDeposit({ dueDate: e.target.value })}
                    slotProps={{ inputLabel: { shrink: true } }}
                  />
                  <IconButton size="small" aria-label="Remove deposit" disabled={busy} onClick={() => onDeposit(null)}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Typography variant="caption" color={depositDraftError(deposit) ? 'error' : 'text.secondary'} sx={{ display: 'block', mt: 0.5 }}>
                  {depositDraftError(deposit) ?? 'Part of the total, asked for by its own date — never added to it.'}
                </Typography>
              </>
            ) : (
              <Button size="small" startIcon={<AddIcon />} disabled={busy} onClick={() => onDeposit({ amount: '', label: '', dueDate: '' })}>
                Add a deposit
              </Button>
            )}
          </Box>
        )}

        <TextField
          label="Invoice due date"
          type="date"
          value={dueDate}
          disabled={busy}
          onChange={(e) => onDueDate(e.target.value)}
          sx={{ mt: 2 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />

        {balance && (
          <Box sx={{ mt: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 1 }}>
            {summaryRow('Charges', formatMoney(preview.charges))}
            {summaryRow('Payments', `-${formatMoney(preview.payments)}`)}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Typography variant="body2" fontWeight={600}>
                {balanceHeading(preview.balance)}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {formatMoney(Math.abs(preview.balance))}
              </Typography>
            </Box>
            {preview.depositOutstanding > 0 && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                {`Of which ${formatMoney(preview.depositOutstanding)} is due first, as the deposit.`}
              </Typography>
            )}
            {preview.paid && (
              <Typography variant="caption" color="success.main" sx={{ display: 'block', fontWeight: 600 }}>
                The payments received cover this invoice — it will show as Paid.
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onConfirm} disabled={busy || !dueDate || !balance || blocked !== null}>
          {busy ? 'Issuing…' : supersedes ? 'Issue new version' : 'Issue invoice'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
