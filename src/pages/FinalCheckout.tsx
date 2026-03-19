//V4

import React, { useState, useEffect, useContext } from 'react';
import { useMutation } from "@apollo/client";
import { ADD_JOB_ATTACHMENTS, CREATE_JOB, CREATE_JOB_ATTACHMENT_UPLOAD_URLS, CREATE_WORKFLOW_PARAMETER_UPLOAD_URLS } from "../gql/mutations";
import { CanvasContext } from "../contexts/Canvas";
import { useLocation, useNavigate } from 'react-router';
import { UserContext, UserContextProps } from '../contexts/UserContext';
import {
  Snackbar,
  Typography,
  TextField,
  Button,
  Grid,
  Box,
  Divider,
  Alert,
  AlertColor,
  CircularProgress, 
} from '@mui/material';

import {
  transformEdgesToGQL,
  transformNodesToGQL,
} from "../controllers/GraphHelpers";


interface SnackbarState {
  open: boolean;
  message: string;
  severity: AlertColor;
}

interface WorkflowCost {
  cost: number;
  // Add other properties if they exist
}

type PendingParamFile = {
  __kind: 'pending-file';
  localId: string;
  file: File;
  filename: string;
  contentType: string;
  size: number;
};

type UploadedParamFile = {
  filename: string;
  key: string;
  contentType: string;
  size: number;
  uploadedAt: string;
};

const isPendingParamFile = (value: unknown): value is PendingParamFile =>
  !!value &&
  typeof value === 'object' &&
  (value as PendingParamFile).__kind === 'pending-file' &&
  value instanceof Object &&
  (value as PendingParamFile).file instanceof File;

interface WorkflowNode {
  id: string;
  type: string;
  data: {
    id: string;
    label: string;
    serviceId: string;
    parameters?: Array<{
      id: string;
      name: string;
      type: string;
      paramType: string;
      required: boolean;
    }>;
    formData?: Array<{
      id: string;
      nodeId: string;
      name: string;
      value: any;
    }>;
  };
}


/**
 * FinalCheckout Component
 * Handles the final stage of job submission process including:
 * - User contact information collection
 * - Payment details
 * - Order summary display
 * - Job submission to backend
 */

export default function FinalCheckout() {

  const val = useContext(CanvasContext);
  const location = useLocation();
  const navigate = useNavigate();
  const userContext: UserContextProps = useContext(UserContext);
  const userProps = userContext.userProps;
  const token = userContext.userProps?.accessToken;
  //formData retrieved from auth
  const email = userProps.idTokenParsed?.email ?? '';
  const name = userProps.idTokenParsed?.name ?? '';

  const [snackbarState, setSnackbarState] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success'
  });
  const [touched, setTouched] = useState({
    jobName: false,
    institute: false,
  });
  const [redirecting, setRedirecting] = useState(false);
  const [attachments, setAttachments] = useState<File[]>([]);
  
  // Form data state management
  const [formData, setFormData] = useState({
    jobName: '',
    institute: '',
    notes: ''
  });

  // GraphQL mutations
  const [createJob, { loading: jobLoading }] = useMutation(CREATE_JOB);
  const [createAttachmentUploadUrls] = useMutation(CREATE_JOB_ATTACHMENT_UPLOAD_URLS);
  const [addJobAttachments] = useMutation(ADD_JOB_ATTACHMENTS);
  const [createWorkflowParameterUploadUrls] = useMutation(CREATE_WORKFLOW_PARAMETER_UPLOAD_URLS);

  useEffect(() => {
    // Guard: redirect if didn't come from previous page/state parsed
    if (!location.state?.orderSummary) {
      setRedirecting(true);
      setTimeout(() => {
        navigate("/checkout", { replace: true }); 
      }, 1500);
    }
  }, [location, navigate]);

  if (redirecting) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        height="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  const handleSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarState(prev => ({ ...prev, open: false }));
  };



  // Extract workflow information from location state
  const { workflows, workflowCosts, totalCost, serviceDetails } = location.state?.orderSummary || {};


  const isFormValid = () => {
    return (
      formData.jobName.trim() !== '' && formData.institute.trim() !== ''
    );
  };

  // Handler to mark a field as touched https://formik.org/docs/tutorial
  const handleBlur = (field) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleInputChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const handleAttachmentChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    setAttachments(Array.from(files));
  };

