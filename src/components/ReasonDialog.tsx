import React, { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material';

/**
 * Confirming an action that undoes something the other party can see, and
 * recording why.
 *
 * Shared by the four withdrawal/cancellation flows because they are the same
 * interaction: a warning about what is lost, a reason the client will read, and
 * a confirmation. These began as `window.confirm` + `window.prompt`, which had
 * two problems worth fixing rather than working around — a blank prompt silently
 * did nothing, so an empty reason read as a broken button, and the reason was
 * never actually required despite being posted to the client.
 */

interface Props {
  open: boolean;
  title: string;
  /** What the action does and what it costs. Shown above the reason field. */
  warning: string;
  /** Label for the reason field; names the audience so staff write for them. */
  fieldLabel?: string;
  confirmLabel: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
}

export default function ReasonDialog({ open, title, warning, fieldLabel = 'Reason (the client sees this)', confirmLabel, busy, onCancel, onConfirm }: Props): React.JSX.Element {
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  // Each opening starts clean, so a reason typed for one action can never be
  // submitted against the next.
  useEffect(() => {
    if (open) {
      setReason('');
      setTouched(false);
    }
  }, [open]);

  const trimmed = reason.trim();
  const invalid = touched && trimmed.length === 0;

  return (
    <Dialog open={open} onClose={() => (busy ? undefined : onCancel())} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
            {warning}
          </Typography>
        </Alert>
        <TextField
          autoFocus
          fullWidth
          multiline
          minRows={3}
          required
          label={fieldLabel}
          value={reason}
          disabled={busy}
          error={invalid}
          helperText={invalid ? 'A reason is required — the client is told why this happened.' : ' '}
          onChange={(e) => {
            setTouched(true);
            setReason(e.target.value);
          }}
        />
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onCancel} color="inherit" disabled={busy}>
          Cancel
        </Button>
        {/* Disabled rather than validated on click: the reason is not optional,
            so the button should not look available until there is one. */}
        <Button variant="contained" color="warning" disabled={busy || trimmed.length === 0} onClick={() => onConfirm(trimmed)}>
          {busy ? 'Working…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
