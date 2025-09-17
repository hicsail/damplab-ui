//V4

import React, { useState, useEffect, useContext } from 'react';
import { useMutation } from "@apollo/client";
import { CREATE_JOB } from "../gql/mutations";
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
  
  // Form data state management
  const [formData, setFormData] = useState({
    jobName: '',
    institute: '',
    notes: ''
  });

  // GraphQL mutation for job creation
  const [createJob, { loading: jobLoading }] = useMutation(CREATE_JOB, {
    onCompleted: (data) => {
      // Store job details in localStorage for persistence
      let fileName = `${data.createJob.id}_${new Date().toLocaleString()}`;
      let file = {
        fileName: fileName,
        nodes: val.nodes,
        edges: val.edges,
      };
      localStorage.setItem(fileName, JSON.stringify(file));
      
      setSnackbarState({
        open: true,
        message: 'Job submitted successfully!',
        severity: 'success',
        showSpinner: true     
      });
      
      // Navigate after showing the success message
      const jobId = data.createJob.id;

      setTimeout(() => {
        navigate(`/jobs/${jobId}`);
      }, 1000);
    },
    onError: (error: any) => {
      console.error("Error creating job:", error);
      setSnackbarState({
        open: true,
        message: 'Failed to submit job. Please try again.',
        severity: 'error',
        showSpinner:false
      });
    },
  });

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

/**
  * Handles the job submission process
  * Transforms workflow data and submits to backend
*/
const handleSubmitJob = async () => {

  const workflows = location.state?.orderSummary?.workflows || [];

  try {
    const data = {
      name: formData.jobName,
      institute: formData.institute,
      notes: formData.notes, // Optional
      workflows: workflows.map((workflow: any) => ({
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

    await createJob({ 
      variables: { createJobInput: data },
      context: {
        headers: {
          authorization: `Bearer ${token}`,
        },
      },
    });
  } catch (error) {
    console.error('Job submission failed:', error);
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