import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import CampaignIcon from '@mui/icons-material/Campaign';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import { GET_ALL_ANNOUNCEMENTS, GET_ANNOUNCEMENTS } from '../gql/queries';
import { CREATE_ANNOUNCEMENT, DELETE_ANNOUNCEMENT, UPDATE_ANNOUNCEMENT } from '../gql/mutations';
import Markdown from '../components/ReactMarkdown';
import AudiencePicker from '../components/AudiencePicker';
import { ALL_AUDIENCES, AUDIENCE_LABELS } from '../constants/audience';
import { PERMISSIONS, usePermissions } from '../hooks/usePermissions';
import { formatSaveError } from '../utils/gqlError';

/**
 * Announcements — one page for everyone, with the editing half gated.
 *
 * This used to be two routes: a read-only feed at `/announcements` and an editor at
 * `/edit_announcements` that rendered the same rows again with controls attached.
 * Two pages meant an administrator had to leave the page they were reading to change
 * what was on it, and the editor's own homepage button sat in a different section
 * from the feed's. One page, `announcements:write` gating the controls.
 *
 * **Two queries, not one filtered client-side.** A reader gets `announcements`, which
 * the server narrows to rows addressed to them; a writer gets `allAnnouncements`,
 * which is every row regardless of audience — the only way to review a notice you
 * targeted at someone else. Which one runs is decided by the permission, and the
 * unused one is skipped so a reader never 403s on the admin query.
 */

/** Both queries are refetched after a write: the admin table and whatever readers see. */
const REFETCH = [{ query: GET_ALL_ANNOUNCEMENTS }, { query: GET_ANNOUNCEMENTS }];

interface AnnouncementRow {
  id: string;
  text: string;
  timestamp: string;
  is_displayed: boolean;
  audienceRoles?: string[] | null;
}

/**
 * The audience chips for one row.
 *
 * An absent or empty list is a notice written before targeting existed, and means
 * everyone — say so rather than showing nothing, which reads as "no audience".
 */
function AudienceChips({ audienceRoles }: { audienceRoles?: string[] | null }) {
  const audiences = audienceRoles ?? [];
  if (audiences.length === 0) {
    return <Chip size="small" variant="outlined" label="Everyone" />;
  }
  return (
    <>
      {audiences.map((audience) => (
        <Chip key={audience} size="small" variant="outlined" label={AUDIENCE_LABELS[audience] ?? audience} />
      ))}
    </>
  );
}