/**
  * Handles the job submission process
  * Transforms workflow data and submits to backend
*/
const handleSubmitJob = async () => {

  const workflows = location.state?.orderSummary?.workflows || [];

  try {
    const token = await userContext.userProps?.getAccessToken();
    const workflowsWithUploadedParamFiles = await (async () => {
      const clonedWorkflows = workflows.map((workflow: any) => {
        const nodes = (Array.isArray(workflow) ? workflow : [workflow]).map((node: any) => ({
          ...node,
          data: {
            ...node.data,
            formData: Array.isArray(node.data?.formData)
              ? node.data.formData.map((entry: any) => ({ ...entry }))
              : []
          }
        }));
        return Array.isArray(workflow) ? nodes : nodes[0];
      });

      const filesToUpload: Array<{
        clientToken: string;
        file: File;
        contentType: string;
        size: number;
      }> = [];

      const addFileForUpload = (file: PendingParamFile): string => {
        const clientToken = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        filesToUpload.push({
          clientToken,
          file: file.file,
          contentType: file.contentType || 'application/octet-stream',
          size: file.size
        });
        return clientToken;
      };

      const fileTokenLookup = new Map<string, string | string[]>();

      clonedWorkflows.forEach((workflow: any) => {
        const nodes = Array.isArray(workflow) ? workflow : [workflow];
        nodes.forEach((node: any) => {
          const parameters = Array.isArray(node.data?.parameters) ? node.data.parameters : [];
          const fileParamIds = new Set(
            parameters.filter((p: any) => p?.type === 'file' && typeof p.id === 'string').map((p: any) => p.id)
          );
          (node.data.formData || []).forEach((entry: any) => {
            if (!fileParamIds.has(entry.id)) return;
            if (Array.isArray(entry.value)) {
              const tokens = entry.value.filter((v: any) => isPendingParamFile(v)).map((f: PendingParamFile) => addFileForUpload(f));
              if (tokens.length > 0) {
                fileTokenLookup.set(`${node.id}:${entry.id}`, tokens);
              }
              return;
            }
            if (isPendingParamFile(entry.value)) {
              const token = addFileForUpload(entry.value);
              fileTokenLookup.set(`${node.id}:${entry.id}`, token);
            }
          });
        });
      });

      if (filesToUpload.length === 0) {
        return clonedWorkflows;
      }

      const uploadMetaResult = await createWorkflowParameterUploadUrls({
        variables: {
          files: filesToUpload.map((f) => ({
            clientToken: f.clientToken,
            filename: f.file.name,
            contentType: f.contentType,
            size: f.size
          }))
        },
        context: {
          headers: {
            authorization: token ? `Bearer ${token}` : "",
          },
        },
      });
      const uploads: Array<{
        clientToken: string;
        filename: string;
        uploadUrl: string;
        key: string;
        contentType: string;
        size: number;
      }> = uploadMetaResult.data?.createWorkflowParameterUploadUrls ?? [];
      const uploadByToken = new Map(uploads.map((u) => [u.clientToken, u]));

      await Promise.all(
        filesToUpload.map(async (f) => {
          const upload = uploadByToken.get(f.clientToken);
          if (!upload) throw new Error(`Upload URL not found for file token ${f.clientToken}`);
          const response = await fetch(upload.uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': upload.contentType || 'application/octet-stream',
            },
            body: f.file,
          });
          if (!response.ok) {
            throw new Error(`Failed to upload parameter file ${f.file.name}`);
          }
        })
      );

      const uploadedMetaByToken = new Map<string, UploadedParamFile>();
      uploads.forEach((u) => {
        uploadedMetaByToken.set(u.clientToken, {
          filename: u.filename,
          key: u.key,
          contentType: u.contentType,
          size: u.size,
          uploadedAt: new Date().toISOString()
        });
      });

      clonedWorkflows.forEach((workflow: any) => {
        const nodes = Array.isArray(workflow) ? workflow : [workflow];
        nodes.forEach((node: any) => {
          (node.data.formData || []).forEach((entry: any) => {
            const tokenOrTokens = fileTokenLookup.get(`${node.id}:${entry.id}`);
            if (!tokenOrTokens) return;
            if (Array.isArray(tokenOrTokens)) {
              entry.value = tokenOrTokens
                .map((t) => uploadedMetaByToken.get(t))
                .filter(Boolean)
                .map((meta) => JSON.stringify(meta));
            } else {
              const meta = uploadedMetaByToken.get(tokenOrTokens);
              entry.value = meta ? JSON.stringify(meta) : null;
            }
          });
        });
      });

      return clonedWorkflows;
    })();

    const data = {
      name: formData.jobName,
      institute: formData.institute,
      notes: formData.notes, // Optional
      workflows: workflowsWithUploadedParamFiles.map((workflow: any) => ({
        name: `Workflow-${workflow.id || workflow[0]?.id}`,
        nodes: transformNodesToGQL(Array.isArray(workflow) ? workflow : [workflow]),
        edges: transformEdgesToGQL(
          val.edges.filter((edge: any) => {
            const workflowNodes = Array.isArray(workflow) ? workflow : [workflow];
            return workflowNodes.some(node => node.id === edge.source) &&
                   workflowNodes.some(node => node.id === edge.target);
          })
        )
      }))
    };

    setSnackbarState({
      open: true,
      message: 'Submitting job...',
      severity: 'secondary',
      showSpinner: true
    });

    const jobResult = await createJob({ 
      variables: { createJobInput: data },
      context: {
        headers: {
          authorization: token ? `Bearer ${token}` : "",
        },
      },
    });

    const jobId = jobResult.data?.createJob?.id;
    if (!jobId) {
      throw new Error('Job was created but no ID was returned.');
    }

    // Persist graph locally for convenience (existing behavior)
    const localFileName = `${jobId}_${new Date().toLocaleString()}`;
    const localFile = {
      fileName: localFileName,
      nodes: val.nodes,
      edges: val.edges,
    };
    localStorage.setItem(localFileName, JSON.stringify(localFile));

    // If there are attachments, request presigned URLs, upload to S3, then register on the job
    if (attachments.length > 0) {
      const filesForRequest = attachments.map((file) => ({
        filename: file.name,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
      }));

      const uploadUrlResult = await createAttachmentUploadUrls({
        variables: {
          jobId,
          files: filesForRequest,
        },
        context: {
          headers: {
            authorization: token ? `Bearer ${token}` : "",
          },
        },
      });

      const uploads = uploadUrlResult.data?.createJobAttachmentUploadUrls ?? [];

      await Promise.all(
        uploads.map(async (u: any) => {
          const file = attachments.find((f) => f.name === u.filename && f.size === u.size);
          if (!file) {
            return;
          }
          await fetch(u.uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': u.contentType || 'application/octet-stream',
            },
            body: file,
          });
        })
      );

      const attachmentInputs = uploads.map((u: any) => ({
        filename: u.filename,
        key: u.key,
        contentType: u.contentType,
        size: u.size,
      }));

      if (attachmentInputs.length > 0) {
        await addJobAttachments({
          variables: {
            jobId,
            attachments: attachmentInputs,
          },
          context: {
            headers: {
              authorization: token ? `Bearer ${token}` : "",
            },
          },
        });
      }
    }

    setSnackbarState({
      open: true,
      message: 'Job submitted successfully!',
      severity: 'success',
      showSpinner: true
    });

    setTimeout(() => {
      navigate(`/client_view/${jobId}`);
    }, 1000);
  } catch (error) {
    console.error('Job submission failed:', error);
    setSnackbarState({
      open: true,
      message: 'Failed to submit job. Please try again.',
      severity: 'error',
      showSpinner: false,
    });
  }}

  const formatPriceLabel = (price: number | null | undefined): string => {
    if (!price) return "[Price Pending Review]";
    if (price >= 0) {
      return `$${price.toFixed(2)}`;
    } else {
      return "[Price Pending Review]";} // handles all 3 cases of price
  }

  return (
  <div>
     <Box sx={{ mb: 3, width: '30%' }}>
      <Typography
        variant="h4"
        sx={(theme) => ({
          textAlign: 'left',
          fontWeight: 500,
          fontSize: '1.75rem',
          borderBottom: `2px solid ${theme.palette.primary.main}`,
          paddingBottom: '8px'
        })}
      >
        Checkout
      </Typography>
    </Box>

    <div style={{ textAlign: 'left' }}>
      <Button
        variant="outlined"
        color="primary"
        onClick={() => navigate('/checkout')}
        sx={{
          alignSelf: 'flex-start',
          textTransform: 'none',
          fontSize: '0.875rem',
          fontWeight: 500,
          mb: 5,
          borderWidth: '2px',
        }}
      >
        Back to Job
      </Button>
    </div>
    
    {/* Left Column - Forms */}
    <Box sx={{ flex: '1 1 60%', marginRight: '50%' }}>

      <Typography variant="h6" sx={{ mb: 1, textAlign: 'left', fontWeight: 500 }}>
        Required Details
      </Typography>

      <Grid item xs={12} sx={{ mb: 3 }}>
        <TextField
          fullWidth
          label="Job Name"
          required
          variant="outlined"
          value={formData.jobName}
          onChange={handleInputChange('jobName')}
          onBlur={() => handleBlur('jobName')}
          error={touched.jobName && formData.jobName === ''}
          helperText={touched.jobName && formData.jobName === '' ? 'This field is required' : ''}
        />
      </Grid>

      <Typography variant="h6" sx={{ mb: 1, textAlign: 'left', fontWeight: 500 }}>
        Contact Information
      </Typography>
      
      <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary', textAlign: 'left' }}>
        Please verify your contact details below.
      </Typography>

      {/* Non-editable contact info */}
      <Grid item xs={12} container spacing={0.5} direction="row">
        <Grid item xs={4} sx={{ mb: 1 }}>
          <TextField
            label="Your Name" 
            value={name ?? ''}
            fullWidth
            disabled
          />
        </Grid>
        <Grid item xs={4} sx={{ mb: 1 }}>
          <TextField
            label="Email"
            value={email ?? ''}
            fullWidth
            disabled
          />
        </Grid>

        <Grid item xs={4} sx={{ mb: 1 }}>
          <TextField
            label="Institute"
            required
            value={formData.institute ?? ''}
            fullWidth
            onChange={handleInputChange('institute')} 
            onBlur={() => handleBlur('institute')}
            error={touched.institute && formData.institute === ''}
            helperText={touched.institute && formData.institute === '' ? 'This field is required' : ''}
          />
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mt: 2, mb: 1, textAlign: 'left', fontWeight: 500 }}>
        Additional Notes
      </Typography>
      <Grid container spacing={0.5} direction="column">
        <Grid item xs={12} sx={{ mb: 1 }}>
          <TextField
            label="Notes"
            value={formData.notes ?? ''}
            fullWidth
            multiline
            minRows={4}
            onChange={handleInputChange('notes')}
          />
        </Grid>
      </Grid>

      <Typography variant="h6" sx={{ mt: 3, mb: 1, textAlign: 'left', fontWeight: 500 }}>
        Attach Supporting Documents (Demo)
      </Typography>
      <Typography variant="body2" sx={{ mb: 1, color: 'text.secondary', textAlign: 'left' }}>
        You can select files to attach to this job. For now, these uploads are for demonstration only and are not stored.
      </Typography>
      <Grid item xs={12} sx={{ mb: 2 }}>
        <Button
          variant="outlined"
          component="label"
          sx={{ textTransform: 'none' }}
        >
          Choose Files
          <input
            type="file"
            multiple
            hidden
            onChange={handleAttachmentChange}
          />
        </Button>
      </Grid>
      {attachments.length > 0 && (
        <Box sx={{ mb: 3, textAlign: 'left' }}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            Selected files (not yet uploaded):
          </Typography>
          {attachments.map((file) => (
            <Typography key={file.name} variant="body2" color="text.secondary">
              • {file.name} ({Math.round(file.size / 1024)} KB)
            </Typography>
          ))}
        </Box>
      )}
    </Box>


      {/* Right Column - Order Summary */}
      <Box
        sx={{
          position: 'fixed',
          right: '40px',
          top: '100px',
          width: '35%',
          backgroundColor: '#f5f5f5',
          padding: 3,
          border: '1px solid #ddd',
          borderRadius: 2,
          boxShadow: 3,
        }}
      >
        <Typography variant="h5" sx={{ mb: 3 }}>
          Order summary
        </Typography>

        <Box>
          {workflowCosts?.map((workflow: WorkflowCost, index: number) => (
            <Box
              key={index}
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
              }}
            >
              <Typography variant="body1">Workflow {index + 1}</Typography>
              <Typography variant="body1">{formatPriceLabel(workflow.cost)}</Typography>
            </Box>
          ))}

          <Divider sx={{ my: 2 }} />

          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              mb: 3,
            }}
          >
            <Typography variant="h6" fontWeight="bold">
              Estimated Cost*
            </Typography>
            <Typography variant="h6" fontWeight="bold">
              ${totalCost?.toFixed(2)}
            </Typography>
          </Box>

        <Alert
          severity="info" sx={{ mb: 3, borderRadius: 2}}
        >
          *Please note: The final price and payment details, along with other relevant information, will someday be sent to your email.
        </Alert>

        <Button
          variant="contained"
          color="primary"
          fullWidth
          onClick={handleSubmitJob}
          disabled={!isFormValid() || jobLoading}
          startIcon={jobLoading ? <CircularProgress size={20} color="inherit" /> : null}
        >
          SUBMIT JOB
        </Button>


          <Snackbar
            open={snackbarState.open}
            autoHideDuration={6000}
            onClose={handleSnackbarClose}
            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
            sx={{ mt: 6 }}
          >
            <Alert
              onClose={handleSnackbarClose}
              variant="filled"
              severity={snackbarState.severity}
              color={
                snackbarState.severity === 'success'
                  ? 'primary'
                  : snackbarState.severity === 'error'
                  ? 'secondary'
                  : snackbarState.severity === 'info'
                  ? 'info'
                  : undefined
              }
              sx={{
                width: '100%',
                minWidth: '300px',
                boxShadow: 2,
                fontSize: '0.95rem',
              }}
              icon={
                jobLoading ? (
                  <CircularProgress color="inherit" size={20} />
                ) : undefined
              }
            >
              {snackbarState.message}
            </Alert>
          </Snackbar>
        </Box>
      </Box>
  </div>
);
}