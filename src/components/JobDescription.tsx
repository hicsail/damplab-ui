import { useState } from 'react';
import { Box, Button, IconButton, TextField, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { JOB_DESCRIPTION_MAX_LENGTH } from '../utils/jobMembers';

interface Props {
  description?: string | null;
  /** Presentation only — setJobDescription re-checks membership / jobs:view-all. */
  canEdit: boolean;
  onSave: (next: string | null) => Promise<void>;
}

/** The job's short description, directly under the sticky header, outside every card. */
export default function JobDescription({ description, canEdit, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const current = description?.trim() ?? '';

  const start = () => { setDraft(current); setEditing(true); };
  const save = async () => {
    setSaving(true);
    try {
      await onSave(draft.trim() ? draft.trim() : null);
      setEditing(false);
    } catch {
      // The caller surfaces the error; stay in edit mode so nothing typed is lost.
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <Box sx={{ mb: 2 }}>
        <TextField
          fullWidth
          multiline
          minRows={2}
          label="Description"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          inputProps={{ maxLength: JOB_DESCRIPTION_MAX_LENGTH }}
          helperText={`${draft.length}/${JOB_DESCRIPTION_MAX_LENGTH}`}
          autoFocus
        />
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button variant="contained" size="small" onClick={() => void save()} disabled={saving} sx={{ textTransform: 'none' }}>{saving ? 'Saving…' : 'Save'}</Button>
          <Button size="small" onClick={() => setEditing(false)} disabled={saving} sx={{ textTransform: 'none' }}>Cancel</Button>
        </Box>
      </Box>
    );
  }

  if (current) {
    return (
      <Box sx={{ mb: 2, display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>{current}</Typography>
        {canEdit && (
          <IconButton size="small" aria-label="Edit description" onClick={start}>
            <EditIcon fontSize="small" />
          </IconButton>
        )}
      </Box>
    );
  }

  if (!canEdit) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Button size="small" startIcon={<EditIcon fontSize="small" />} onClick={start} sx={{ textTransform: 'none' }}>Add a description</Button>
    </Box>
  );
}
