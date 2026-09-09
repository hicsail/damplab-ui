import React, { useEffect, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { BookingWindow, isOutsideWindow } from '../../utils/jobEquipmentBooking';

export interface BookingDialogItem {
  id: string;
  name: string;
  schedulable: boolean;
}

interface Props {
  open: boolean;
  title: string;
  window: BookingWindow;
  items: BookingDialogItem[];
  /** Set when editing: the item is fixed and the picker is hidden. */
  fixedItemId?: string;
  initialStart?: Date | null;
  initialEnd?: Date | null;
  initialNotes?: string;
  busy?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (values: { inventoryItemId: string; startTime: Date; endTime: Date; notes: string }) => void;
}

const HOUR_MS = 3_600_000;

/**
 * Book / edit dialog for a single equipment-use operation.
 *
 * Booking outside the estimated window is warned, never refused, here or on the
 * server — the lab bills actual hours, so drift between the estimate and the
 * schedule is expected rather than an error.
 */
export default function JobEquipmentBookingDialog({
  open,
  title,
  window: estimatedWindow,
  items,
  fixedItemId,
  initialStart,
  initialEnd,
  initialNotes,
  busy,
  error,
  onCancel,
  onConfirm
}: Props): React.JSX.Element {
  const schedulable = items.filter((i) => i.schedulable);
  const [itemId, setItemId] = useState('');
  const [start, setStart] = useState<Date | null>(null);
  const [end, setEnd] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');

  // Each opening starts from the caller's values, so an abandoned edit can never
  // be submitted against the next booking.
  useEffect(() => {
    if (!open) return;
    setItemId(fixedItemId ?? schedulable[0]?.id ?? '');
    setStart(initialStart ?? null);
    setEnd(initialEnd ?? null);
    setNotes(initialNotes ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /** End follows start by an hour until the user sets it themselves. */
  const pickStart = (value: Date | null): void => {
    setStart(value);
    if (value && (!end || end <= value)) setEnd(new Date(value.getTime() + HOUR_MS));
  };

  const invalid = !itemId || !start || !end || end <= start;
  const outside = !invalid && isOutsideWindow(estimatedWindow, start as Date, end as Date);

  return (
    <Dialog open={open} onClose={onCancel} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <LocalizationProvider dateAdapter={AdapterDateFns}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {!fixedItemId && schedulable.length > 1 && (
              <FormControl size="small" fullWidth>
                <InputLabel id="job-booking-item">Equipment</InputLabel>
                <Select labelId="job-booking-item" label="Equipment" value={itemId} onChange={(e) => setItemId(e.target.value)}>
                  {schedulable.map((i) => (
                    <MenuItem key={i.id} value={i.id}>
                      {i.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}
            <DateTimePicker label="Start" value={start} onChange={pickStart} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
            <DateTimePicker label="End" value={end} onChange={setEnd} slotProps={{ textField: { size: 'small', fullWidth: true } }} />
            <TextField size="small" fullWidth label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
            {outside && (
              <Alert severity="warning">
                This slot is outside the estimated window. You can still book it — the lab bills actual hours, so the estimate and the schedule are allowed to
                drift.
              </Alert>
            )}
            {end && start && end <= start && (
              <Typography variant="caption" color="error">
                The end time must be after the start time.
              </Typography>
            )}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        </LocalizationProvider>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button
          variant="contained"
          disabled={invalid || busy}
          onClick={() => onConfirm({ inventoryItemId: itemId, startTime: start as Date, endTime: end as Date, notes: notes.trim() })}
        >
          {busy ? 'Saving…' : 'Save booking'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
