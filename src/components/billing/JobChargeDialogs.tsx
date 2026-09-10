import React from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  Switch,
  TextField,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { CustomLineDraft, ReleaseRow } from '../../utils/jobCharges';
import { customLineError, customLineErrors, depositError, emptyCustomLine } from '../../utils/jobCharges';
import { depositDropNote, equipmentEstimateNote, formatMoney } from '../../utils/equipmentBilling';
import { formatGqlError } from '../../utils/gqlError';

/**
 * The dialog the job page's Invoices card opens.
 *
 * Split out of TechnicianView because it carries enough of its own layout
 * and validation to be worth reading on its own — unlike JobPaymentsPanel's
 * record-payment dialog, which stays inline because it is that card's only
 * dialog.
 */

/** Trailing zeros off an hours figure, so 2 hours does not print as "2.00 hrs". */
function formatHours(n: number | null | undefined): string {
  const value = Number(n) || 0;
  return Number.isInteger(value) ? String(value) : String(Number(value.toFixed(2)));
}

interface GenerateInvoiceDialogProps {
  open: boolean;
  busy: boolean;
  error: string | null;
  rows: ReleaseRow[];
  checked: number[];
  onToggle: (index: number) => void;
  balance: any | null;
  balanceLoading?: boolean;
  balanceError?: unknown;
  dueDate: string;
  onDueDate: (iso: string) => void;
  documentStale?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  /**
   * Whether the SOW in force is countersigned. `false` before that — including
   * when there is no SOW at all — forces deposit mode: a deposit is money
   * collected before signing, so it must stay reachable in exactly the states
   * that block a full release.
   */
  countersigned: boolean;
  depositMode: boolean;
  onDepositMode: (on: boolean) => void;
  depositAmount: string;
  onDepositAmount: (v: string) => void;
  depositLabel: string;
  onDepositLabel: (v: string) => void;
  customLines: CustomLineDraft[];
  onCustomLines: (rows: CustomLineDraft[]) => void;
}

/**
 * Generating a statement: which SOW lines to release now — or, in deposit
 * mode, a single up-front deposit instead — plus a read-only look at
 * everything else the statement already carries: equipment usage, custom
 * lines, deposits, payments, so staff are not guessing what else is on it
 * before they issue it.
 */
