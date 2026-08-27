import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { useState } from 'react';
import { CREATE_ANNOUNCEMENT, DELETE_ANNOUNCEMENT, UPDATE_ANNOUNCEMENT } from '../gql/mutations';
import { GET_ALL_ANNOUNCEMENTS, GET_ANNOUNCEMENTS } from '../gql/queries';
import Markdown from '../components/ReactMarkdown';
import { formatSaveError } from '../utils/gqlError';
import { AUDIENCE_LABELS, AUDIENCE_OPTIONS } from './AnnouncementsFeed';

/**
 * The announcements editor: every announcement, with edit / show-hide / delete and
 * an audience picker.
 *
 * It used to be a single "current announcement" box — create one, or hide the
 * newest — with no way to edit text, reach an older one, or delete anything,
 * because the type had no id and `timestamp` was the de facto key.
 */

/** Both queries are refetched: the admin table and whatever the reader sees. */
const REFETCH = [{ query: GET_ALL_ANNOUNCEMENTS }, { query: GET_ANNOUNCEMENTS }];

interface AnnouncementRow {
  id: string;
  text: string;
  timestamp: string;
  is_displayed: boolean;
  audienceRoles?: string[] | null;
}

function AudiencePicker({ value, onChange }: { value: string[]; onChange: (next: string[]) => void }) {
  const toggle = (audience: string) => onChange(value.includes(audience) ? value.filter((a) => a !== audience) : [...value, audience]);

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
        Audience
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Leave every box unchecked to address everyone. Clients are the floor, so
        checking Clients also reaches technicians, equipment users and administrators.
      </Typography>
      <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
        {AUDIENCE_OPTIONS.map((audience) => (
          <FormControlLabel
            key={audience}
            control={<Checkbox size="small" checked={value.includes(audience)} onChange={() => toggle(audience)} />}
            label={AUDIENCE_LABELS[audience]}
          />
        ))}
      </Stack>
    </Box>
  );
}

