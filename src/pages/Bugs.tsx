import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@apollo/client';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Link,
  List,
  ListItem,
  ListItemText,
  Stack,
  TextField,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
  Alert
} from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

import { GET_BUG_REPORTS } from '../gql/queries';
import { ADD_BUG_ATTACHMENTS, CREATE_BUG_ATTACHMENT_UPLOAD_URLS, CREATE_BUG_REPORT } from '../gql/mutations';

interface BugAttachmentUpload {
  filename: string;
  uploadUrl: string;
  key: string;
  contentType: string;
  size: number;
}

interface BugReportItem {
  id: string;
  description: string;
  reporterName?: string | null;
  reporterEmail?: string | null;
  createdAt: string;
  attachments?: { filename?: string | null; url?: string | null }[] | null;
}

export default function Bugs() {
  const [searchText, setSearchText] = useState('');
  const [reporterFilter, setReporterFilter] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newDescription, setNewDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, loading, refetch } = useQuery(GET_BUG_REPORTS, {
    variables: {
      filter: {
        searchText: searchText || null,
        reporter: reporterFilter || null
      }
    },
    fetchPolicy: 'network-only'
  });

  const [createBugReport] = useMutation(CREATE_BUG_REPORT);
  const [createBugAttachmentUploadUrls] = useMutation(CREATE_BUG_ATTACHMENT_UPLOAD_URLS);
  const [addBugAttachments] = useMutation(ADD_BUG_ATTACHMENTS);

  const bugs: BugReportItem[] = useMemo(() => data?.bugReports?.items ?? [], [data]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFiles(Array.from(event.target.files));
    }
  };

  const handleOpenDialog = () => {
    setNewDescription('');
    setFiles([]);
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    if (!isSubmitting) {
      setIsDialogOpen(false);
    }
  };

  const handleSubmitBug = async () => {
    if (!newDescription.trim()) {
      setSnackbar({ open: true, message: 'Description is required.', severity: 'error' });
      return;
    }

    setIsSubmitting(true);
    try {
      const createResult = await createBugReport({
        variables: {
          input: {
            description: newDescription.trim()
          }
        }
      });

      const bugId = createResult.data?.createBugReport?.id;
      if (!bugId) {
        throw new Error('Bug report was not created successfully.');
      }

      if (files.length > 0) {
        const uploadMetaResult = await createBugAttachmentUploadUrls({
          variables: {
            bugId,
            files: files.map((file) => ({
              filename: file.name,
              contentType: file.type || 'application/octet-stream',
              size: file.size
            }))
          }
        });

        const uploads: BugAttachmentUpload[] = uploadMetaResult.data?.createBugAttachmentUploadUrls ?? [];

        for (const upload of uploads) {
          const matchingFile = files.find((f) => f.name === upload.filename && f.size === upload.size);
          if (!matchingFile) continue;

          const response = await fetch(upload.uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': upload.contentType
            },
            body: matchingFile
          });

          if (!response.ok) {
            throw new Error(`Failed to upload attachment: ${upload.filename}`);
          }
        }

        await addBugAttachments({
          variables: {
            bugId,
            attachments: uploads.map((u) => ({
              filename: u.filename,
              key: u.key,
              contentType: u.contentType,
              size: u.size
            }))
          }
        });
      }

      setSnackbar({ open: true, message: 'Bug report submitted.', severity: 'success' });
      setIsDialogOpen(false);
      setNewDescription('');
      setFiles([]);
      await refetch();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to submit bug report', err);
      setSnackbar({ open: true, message: 'Failed to submit bug report. Please try again.', severity: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRefresh = () => {
    refetch();
  };

  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    refetch({
      filter: {
        searchText: searchText || null,
        reporter: reporterFilter || null
      }
    });
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: 'auto', p: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <BugReportIcon color="primary" />
        <Typography variant="h4">Bugs & Issues</Typography>
        <Chip label="Shared by all users" size="small" sx={{ ml: 1 }} />
      </Box>
      <Typography variant="body1" color="text.secondary">
        Browse and report bugs encountered in the DAMPLab app. Use the search and reporter filters to see if an issue has already been reported.
      </Typography>

      <Card>
        <CardContent>
          <Box
            component="form"
            onSubmit={handleSearchSubmit}
            sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, alignItems: 'flex-end' }}
          >
            <TextField
              label="Search description"
              variant="outlined"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              fullWidth
              InputProps={{
                endAdornment: <SearchIcon fontSize="small" color="action" />
              }}
            />
            <TextField
              label="Reporter (email or name)"
              variant="outlined"
              value={reporterFilter}
              onChange={(e) => setReporterFilter(e.target.value)}
              fullWidth
            />
            <Stack direction="row" spacing={1}>
              <Button type="submit" variant="contained">
                Apply filters
              </Button>
              <IconButton aria-label="Refresh" onClick={handleRefresh}>
                <RefreshIcon />
              </IconButton>
            </Stack>
          </Box>
        </CardContent>
      </Card>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">Reported bugs</Typography>
        <Button variant="contained" startIcon={<BugReportIcon />} onClick={handleOpenDialog}>
          Report a bug
        </Button>
      </Box>

      <Card>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : bugs.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No bugs found for the current filters. Try broadening your search or submit a new bug report.
            </Typography>
          ) : (
            <List>
              {bugs.map((bug) => {
                const reporterLabel =
                  bug.reporterEmail || bug.reporterName
                    ? `${bug.reporterName ?? ''}${bug.reporterName && bug.reporterEmail ? ' · ' : ''}${bug.reporterEmail ?? ''}`
                    : 'Unknown reporter';
                const created = new Date(bug.createdAt).toLocaleString();
                const hasAttachments = (bug.attachments ?? []).length > 0;
                return (
                  <ListItem key={bug.id} alignItems="flex-start" divider>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                            {bug.description.length > 160 ? `${bug.description.slice(0, 160)}…` : bug.description}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {reporterLabel} · {created}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        hasAttachments ? (
                          <Box sx={{ mt: 0.5, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                            {(bug.attachments ?? []).map((att, index) =>
                              att?.url ? (
                                <Box
                                  key={`${bug.id}-att-${index}`}
                                  sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    gap: 0.5
                                  }}
                                >
                                  <Box
                                    component="img"
                                    src={att.url}
                                    alt={att.filename || 'Bug attachment'}
                                    sx={{
                                      maxWidth: 160,
                                      maxHeight: 120,
                                      objectFit: 'cover',
                                      borderRadius: 1,
                                      border: '1px solid',
                                      borderColor: 'divider'
                                    }}
                                  />
                                  <Link
                                    href={att.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    underline="hover"
                                  >
                                    {att.filename || 'Open attachment'}
                                  </Link>
                                </Box>
                              ) : null
                            )}
                          </Box>
                        ) : undefined
                      }
                    />
                  </ListItem>
                );
              })}
            </List>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>Report a bug</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2}>
            <TextField
              label="Description"
              placeholder="Describe what you were doing, what you expected, and what went wrong."
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              multiline
              minRows={4}
              required
              fullWidth
            />
            <Box>
              <Button component="label" variant="outlined" startIcon={<CloudUploadIcon />}>
                Attach screenshots (optional)
                <input type="file" accept="image/*" hidden multiple onChange={handleFileChange} />
              </Button>
              {files.length > 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  {files.length} file{files.length > 1 ? 's' : ''} selected
                </Typography>
              )}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmitBug} variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Submitting…' : 'Submit bug'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleSnackbarClose}>
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

