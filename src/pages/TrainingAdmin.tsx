import { useEffect, useState } from 'react';
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
  FormControlLabel,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { CREATE_GUIDE, DELETE_GUIDE, UPDATE_GUIDE } from '../gql/mutations';
import { GET_GUIDES, GET_GUIDES_WITH_BODIES } from '../gql/queries';
import Markdown from '../components/ReactMarkdown';
import { formatSaveError } from '../utils/gqlError';

/**
 * The Learning Hub editor: list on the left, markdown + live preview on the right.
 *
 * Note this is **not** `TrainingAdminEdit.tsx`, which despite its name was a guide
 * *about* admin editing rather than an editor. That page's content became a seed
 * document; this is the CRUD screen.
 */

const REFETCH = [{ query: GET_GUIDES_WITH_BODIES }, { query: GET_GUIDES }];

interface GuideRow {
  id: string;
  title: string;
  slug: string;
  category?: string | null;
  body?: string | null;
  order?: number | null;
  isPublished?: boolean | null;
}

export default function TrainingAdmin() {
  const { data, loading } = useQuery(GET_GUIDES_WITH_BODIES, { fetchPolicy: 'cache-and-network' });
  const guides: GuideRow[] = data?.guides ?? [];

  const [createGuide, { loading: creating }] = useMutation(CREATE_GUIDE, { refetchQueries: REFETCH });
  const [updateGuide, { loading: saving }] = useMutation(UPDATE_GUIDE, { refetchQueries: REFETCH });
  const [deleteGuide] = useMutation(DELETE_GUIDE, { refetchQueries: REFETCH });

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', slug: '', category: '', body: '', order: '0', isPublished: false });
  const [pendingDelete, setPendingDelete] = useState<GuideRow | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const selected = guides.find((g) => g.id === selectedId) ?? null;

  // Hydrate the form when the selection changes — not on every render of the same
  // guide, or typing would be overwritten by each refetch.
  useEffect(() => {
    if (!selected) return;
    setForm({
      title: selected.title ?? '',
      slug: selected.slug ?? '',
      category: selected.category ?? '',
      body: selected.body ?? '',
      order: String(selected.order ?? 0),
      isPublished: !!selected.isPublished
    });
  }, [selectedId]);

  useEffect(() => {
    if (!selectedId && guides.length > 0) setSelectedId(guides[0].id);
  }, [guides, selectedId]);

  const run = async (work: () => Promise<unknown>) => {
    setErrorMessage(null);
    try {
      await work();
      return true;
    } catch (error) {
      console.error('Guide save failed:', error);
      setErrorMessage(formatSaveError(error, 'this guide'));
      return false;
    }
  };

  const handleCreate = async () => {
    const ok = await run(async () => {
      const result = await createGuide({ variables: { input: { title: 'Untitled guide', category: 'General', body: '', isPublished: false } } });
      setSelectedId(result.data?.createGuide?.id ?? null);
    });
    if (ok) setSavedAt(new Date().toLocaleTimeString());
  };

  const handleSave = async () => {
    if (!selected) return;
    const parsedOrder = Number(form.order);
    const ok = await run(() =>
      updateGuide({
        variables: {
          input: {
            id: selected.id,
            title: form.title,
            slug: form.slug,
            category: form.category,
            body: form.body,
            order: Number.isFinite(parsedOrder) ? Math.trunc(parsedOrder) : 0,
            isPublished: form.isPublished
          }
        }
      })
    );
    if (ok) setSavedAt(new Date().toLocaleTimeString());
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    const ok = await run(() => deleteGuide({ variables: { id: pendingDelete.id } }));
    if (ok) {
      if (selectedId === pendingDelete.id) setSelectedId(null);
      setPendingDelete(null);
    }
  };

  return (
    <Stack spacing={3} sx={{ maxWidth: 1300, mx: 'auto', p: 3 }}>
      <Stack direction="row" alignItems="center" spacing={2}>
        <Typography variant="h2">Manage guides</Typography>
        <Box sx={{ flex: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} disabled={creating}>
          New guide
        </Button>
      </Stack>

      {!!errorMessage && (
        <Alert severity="error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '280px 1fr' }, gap: 3, alignItems: 'start' }}>
        <Paper variant="outlined" sx={{ maxHeight: '70vh', overflow: 'auto' }}>
          {loading && guides.length === 0 && <CircularProgress sx={{ m: 2 }} />}
          <List dense disablePadding>
            {guides.map((guide) => (
              <ListItemButton key={guide.id} selected={guide.id === selectedId} onClick={() => setSelectedId(guide.id)}>
                <ListItemText
                  primary={guide.title}
                  secondary={guide.category || 'General'}
                  primaryTypographyProps={{ noWrap: true }}
                />
                {guide.isPublished === false && <Chip size="small" label="Draft" sx={{ mr: 1 }} />}
                <Tooltip title="Delete this guide">
                  <IconButton
                    size="small"
                    color="error"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPendingDelete(guide);
                    }}
                  >
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </ListItemButton>
            ))}
          </List>
          {!loading && guides.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              No guides yet.
            </Typography>
          )}
        </Paper>

        {selected ? (
          <Stack spacing={2}>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2 }}>
              <TextField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <TextField label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} helperText="Groups the guide on the Learning Hub." />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2 }}>
              <TextField label="URL slug" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} helperText={`Reachable at /training/${form.slug || '…'}. Changing it breaks existing links.`} />
              <TextField label="Order" type="number" value={form.order} onChange={(e) => setForm({ ...form, order: e.target.value })} helperText="Position within its category." />
            </Box>

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 1fr' }, gap: 2 }}>
              <TextField
                label="Body (Markdown)"
                value={form.body}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                multiline
                minRows={18}
                helperText="Images go in as external URLs — ![alt](https://…). There is no upload here, so a moved or access-restricted source will break the image."
              />
              <Paper variant="outlined" sx={{ p: 2, maxHeight: '60vh', overflow: 'auto' }}>
                <Typography variant="caption" color="text.secondary">
                  Preview
                </Typography>
                <Markdown>{form.body}</Markdown>
              </Paper>
            </Box>

            <Stack direction="row" spacing={2} alignItems="center">
              <FormControlLabel
                control={<Checkbox checked={form.isPublished} onChange={(e) => setForm({ ...form, isPublished: e.target.checked })} />}
                label="Published"
              />
              <Typography variant="body2" color="text.secondary">
                A draft is visible only to people who can edit guides.
              </Typography>
              <Box sx={{ flex: 1 }} />
              {savedAt && (
                <Typography variant="caption" color="text.secondary">
                  Saved at {savedAt}
                </Typography>
              )}
              <Button variant="contained" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving…' : 'Save guide'}
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Typography variant="body2" color="text.secondary">
            Select a guide, or create one.
          </Typography>
        )}
      </Box>

      <Dialog open={!!pendingDelete} onClose={() => setPendingDelete(null)}>
        <DialogTitle>Delete “{pendingDelete?.title}”?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This removes it permanently. To take it off the Learning Hub while keeping
            it, untick <strong>Published</strong> instead.
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
