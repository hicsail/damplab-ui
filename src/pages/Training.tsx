import { useState } from 'react';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
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
  IconButton,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import SchoolIcon from '@mui/icons-material/School';
import DownloadIcon from '@mui/icons-material/Download';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { GET_TRAINING_RESOURCES, GET_TRAINING_RESOURCE_DOWNLOAD_URL } from '../gql/queries';
import { ATTACH_TRAINING_FILE, CREATE_TRAINING_FILE_UPLOAD_URL, CREATE_TRAINING_RESOURCE, DELETE_TRAINING_RESOURCE, UPDATE_TRAINING_RESOURCE } from '../gql/mutations';
import AudiencePicker from '../components/AudiencePicker';
import { ALL_AUDIENCES, AUDIENCE_LABELS } from '../constants/audience';
import { PERMISSIONS, usePermissions } from '../hooks/usePermissions';
import { formatSaveError } from '../utils/gqlError';

/**
 * The Learning Hub: PDFs an administrator uploads, each addressed to the access
 * tiers that may read it.
 *
 * This replaced a markdown editor built into the app. Writing documents in a browser
 * textarea was never what the lab wanted — they author elsewhere — so what is left is
 * the part that was missing: somewhere to put the file, and a say in who gets it.
 *
 * `training:read` is baseline, so everyone reaches this page. What differs is the
 * **rows**, and the server decides those from the caller's roles. The audience here
 * is authorization rather than presentation: a document outside your audience is not
 * merely hidden, its download URL is never minted for you.
 */

interface TrainingFile {
  filename: string;
  contentType: string;
  size: number;
}

interface TrainingResource {
  id: string;
  title: string;
  description: string;
  audienceRoles: string[];
  updatedAt?: string | null;
  updatedBy?: string | null;
  file?: TrainingFile | null;
  downloadUrl?: string | null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const EMPTY_FORM = { title: '', description: '', audienceRoles: ALL_AUDIENCES, file: null as File | null };

export default function Training() {
  const { can } = usePermissions();
  const canWrite = can(PERMISSIONS.TrainingWrite);
  const apolloClient = useApolloClient();

  const { data, loading, error, refetch } = useQuery(GET_TRAINING_RESOURCES, { fetchPolicy: 'cache-and-network' });
  const resources: TrainingResource[] = data?.trainingResources ?? [];

  const [createResource] = useMutation(CREATE_TRAINING_RESOURCE);
  const [updateResource] = useMutation(UPDATE_TRAINING_RESOURCE);
  const [createUploadUrl] = useMutation(CREATE_TRAINING_FILE_UPLOAD_URL);
  const [attachFile] = useMutation(ATTACH_TRAINING_FILE);
  const [deleteResource] = useMutation(DELETE_TRAINING_RESOURCE);

  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<TrainingResource | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', audienceRoles: ALL_AUDIENCES, file: null as File | null });
  const [pendingDelete, setPendingDelete] = useState<TrainingResource | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  /**
   * The upload half, shared by create and edit: presign, PUT straight to S3, then
   * record the metadata. The same three steps as job and bug attachments; the server
   * refuses to presign anything that is not a PDF within the size cap, so a rejected
   * file never reaches the bucket.
   */
  const uploadFileFor = async (resourceId: string, file: File) => {
    const presigned = await createUploadUrl({
      variables: { resourceId, file: { filename: file.name, contentType: file.type || 'application/octet-stream', size: file.size } }
    });
    const upload = presigned.data?.createTrainingFileUploadUrl;
    if (!upload) throw new Error('The server did not return an upload URL.');

    const response = await fetch(upload.uploadUrl, { method: 'PUT', headers: { 'Content-Type': upload.contentType }, body: file });
    if (!response.ok) throw new Error(`Upload failed for ${file.name}.`);

    await attachFile({
      variables: { resourceId, file: { filename: upload.filename, key: upload.key, contentType: upload.contentType, size: upload.size } }
    });
  };

  const handleUpload = async () => {
    if (!form.title.trim() || !form.file || form.audienceRoles.length === 0) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      const created = await createResource({
        variables: { input: { title: form.title.trim(), description: form.description.trim(), audienceRoles: form.audienceRoles } }
      });
      const id = created.data?.createTrainingResource?.id;
      if (!id) throw new Error('The document record was not created.');
      await uploadFileFor(id, form.file);
      setForm(EMPTY_FORM);
      await refetch();
    } catch (err) {
      console.error('Learning Hub upload failed:', err);
      setErrorMessage(formatSaveError(err, 'this document'));
    } finally {
      setBusy(false);
    }
  };