export default function AnnouncementsFeed() {
  const { can } = usePermissions();
  const canWrite = can(PERMISSIONS.AnnouncementsWrite);

  const readerQuery = useQuery(GET_ANNOUNCEMENTS, { fetchPolicy: 'cache-and-network', skip: canWrite });
  const writerQuery = useQuery(GET_ALL_ANNOUNCEMENTS, { fetchPolicy: 'cache-and-network', skip: !canWrite });

  const { data, loading, error } = canWrite ? writerQuery : readerQuery;
  const announcements: AnnouncementRow[] = canWrite
    ? data?.allAnnouncements ?? []
    : // `is_displayed` is filtered server-side now, but a hidden row could still be
      // sitting in the Apollo cache from before it was hidden.
      (data?.announcements ?? []).filter((a: AnnouncementRow) => a?.is_displayed);

  const [createAnnouncement, { loading: creating }] = useMutation(CREATE_ANNOUNCEMENT, { refetchQueries: REFETCH });
  const [updateAnnouncement, { loading: updating }] = useMutation(UPDATE_ANNOUNCEMENT, { refetchQueries: REFETCH });
  const [deleteAnnouncement] = useMutation(DELETE_ANNOUNCEMENT, { refetchQueries: REFETCH });

  const [draft, setDraft] = useState('');
  const [draftAudience, setDraftAudience] = useState<string[]>(ALL_AUDIENCES);
  const [editing, setEditing] = useState<AnnouncementRow | null>(null);
  const [editText, setEditText] = useState('');
  const [editAudience, setEditAudience] = useState<string[]>(ALL_AUDIENCES);
  const [pendingDelete, setPendingDelete] = useState<AnnouncementRow | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const run = async (work: () => Promise<unknown>, noun: string) => {
    setErrorMessage(null);
    try {
      await work();
      return true;
    } catch (err) {
      console.error(`${noun} failed:`, err);
      setErrorMessage(formatSaveError(err, noun));
      return false;
    }
  };

  const handleCreate = async () => {
    if (!draft.trim() || draftAudience.length === 0) return;
    const ok = await run(
      () => createAnnouncement({ variables: { input: { text: draft, is_displayed: true, audienceRoles: draftAudience } } }),
      'this announcement'
    );
    if (ok) {
      setDraft('');
      setDraftAudience(ALL_AUDIENCES);
    }
  };

  const openEdit = (row: AnnouncementRow) => {
    setEditing(row);
    setEditText(row.text ?? '');
    // A legacy row carries no audience, which means everyone — show that as all four
    // checked, so re-saving it does not accidentally narrow the notice.
    setEditAudience((row.audienceRoles ?? []).length > 0 ? row.audienceRoles! : ALL_AUDIENCES);
  };

  const handleSaveEdit = async () => {
    if (!editing || editAudience.length === 0) return;
    // Sent explicitly, never coerced to `undefined`. On an update `undefined` means
    // "leave unchanged", which is why widening a targeted notice back to everyone
    // used to be impossible through this dialog.
    const ok = await run(
      () => updateAnnouncement({ variables: { input: { id: editing.id, text: editText, audienceRoles: editAudience } } }),
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
    <Stack spacing={3} sx={{ maxWidth: canWrite ? 900 : 800, mx: 'auto', p: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center">
        <CampaignIcon color="primary" />
        <Typography variant="h2">Announcements</Typography>
      </Stack>

      {canWrite && (
        <Typography variant="body1" color="text.secondary">
          You are seeing <strong>every</strong> announcement, including ones addressed to other groups and ones you have
          hidden. The newest visible announcement also appears on the home page. Markdown is supported.
        </Typography>
      )}

      {error && <Alert severity="error">Could not load announcements: {error.message}</Alert>}
      {!!errorMessage && (
        <Alert severity="error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {canWrite && (
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
          <Button variant="contained" onClick={handleCreate} disabled={creating || !draft.trim() || draftAudience.length === 0} sx={{ mt: 2 }}>
            {creating ? 'Posting…' : 'Post announcement'}
          </Button>
        </Paper>
      )}

      {canWrite && <Divider />}
      {canWrite && <Typography variant="h6">All announcements</Typography>}

      {loading && announcements.length === 0 && <CircularProgress />}

      {!loading && announcements.length === 0 && (
        <Typography variant="body1" color="text.secondary">
          {canWrite ? 'None yet.' : 'No announcements right now.'}
        </Typography>
      )}

      {announcements.map((row) => (
        <Paper key={row.id ?? row.timestamp} variant="outlined" sx={{ p: canWrite ? 2 : 3, opacity: row.is_displayed ? 1 : 0.6 }}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }} flexWrap="wrap" useFlexGap>
                <Typography variant="caption" color="text.secondary">
                  {new Date(row.timestamp).toLocaleString()}
                </Typography>
                {canWrite && (row.is_displayed ? <Chip size="small" color="success" label="Visible" /> : <Chip size="small" label="Hidden" />)}
                {/* Readers see chips only on a targeted notice — an untargeted one is
                    for everyone, and saying so on every row would be noise. A writer
                    sees them on every row, because "who did this go to" is the
                    question the editor exists to answer. */}
                {canWrite ? <AudienceChips audienceRoles={row.audienceRoles} /> : (row.audienceRoles ?? []).length > 0 && <AudienceChips audienceRoles={row.audienceRoles} />}
              </Stack>
              {!canWrite && <Divider sx={{ mb: 2 }} />}
              <Markdown>{row.text}</Markdown>
            </Box>
            {canWrite && (
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
            )}
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
          <Button variant="contained" onClick={handleSaveEdit} disabled={updating || editAudience.length === 0}>
            {updating ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!pendingDelete} onClose={() => setPendingDelete(null)}>
        <DialogTitle>Delete this announcement?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This removes it permanently. To take it off the home page while keeping it, hide it instead.
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
