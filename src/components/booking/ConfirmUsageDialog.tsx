import React, { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';

interface Props {
  open: boolean;
  /** The booking being confirmed: kind, slot, quantity and rate drive the prefill and the cost preview. */
  booking: any | null;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  /** One of the two is set, by kind. */
  onConfirm: (values: { actualHours?: number; actualQuantity?: number }) => void;
}

const slotHours = (b: any): number => (b?.startTime && b?.endTime ? (new Date(b.endTime).getTime() - new Date(b.startTime).getTime()) / 3_600_000 : 0);

/**
 * Staff state the hours (or units) actually used; that figure, times the rate
 * snapshot, is what the job is charged. Prefilled from the booking, and offered
 * again on an already-confirmed booking so the figure can be corrected until it
 * is billed.
 */
export default function ConfirmUsageDialog({ open, booking, busy, error, onCancel, onConfirm }: Props): React.JSX.Element {
  const timed = booking?.kind !== 'QUANTITY';
  const [value, setValue] = useState('');

  useEffect(() => {
    if (!open || !booking) return;
    if (timed) {
      const hours = booking.usageConfirmed && booking.actualHours != null ? booking.actualHours : slotHours(booking);
      setValue(String(Math.round(hours * 100) / 100));
    } else {
      setValue(String(booking.usageConfirmed && booking.actualQuantity != null ? booking.actualQuantity : (booking.quantity ?? 1)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, booking?._id]);

  const n = Number(value);
  const valid = Number.isFinite(n) && n >= 0;
  const rate = booking?.rateSnapshot;

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>
        {booking?.usageConfirmed ? 'Adjust confirmed usage' : 'Confirm usage'} — {booking?.inventoryName}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Confirm the actual {timed ? 'hours used' : 'quantity used'}. This is what gets billed.
        </Typography>
        <TextField
          autoFocus
          fullWidth
          type="number"
          label={timed ? 'Actual hours' : 'Actual quantity'}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          inputProps={{ min: 0, step: timed ? '0.25' : '1' }}
        />
        {rate != null && valid && (
          <Typography variant="body2" sx={{ mt: 1.5 }}>
            Cost: ${(n * rate).toFixed(2)} ({Number(rate).toFixed(2)}/{timed ? 'hr' : 'unit'})
          </Typography>
        )}
        {rate == null && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
            No rate was recorded on this booking, so confirming sets the hours but not a cost.
          </Typography>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" disabled={!valid || busy} onClick={() => onConfirm(timed ? { actualHours: n } : { actualQuantity: Math.round(n) })}>
          {busy ? 'Saving…' : 'Confirm'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