  const openEdit = (resource: TrainingResource) => {
    setEditing(resource);
    setEditForm({ title: resource.title, description: resource.description ?? '', audienceRoles: resource.audienceRoles ?? ALL_AUDIENCES, file: null });
  };

  const handleSaveEdit = async () => {
    if (!editing || editForm.audienceRoles.length === 0) return;
    setBusy(true);
    setErrorMessage(null);
    try {
      await updateResource({
        variables: { input: { id: editing.id, title: editForm.title.trim(), description: editForm.description.trim(), audienceRoles: editForm.audienceRoles } }
      });
      // Replacing the file is optional — most edits are a retitle or a change of
      // audience, and re-uploading to change a description would be absurd.
      if (editForm.file) await uploadFileFor(editing.id, editForm.file);
      setEditing(null);
      await refetch();
    } catch (err) {
      console.error('Learning Hub edit failed:', err);
      setErrorMessage(formatSaveError(err, 'this document'));
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    setErrorMessage(null);
    try {
      await deleteResource({ variables: { id: pendingDelete.id } });
      setPendingDelete(null);
      await refetch();
    } catch (err) {
      setErrorMessage(formatSaveError(err, 'this document'));
    }
  };

  /**
   * Ask for a fresh link rather than reusing the one from the list.
   *
   * The URL in the list response is short-lived, and a page left open past its expiry
   * would otherwise hand the reader a dead link. Re-fetching one link is much cheaper
   * than a list refetch, which would re-mint every other document's URL too.
   */
  const handleDownload = async (resource: TrainingResource) => {
    setErrorMessage(null);
    try {
      const { data: fresh } = await apolloClient.query({
        query: GET_TRAINING_RESOURCE_DOWNLOAD_URL,
        variables: { id: resource.id },
        fetchPolicy: 'network-only'
      });
      const url = fresh?.trainingResourceDownloadUrl ?? resource.downloadUrl;
      if (!url) throw new Error('No file is attached to this document yet.');
      window.open(url, '_blank', 'noopener');
    } catch (err) {
      setErrorMessage(formatSaveError(err, 'this download'));
    }
  };

  return (
    <Box sx={{ maxWidth: 1000, mx: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <SchoolIcon color="primary" />
        <Typography variant="h4">Learning Hub</Typography>
      </Stack>
      <Typography variant="body1" color="text.secondary">
        {canWrite
          ? 'Documents for using DAMPLab services. You are seeing every document, including ones addressed to other groups.'
          : 'Documents for using DAMPLab services.'}
      </Typography>

      {error && <Alert severity="error">Could not load the Learning Hub: {error.message}</Alert>}
      {errorMessage && (
        <Alert severity="error" onClose={() => setErrorMessage(null)}>
          {errorMessage}
        </Alert>
      )}

      {canWrite && (
        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Upload a document
          </Typography>
          <Stack spacing={2}>
            <TextField label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} fullWidth />
            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              multiline
              minRows={2}
              fullWidth
              helperText="A sentence or two on what this is and who it is for."
            />
            <AudiencePicker value={form.audienceRoles} onChange={(next) => setForm({ ...form, audienceRoles: next })} />
            <Stack direction="row" spacing={2} alignItems="center">
              <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} sx={{ textTransform: 'none' }}>
                Choose PDF
                {/* `accept` is a hint to the file picker and nothing more; the server
                    rejects a non-PDF before it mints an upload URL. */}
                <input type="file" accept="application/pdf" hidden onChange={(e) => setForm({ ...form, file: e.target.files?.[0] ?? null })} />
              </Button>
              <Typography variant="body2" color="text.secondary">
                {form.file ? `${form.file.name} (${formatSize(form.file.size)})` : 'No file chosen'}
              </Typography>
            </Stack>
            <Box>
              <Button variant="contained" onClick={handleUpload} disabled={busy || !form.title.trim() || !form.file || form.audienceRoles.length === 0}>
                {busy ? 'Uploading…' : 'Upload'}
              </Button>
            </Box>
          </Stack>
        </Paper>
      )}

      {loading && resources.length === 0 && <CircularProgress />}
      {!loading && resources.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {canWrite ? 'Nothing uploaded yet.' : 'No documents available to you yet.'}
        </Typography>
      )}

      {resources.map((resource) => (
        <Paper key={resource.id} variant="outlined" sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography variant="h6">{resource.title}</Typography>
              {resource.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                  {resource.description}
                </Typography>
              )}
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }} flexWrap="wrap" useFlexGap alignItems="center">
                {/* Readers see who else it went to as well. That is deliberate: "this
                    is the technicians' copy" is useful context, not a leak. */}
                {(resource.audienceRoles ?? []).map((audience) => (
                  <Chip key={audience} size="small" variant="outlined" label={AUDIENCE_LABELS[audience] ?? audience} />
                ))}
                {resource.file && (
                  <Typography variant="caption" color="text.secondary">
                    {resource.file.filename} · {formatSize(resource.file.size)}
                  </Typography>
                )}
                {!resource.file && <Chip size="small" color="warning" variant="outlined" label="No file attached" />}
              </Stack>
            </Box>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Button
                variant="outlined"
                size="small"
                startIcon={<DownloadIcon />}
                disabled={!resource.file}
                onClick={() => void handleDownload(resource)}
                sx={{ textTransform: 'none' }}
              >
                Download
              </Button>
              {canWrite && (
                <>
                  <Tooltip title="Edit title, description, audience or file">
                    <IconButton size="small" onClick={() => openEdit(resource)}>
                      <EditOutlinedIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Delete permanently">
                    <IconButton size="small" color="error" onClick={() => setPendingDelete(resource)}>
                      <DeleteOutlineIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              )}
            </Stack>
          </Stack>
        </Paper>
      ))}

      <Dialog open={!!editing} onClose={() => setEditing(null)} maxWidth="sm" fullWidth>
        <DialogTitle>Edit document</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} fullWidth />
            <TextField
              label="Description"
              value={editForm.description}
              onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
              multiline
              minRows={2}
              fullWidth
            />
            <AudiencePicker value={editForm.audienceRoles} onChange={(next) => setEditForm({ ...editForm, audienceRoles: next })} />
            <Stack direction="row" spacing={2} alignItems="center">
              <Button component="label" variant="outlined" startIcon={<UploadFileIcon />} sx={{ textTransform: 'none' }}>
                Replace PDF
                <input type="file" accept="application/pdf" hidden onChange={(e) => setEditForm({ ...editForm, file: e.target.files?.[0] ?? null })} />
              </Button>
              <Typography variant="body2" color="text.secondary">
                {editForm.file ? editForm.file.name : 'Keep the current file'}
              </Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditing(null)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit} disabled={busy || editForm.audienceRoles.length === 0 || !editForm.title.trim()}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!pendingDelete} onClose={() => setPendingDelete(null)}>
        <DialogTitle>Delete this document?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This removes {pendingDelete?.title} from the Learning Hub permanently. To restrict who sees it instead, edit
            its audience.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPendingDelete(null)}>Cancel</Button>
          <Button color="error" onClick={handleDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
