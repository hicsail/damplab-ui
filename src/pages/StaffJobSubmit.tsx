import React, { useContext, useMemo, useState } from 'react';
import { useApolloClient } from '@apollo/client';
import { Navigate, useNavigate } from 'react-router';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  Snackbar,
  TextField,
  Typography,
} from '@mui/material';

import { CanvasContext } from '../contexts/Canvas';
import { UserContext, UserContextProps } from '../contexts/UserContext';
import { getWorkflowsFromGraph } from '../controllers/GraphHelpers';
import { submitCanvasJob } from '../utils/canvasJobSubmission';

const CANVAS_AUTOSAVE_KEY = 'canvas:autosave';

function buildStaffNotes(clientName: string, clientEmail: string, notes: string): string {
  const trimmedName = clientName.trim();
  const trimmedEmail = clientEmail.trim();
  const header =
    trimmedEmail !== ''
      ? `Client contact: ${trimmedName} <${trimmedEmail}>`
      : trimmedName !== ''
        ? `Client: ${trimmedName}`
        : '';
  const body = notes.trim();
  if (header && body) return `${header}\n\n${body}`;
  return header || body;
}

export default function StaffJobSubmit() {
  const val = useContext(CanvasContext);
  const navigate = useNavigate();
  const apolloClient = useApolloClient();
  const userContext: UserContextProps = useContext(UserContext);
  const userProps = userContext.userProps;

  const workflows = useMemo(
    () => getWorkflowsFromGraph(val.nodes, val.edges) || [],
    [val.nodes, val.edges]
  );

  const [formData, setFormData] = useState({
    jobName: '',
    clientName: '',
    clientEmail: '',
    institute: '',
    notes: '',
  });
  const [touched, setTouched] = useState({
    jobName: false,
    clientName: false,
    institute: false,
  });
  const [attachments, setAttachments] = useState<File[]>([]);
  const [jobLoading, setJobLoading] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [successDialogOpen, setSuccessDialogOpen] = useState(false);
  const [lastSubmittedJob, setLastSubmittedJob] = useState<{ id: string; jobId?: string } | null>(null);

  if (!userProps?.isDamplabStaff) {
    return <Navigate to="/checkout" replace />;
  }

  const handleInputChange =
    (field: keyof typeof formData) => (e: React.ChangeEvent<HTMLInputElement>) => {
      setFormData((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleBlur = (field: keyof typeof touched) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    setAttachments(Array.from(files));
  };

  const isFormValid = () =>
    formData.jobName.trim() !== '' &&
    formData.institute.trim() !== '' &&
    formData.clientName.trim() !== '';

  const handleSubmit = async () => {
    if (!isFormValid() || workflows.length === 0) return;

    try {
      setJobLoading(true);
      const notes = buildStaffNotes(formData.clientName, formData.clientEmail, formData.notes);

      const created = await submitCanvasJob(apolloClient, {
        workflows,
        edges: val.edges,
        nodes: val.nodes,
        jobName: formData.jobName.trim(),
        institute: formData.institute.trim(),
        notes,
        clientDisplayName: formData.clientName.trim(),
        attachments,
        getAccessToken: () => userContext.userProps?.getAccessToken() ?? Promise.resolve(undefined),
      });

      setLastSubmittedJob(created);
      setSuccessDialogOpen(true);
      setAttachments([]);
      setFormData({
        jobName: '',
        clientName: '',
        clientEmail: '',
        institute: '',
        notes: '',
      });
      setTouched({ jobName: false, clientName: false, institute: false });
    } catch (err) {
      console.error('Staff job submission failed:', err);
      setSnackbarMessage('Failed to submit job. Please try again.');
      setSnackbarOpen(true);
    } finally {
      setJobLoading(false);
    }
  };

  const handleSuccessDismiss = () => {
    setSuccessDialogOpen(false);
    setLastSubmittedJob(null);
    // Clear the canvas only after the success dialog is dismissed.
    // Otherwise the component re-renders with workflows.length === 0 and shows the empty-workflow screen,
    // which looks like an error after a successful submission.
    val.setNodes([]);
    val.setEdges([]);
    localStorage.removeItem(CANVAS_AUTOSAVE_KEY);
    localStorage.setItem('CurrentCanvas', '');
    navigate('/canvas');
  };

  if (workflows.length === 0 && !successDialogOpen) {
    return (
      <Box sx={{ p: 3, maxWidth: 640 }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Staff job submission
        </Typography>
        <Alert severity="info" sx={{ mb: 2 }}>
          Add at least one workflow on the canvas before submitting on behalf of a client.
        </Alert>
        <Button variant="contained" onClick={() => navigate('/canvas')}>
          Back to canvas
        </Button>
      </Box>
    );
  }

  const workflowCount = workflows.length;
  const serviceLabels = workflows.flatMap((wf) =>
    (Array.isArray(wf) ? wf : [wf]).map((n: { data?: { label?: string } }) => n.data?.label ?? 'Service')
  );

  return (
    <Box sx={{ p: 3, pr: { xs: 3, md: 6 }, maxWidth: 720 }}>
      <Typography
        variant="h4"
        sx={(theme) => ({
          textAlign: 'left',
          fontWeight: 500,
          fontSize: '1.75rem',
          borderBottom: `2px solid ${theme.palette.primary.main}`,
          paddingBottom: '8px',
          mb: 2,
        })}
      >
        Staff — submit job for client
      </Typography>

      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        This uses the same job pipeline as the customer checkout. Pricing review is skipped. The job is
        created under your staff account; the client name below is stored as the job&apos;s display name
        for SOWs and customer-facing documents.
      </Typography>

      <Button variant="outlined" onClick={() => navigate('/canvas')} sx={{ mb: 3, textTransform: 'none' }}>
        Back to canvas
      </Button>

      <Alert severity="info" sx={{ mb: 3 }}>
        {workflowCount} workflow{workflowCount === 1 ? '' : 's'}: {serviceLabels.join(', ')}
      </Alert>

      <Typography variant="h6" sx={{ mb: 1, fontWeight: 500 }}>
        Job details
      </Typography>

      <Grid container spacing={2} direction="column">
        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            label="Job name"
            value={formData.jobName}
            onChange={handleInputChange('jobName')}
            onBlur={handleBlur('jobName')}
            error={touched.jobName && formData.jobName.trim() === ''}
            helperText={
              touched.jobName && formData.jobName.trim() === '' ? 'Required' : ''
            }
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            label="Client name (display name on job)"
            value={formData.clientName}
            onChange={handleInputChange('clientName')}
            onBlur={handleBlur('clientName')}
            error={touched.clientName && formData.clientName.trim() === ''}
            helperText={
              touched.clientName && formData.clientName.trim() === ''
                ? 'Required'
                : 'Shown on statements of work and similar documents'
            }
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Client email (optional)"
            type="email"
            value={formData.clientEmail}
            onChange={handleInputChange('clientEmail')}
            helperText="If provided, prepended to job notes so the lab has the client contact on file"
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            required
            label="Institute / organization"
            value={formData.institute}
            onChange={handleInputChange('institute')}
            onBlur={handleBlur('institute')}
            error={touched.institute && formData.institute.trim() === ''}
            helperText={
              touched.institute && formData.institute.trim() === '' ? 'Required' : ''
            }
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Notes"
            multiline
            minRows={4}
            value={formData.notes}
            onChange={handleInputChange('notes')}
          />
        </Grid>
        <Grid item xs={12}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            Attachments (optional)
          </Typography>
          <Button variant="outlined" component="label" sx={{ textTransform: 'none' }}>
            Choose files
            <input type="file" multiple hidden onChange={handleAttachmentChange} />
          </Button>
          {attachments.length > 0 && (
            <Box sx={{ mt: 1 }}>
              {attachments.map((file) => (
                <Typography key={`${file.name}-${file.size}`} variant="body2" color="text.secondary">
                  • {file.name}
                </Typography>
              ))}
            </Box>
          )}
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="contained"
            size="large"
            disabled={!isFormValid() || jobLoading}
            onClick={handleSubmit}
            startIcon={jobLoading ? <CircularProgress size={20} color="inherit" /> : null}
          >
            Submit job
          </Button>
        </Grid>
      </Grid>

      <Dialog open={successDialogOpen} onClose={handleSuccessDismiss} maxWidth="sm" fullWidth>
        <DialogTitle>Job submitted successfully</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mb: lastSubmittedJob ? 1 : 0 }}>
            The job was submitted and will follow the normal lab pipeline.
          </Typography>
          {lastSubmittedJob && (
            <Typography variant="body2" color="text.secondary">
              Job ID: {lastSubmittedJob.jobId ?? lastSubmittedJob.id}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={handleSuccessDismiss}>
            Return to empty canvas
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={() => setSnackbarOpen(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity="error" onClose={() => setSnackbarOpen(false)} variant="filled">
          {snackbarMessage}
        </Alert>
      </Snackbar>
    </Box>
  );
}
