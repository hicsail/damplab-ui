import { useEffect, useState } from 'react';
import { Box, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, Stack, Typography } from '@mui/material';

export interface FieldPickerDialogProps {
  open: boolean;
  title: string;
  fields: ReadonlyArray<{ key: string; label: string }>;
  note?: string;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: (selectedKeys: string[]) => void;
}

/** "Which columns?" before a download. Every field starts ticked; the file keeps the listed order. */
export function FieldPickerDialog({ open, title, fields, note, confirmLabel = 'Download', onCancel, onConfirm }: FieldPickerDialogProps) {
  const [selected, setSelected] = useState<Set<string>>(() => new Set(fields.map((f) => f.key)));

  useEffect(() => {
    if (open) setSelected(new Set(fields.map((f) => f.key)));
  }, [open, fields]);

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <Dialog open={open} onClose={onCancel} maxWidth='sm' fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1}>
          {note && <Typography variant='body2' color='text.secondary'>{note}</Typography>}
          <Stack direction='row' spacing={1}>
            <Button size='small' onClick={() => setSelected(new Set(fields.map((f) => f.key)))}>Select all</Button>
            <Button size='small' onClick={() => setSelected(new Set())}>Select none</Button>
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            {fields.map((field) => (
              <FormControlLabel key={field.key} control={<Checkbox size='small' checked={selected.has(field.key)} onChange={() => toggle(field.key)} />} label={field.label} />
            ))}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant='contained' disabled={selected.size === 0} onClick={() => onConfirm(fields.filter((f) => selected.has(f.key)).map((f) => f.key))}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
