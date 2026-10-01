import { useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, List, ListItem, ListItemText, TextField } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { EMAIL_PATTERN, normalizeEmail } from '../utils/jobMembers';

interface ListProps {
  primaryEmail: string;
  memberEmails: string[];
  onRemove: (email: string) => Promise<void>;
  busyEmail: string | null;
}

/** The people on a job. The primary has no remove control — the server refuses it too. */
export function JobMembersList({ primaryEmail, memberEmails, onRemove, busyEmail }: ListProps) {
  return (
    <List dense>
      <ListItem sx={{ pl: 0 }}>
        <ListItemText primary={primaryEmail || '—'} />
        <Chip size="small" label="Primary" />
      </ListItem>
      {memberEmails.map((email) => (
        <ListItem
          key={email}
          sx={{ pl: 0 }}
          secondaryAction={
            <IconButton edge="end" aria-label={`Remove ${email}`} disabled={busyEmail !== null} onClick={() => void onRemove(email)}>
              {busyEmail === email ? <CircularProgress size={16} /> : <DeleteOutlineIcon fontSize="small" />}
            </IconButton>
          }
        >
          <ListItemText primary={email} />
        </ListItem>
      ))}
    </List>
  );
}

interface Props {
  open: boolean;
  primaryEmail: string;
  memberEmails: string[];
  onAdd: (email: string) => Promise<void>;
  onRemove: (email: string) => Promise<void>;
  onClose: () => void;
  error?: string | null;
}

export default function ManageJobMembersDialog({ open, primaryEmail, memberEmails, onAdd, onRemove, onClose, error }: Props) {
  const [draft, setDraft] = useState('');
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const email = normalizeEmail(draft);
  const invalid = email !== '' && !EMAIL_PATTERN.test(email);

  const run = async (target: string, action: () => Promise<void>) => {
    setBusyEmail(target);
    try {
      await action();
      if (target === email) setDraft('');
    } catch {
      // Shown through `error`.
    } finally {
      setBusyEmail(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>People on this job</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        <JobMembersList primaryEmail={primaryEmail} memberEmails={memberEmails} busyEmail={busyEmail} onRemove={(target) => run(target, () => onRemove(target))} />
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-start', mt: 1 }}>
          <TextField
            size="small"
            fullWidth
            label="Add by email"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            error={invalid}
            helperText={invalid ? 'Enter a valid email address.' : 'They get the same access as the primary client, whether or not they have an account yet.'}
          />
          <Button variant="contained" disabled={!email || invalid || busyEmail !== null} onClick={() => void run(email, () => onAdd(email))} sx={{ textTransform: 'none' }}>
            Add
          </Button>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: 'none' }}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}