export default function Announcements() {
  const { data, loading } = useQuery(GET_ALL_ANNOUNCEMENTS, { fetchPolicy: 'cache-and-network' });
  const rows: AnnouncementRow[] = data?.allAnnouncements ?? [];

  const [createAnnouncement, { loading: creating }] = useMutation(CREATE_ANNOUNCEMENT, { refetchQueries: REFETCH });
  const [updateAnnouncement, { loading: updating }] = useMutation(UPDATE_ANNOUNCEMENT, { refetchQueries: REFETCH });
  const [deleteAnnouncement] = useMutation(DELETE_ANNOUNCEMENT, { refetchQueries: REFETCH });

  const [draft, setDraft] = useState('');
  const [draftAudience, setDraftAudience] = useState<string[]>([]);
  const [editing, setEditing] = useState<AnnouncementRow | null>(null);
  const [editText, setEditText] = useState('');
  const [editAudience, setEditAudience] = useState<string[]>([]);
  const [pendingDelete, setPendingDelete] = useState<AnnouncementRow | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const run = async (work: () => Promise<unknown>, noun: string) => {
    setErrorMessage(null);
    try {
      await work();
      return true;
    } catch (error) {
      console.error(`${noun} failed:`, error);
      setErrorMessage(formatSaveError(error, noun));
      return false;
    }
  };

  const handleCreate = async () => {
    if (!draft.trim()) return;
    const ok = await run(
      () =>
        createAnnouncement({
          variables: {
            input: {
              text: draft,
              is_displayed: true,
              // Omit rather than send [] — the server rejects an empty list,
              // because on a stored row empty means "everyone".
              audienceRoles: draftAudience.length > 0 ? draftAudience : undefined
            }
          }
        }),
      'this announcement'
    );
    if (ok) {
      setDraft('');
      setDraftAudience([]);
    }
  };

  const openEdit = (row: AnnouncementRow) => {
    setEditing(row);
    setEditText(row.text ?? '');
    setEditAudience(row.audienceRoles ?? []);
  };

  const handleSaveEdit = async () => {
    if (!editing) return;
    const ok = await run(
      () =>
        updateAnnouncement({
          variables: {
            input: {
              id: editing.id,
              text: editText,
              audienceRoles: editAudience.length > 0 ? editAudience : undefined
            }
          }
        }),
      'this announcement'
    );
    if (ok) setEditing(null);
  };

  const handleToggleVisible = (row: AnnouncementRow) =>
    run(() => updateAnnouncement({ variables: { input: { id: row.id, is_displayed: !row.is_displayed } } }), 'this announcement');

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const ok = await run(() => deleteAnnouncement({ variables: { id: pendingDelete.id } }), 'this announcement');
    if (ok) setPendingDelete(null);
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      <Typography variant="h2">Announcements</Typography>
      <Typography variant="body1" color="text.secondary">
        The newest visible announcement appears on the home page; every visible one is
        listed at <strong>/announcements</strong>. Markdown is supported.
      </Typography>

      {!!errorMessage && <Alert severity="error" onClose={() => setErrorMessage(null)}>{errorMessage}</Alert>}

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          New announcement
        </Typography>
        <TextField label="Text (Markdown)" value={draft} onChange={(e) => setDraft(e.target.value)} multiline minRows={4} fullWidth sx={{ mb: 2 }} />
        {draft.trim() && (
          <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Preview
            </Typography>
            <Markdown>{draft}</Markdown>
          </Box>
        )}
        <AudiencePicker value={draftAudience} onChange={setDraftAudience} />
        <Button variant="contained" onClick={handleCreate} disabled={creating || !draft.trim()} sx={{ mt: 2 }}>
          {creating ? 'Posting…' : 'Post announcement'}
        </Button>
      </Paper>

      <Divider />

      <Typography variant="h6">All announcements</Typography>
      {loading && rows.length === 0 && <CircularProgress />}
      {!loading && rows.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          None yet.
        </Typography>
      )}

      {rows.map((row) => (
        <Paper key={row.id} variant="outlined" sx={{ p: 2, opacity: row.is_displayed ? 1 : 0.6 }}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                <Typography variant="caption" color="text.secondary">
                  {new Date(row.timestamp).toLocaleString()}
                </Typography>
                {row.is_displayed ? <Chip size="small" color="success" label="Visible" /> : <Chip size="small" label="Hidden" />}
                {(row.audienceRoles ?? []).length === 0 ? (
                  <Chip size="small" variant="outlined" label="Everyone" />
                ) : (
                  row.audienceRoles!.map((audience) => <Chip key={audience} size="small" variant="outlined" label={AUDIENCE_LABELS[audience] ?? audience} />)
                )}
              </Stack>
              <Markdown>{row.text}</Markdown>
            </Box>
            <Stack direction="row" spacing={0.5}>
              <Tooltip title={row.is_displayed ? 'Hide from readers' : 'Show to readers'}>
                <span>
                  <IconButton size="small" disabled={updating} onClick={() => handleToggleVisible(row)}>
                    {row.is_displayed ? <VisibilityIcon fontSize="small" /> : <VisibilityOffIcon fontSize="small" />}
                  </IconButton>
                </span>
              </Tooltip>
              <Tooltip title="Edit text and audience">
                <IconButton size="small" onClick={() => openEdit(row)}>
                  <EditOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Delete permanently">
                <IconButton size="small" color="error" onClick={() => setPendingDelete(row)}>
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Stack>
          </Stack>
        </Paper>
      ))}

      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="md" fullWidth>
        <DialogTitle>Edit announcement</DialogTitle>
        <DialogContent dividers>
          <TextField label="Text (Markdown)" value={editText} onChange={(e) => setEditText(e.target.value)} multiline minRows={5} fullWidth sx={{ mb: 2, mt: 1 }} />
          <Box sx={{ mb: 2, p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            <Typography variant="caption" color="text.secondary">
              Preview
            </Typography>
            <Markdown>{editText}</Markdown>
          </Box>
          <AudiencePicker value={editAudience} onChange={setEditAudience} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={updating}>
            {updating ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!pendingDelete} onClose={() => setPendingDelete(null)}>
        <DialogTitle>Delete this announcement?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This removes it permanently. To take it off the home page while keeping it,
            hide it instead.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