export function GenerateInvoiceDialog({
  open,
  busy,
  error,
  rows,
  checked,
  onToggle,
  balance,
  balanceLoading,
  balanceError,
  dueDate,
  onDueDate,
  documentStale,
  onCancel,
  onConfirm,
  countersigned,
  depositMode,
  onDepositMode,
  depositAmount,
  onDepositAmount,
  depositLabel,
  onDepositLabel,
  customLines,
  onCustomLines
}: GenerateInvoiceDialogProps): React.JSX.Element {
  const checkedSet = new Set(checked);

  // The server refuses a deposit once anything has been released
  // ("A deposit cannot be requested once service lines have been released."),
  // so the switch is off the table rather than offered and then rejected.
  const anyReleased = rows.some((row) => row.released);

  // A deposit is money collected before signing, so until the SOW is
  // countersigned there is nothing else to offer: the switch is forced on
  // and locked, whatever the caller's own `depositMode` state says.
  const forcedDeposit = !countersigned;
  const effectiveDepositMode = forcedDeposit || depositMode;

  const patchLine = (i: number, patch: Partial<CustomLineDraft>): void =>
    onCustomLines(customLines.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));

  // The server's own wording for whichever mode is showing, so the confirm
  // button and the field helper text never disagree with the refusal.
  const blocked = effectiveDepositMode ? depositError(depositAmount) : customLineErrors(customLines);

  return (
    <Dialog open={open} onClose={() => (busy ? undefined : onCancel())} maxWidth="sm" fullWidth>
      <DialogTitle>Generate invoice</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 1 }}>
          <FormControlLabel
            control={
              <Switch checked={effectiveDepositMode} disabled={busy || forcedDeposit || anyReleased} onChange={(e) => onDepositMode(e.target.checked)} />
            }
            label="This is a deposit request"
          />
          {forcedDeposit ? (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
              Only a deposit can be requested until the Statement of Work is countersigned.
            </Typography>
          ) : (
            anyReleased && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                A deposit cannot be requested once service lines have been released.
              </Typography>
            )
          )}
        </Box>
        {documentStale && (
          <Alert severity="info" sx={{ mb: 2 }}>
            The job has changed since this Statement of Work was issued. These are the figures the client agreed to, which is what the invoice bills — not the job&rsquo;s current prices.
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {rows.length === 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            This Statement of Work has no service lines to invoice.
          </Alert>
        )}
        {rows.map((row) => {
          // An equipment line is billed from its bookings, never released, so
          // it gets no checkbox at all — greyed, with the estimate note, and
          // still carrying its released date when it has one.
          if (row.estimate) {
            return (
              <Box key={row.sourceIndex} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.5, pl: 5 }}>
                <Box>
                  <Typography variant="subtitle2" color="text.disabled">
                    {row.name}
                  </Typography>
                  <Typography variant="body2" color="text.disabled">
                    {equipmentEstimateNote(row.description)}
                  </Typography>
                  {row.released && (
                    <Typography variant="caption" color="text.disabled" sx={{ display: 'block' }}>
                      {`Released ${row.releasedAt}`}
                    </Typography>
                  )}
                </Box>
              </Box>
            );
          }
          // Released lines are always shown checked and locked, whatever the
          // caller's `checked` array says — they cannot be released twice. In
          // deposit mode every line is shown unchecked and locked: a deposit
          // releases nothing.
          const isChecked = !effectiveDepositMode && (row.released || checkedSet.has(row.sourceIndex));
          return (
            <Box key={row.sourceIndex} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.5 }}>
              <FormControlLabel
                control={<Checkbox checked={isChecked} disabled={row.released || busy || effectiveDepositMode} onChange={() => onToggle(row.sourceIndex)} />}
                label={
                  <Box>
                    <Typography variant="subtitle2" color={row.released ? 'text.disabled' : undefined}>
                      {row.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {row.released ? `Released ${row.releasedAt}` : `${row.description}${row.cost != null ? ` • ${formatMoney(row.cost)}` : ''}`}
                    </Typography>
                    {row.released && row.mismatch && (
                      <Typography variant="caption" color="warning.main" sx={{ display: 'block' }}>
                        {row.mismatch}
                      </Typography>
                    )}
                  </Box>
                }
              />
            </Box>
          );
        })}

        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'action.hover', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
            Also on this statement
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
              <Alert severity="error">{formatGqlError(balanceError, 'Could not load the balance.')}</Alert>
            )
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">
                {`Equipment usage ${formatMoney(balance?.equipmentCharges)} · ${formatHours(balance?.confirmedHours)} hrs`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {`Custom charges ${formatMoney(balance?.customCharges)}`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {`Deposits ${formatMoney(balance?.depositCharges)}`}
              </Typography>
              {depositDropNote(balance) && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                  {depositDropNote(balance)}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary">
                {`Payments to date ${formatMoney(balance?.paymentsToDate)}`}
              </Typography>
            </>
          )}
        </Box>

        {effectiveDepositMode ? (
          <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
            <TextField
              required
              label="Deposit amount"
              type="number"
              value={depositAmount}
              disabled={busy}
              error={depositAmount.trim() !== '' && depositError(depositAmount) !== null}
              helperText={depositAmount.trim() !== '' && depositError(depositAmount) !== null ? depositError(depositAmount) : ' '}
              onChange={(e) => onDepositAmount(e.target.value)}
              slotProps={{ htmlInput: { step: '0.01' } }}
            />
            <TextField label="Label" placeholder="Deposit" value={depositLabel} disabled={busy} onChange={(e) => onDepositLabel(e.target.value)} sx={{ flex: 1 }} />
          </Box>
        ) : (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Other charges
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
                  <IconButton size="small" aria-label={`Remove charge ${i + 1}`} disabled={busy} onClick={() => onCustomLines(customLines.filter((_, idx) => idx !== i))}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Box>
              );
            })}
            <Button size="small" startIcon={<AddIcon />} disabled={busy} onClick={() => onCustomLines([...customLines, emptyCustomLine()])}>
              Add charge line
            </Button>
          </Box>
        )}

        <TextField
          label="Due date"
          type="date"
          value={dueDate}
          disabled={busy}
          onChange={(e) => onDueDate(e.target.value)}
          sx={{ mt: 2 }}
          slotProps={{ inputLabel: { shrink: true } }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" onClick={onConfirm} disabled={busy || !dueDate || !balance || blocked !== null}>
          {busy ? 'Generating…' : 'Generate invoice'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
