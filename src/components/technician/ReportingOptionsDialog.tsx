import React from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';

export const REPORTING_OPTIONS_TEXT = [
  'If a screening result needs follow-up, contact your biosecurity representative about next steps.',
  'A job that cannot pass screening cannot be accepted in Canvas. Request changes or cancel it; any exception is handled outside Canvas.'
];

export default function ReportingOptionsDialog({ open, onClose }: { open: boolean; onClose: () => void }): React.JSX.Element {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Reporting options</DialogTitle>
      <DialogContent>
        {REPORTING_OPTIONS_TEXT.map((paragraph) => (
          <Typography key={paragraph} variant="body2" sx={{ mb: 1.5 }}>{paragraph}</Typography>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
