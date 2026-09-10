import React, { useEffect, useState } from 'react';
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
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography
} from '@mui/material';
import type { ReleaseRow } from '../../utils/jobCharges';
import { depositDropNote, formatMoney } from '../../utils/equipmentBilling';
import { formatGqlError } from '../../utils/gqlError';

/**
 * The two dialogs the job page's Invoices card opens.
 *
 * Split out of TechnicianView because each carries enough of its own layout
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
}

/**
 * Generating a statement: which SOW lines to release now, plus a read-only
 * look at everything else the statement already carries — equipment usage,
 * custom lines, deposits, payments — so staff are not guessing what else is
 * on it before they issue it.
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
  onConfirm
}: GenerateInvoiceDialogProps): React.JSX.Element {
  const checkedSet = new Set(checked);

  return (
    <Dialog open={open} onClose={() => (busy ? undefined : onCancel())} maxWidth="sm" fullWidth>
      <DialogTitle>Generate invoice</DialogTitle>
      <DialogContent>
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
          // Released lines are always shown checked and locked, whatever the
          // caller's `checked` array says — they cannot be released twice.
          const isChecked = row.released || checkedSet.has(row.sourceIndex);
          return (
            <Box key={row.sourceIndex} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.5 }}>
              <FormControlLabel
                control={<Checkbox checked={isChecked} disabled={row.released || busy} onChange={() => onToggle(row.sourceIndex)} />}
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
        <Button variant="contained" onClick={onConfirm} disabled={busy || !dueDate || !balance}>
          {busy ? 'Generating…' : 'Generate invoice'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

interface AddChargeDialogProps {
  open: boolean;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (input: { kind: 'CUSTOM' | 'DEPOSIT'; label: string; amount: number }) => void;
}

/** Adding a one-off charge: a custom line (may be negative) or a deposit (must be positive). */
export function AddChargeDialog({ open, busy, error, onCancel, onConfirm }: AddChargeDialogProps): React.JSX.Element {
  const [kind, setKind] = useState<'CUSTOM' | 'DEPOSIT'>('CUSTOM');
  const [label, setLabel] = useState('');
  const [amount, setAmount] = useState('');

  // Each opening starts clean, so an in-progress entry for one charge is
  // never submitted as another.
  useEffect(() => {
    if (open) {
      setKind('CUSTOM');
      setLabel('');
      setAmount('');
    }
  }, [open]);

  const numericAmount = Number(amount);
  const amountEntered = amount.trim() !== '' && !Number.isNaN(numericAmount);
  // The exact refusal the server would give for this kind and amount, so the
  // helper text never invents wording the backend does not use.
  const amountRefusal = kind === 'DEPOSIT' ? 'A deposit must be greater than zero.' : 'A charge amount cannot be zero.';
  const amountValid = amountEntered && (kind === 'DEPOSIT' ? numericAmount > 0 : numericAmount !== 0);
  const labelValid = label.trim().length > 0;
  const canConfirm = labelValid && amountValid;

  return (
    <Dialog open={open} onClose={() => (busy ? undefined : onCancel())} maxWidth="xs" fullWidth>
      <DialogTitle>Add charge</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <ToggleButtonGroup exclusive value={kind} disabled={busy} onChange={(_e, next) => next && setKind(next)}>
            <ToggleButton value="CUSTOM">Custom</ToggleButton>
            <ToggleButton value="DEPOSIT">Deposit</ToggleButton>
          </ToggleButtonGroup>
          <TextField autoFocus required label="Label" value={label} disabled={busy} onChange={(e) => setLabel(e.target.value)} />
          <TextField
            required
            label="Amount"
            type="number"
            value={amount}
            disabled={busy}
            error={amountEntered && !amountValid}
            helperText={amountEntered && !amountValid ? amountRefusal : ' '}
            onChange={(e) => setAmount(e.target.value)}
            slotProps={{ htmlInput: { step: '0.01' } }}
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} color="inherit" disabled={busy}>
          Cancel
        </Button>
        <Button variant="contained" disabled={busy || !canConfirm} onClick={() => onConfirm({ kind, label: label.trim(), amount: numericAmount })}>
          {busy ? 'Adding…' : 'Add charge'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
