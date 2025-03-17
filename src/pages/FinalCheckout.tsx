
//V3

import React, { SyntheticEvent, useState, useEffect, useContext } from 'react';
import { useMutation } from "@apollo/client";
import { CREATE_JOB } from "../gql/mutations";
import { CanvasContext } from "../contexts/Canvas";
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Snackbar,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Box,
  Tabs,
  Tab,
  Divider,
  Alert,
  AlertColor
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

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
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
 * TabPanel Component - Handles the visibility of tab content based on the selected tab
 * @param props - Contains children elements, current tab value and index
 */

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && (
        <Box sx={{ p: 3 }}>{children}</Box>
      )}
    </div>
  );
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
  const [tabValue, setTabValue] = React.useState(0);

  const [snackbarState, setSnackbarState] = useState<SnackbarState>({
    open: false,
    message: '',
    severity: 'success'
  });

  // GraphQL mutation for job creation
  const [createJob] = useMutation(CREATE_JOB, {
    onCompleted: (data) => {
      // Store job details in localStorage for persistence
      console.log("Successfully created job:", data);
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
        severity: 'success'
      });
      
      // Navigate after showing the success message
      setTimeout(() => {
        navigate("/submitted", { state: { id: data.createJob.id } });
      }, 2000);
    },
    onError: (error: any) => {
      console.error("Error creating job:", error);
      setSnackbarState({
        open: true,
        message: 'Failed to submit job. Please try again.',
        severity: 'error'
      });
    },
  });

  const handleSnackbarClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarState(prev => ({ ...prev, open: false }));
  };

  const handleTabChange = (_event: SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };


  // Extract workflow information from location state
  const { workflows, workflowCosts, totalCost, serviceDetails } = location.state?.orderSummary || {};

  // Form data state management
  const [formData, setFormData] = React.useState({
    email: '',
    firstName: '',
    unit: '',
    streetAddress: '',
    city: '',
    state: '',
    zip: '',
    cardNumber: '',
    expirationDate: '',
    cvv: ''
  });

  const isFormValid = () => {
    const detailsValid = 
      formData.email !== '' &&
      formData.firstName !== '' &&
      formData.unit !== '' &&
      formData.streetAddress !== '' &&
      formData.city !== '' &&
      formData.state !== '' &&
      formData.zip !== '';
  
    const paymentValid = 
      formData.cardNumber !== '' &&
      formData.expirationDate !== '' &&
      formData.cvv !== '';
  
    return detailsValid && paymentValid;
  };

  const handleInputChange = (field: keyof typeof formData) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData({
      ...formData,
      [field]: event.target.value
    });
  };

/**
  * Handles the job submission process
  * Transforms workflow data and submits to backend
*/
  const handleSubmitJob = () => {
    if (isFormValid()) {
      const workflows = location.state?.orderSummary?.workflows || [];
      
      const data = {
        name: formData.firstName,
        username: formData.firstName,
        institute: formData.unit,
        email: formData.email,
        notes: "",
        workflows: workflows.map((workflow: any) => ({
          name: `Workflow-${workflow.id || workflow[0]?.id}`, // Handle both single node and array cases
          nodes: transformNodesToGQL(Array.isArray(workflow) ? workflow : [workflow]),
          edges: transformEdgesToGQL(val.edges.filter((edge: any) => {
            const workflowNodes = Array.isArray(workflow) ? workflow : [workflow];
            return workflowNodes.some(node => node.id === edge.source) &&
                   workflowNodes.some(node => node.id === edge.target);
          }))
        }))
      };
  
      console.log("Submitting job with data:", data);
      createJob({ variables: { createJobInput: data } });
    }
  };

  return (
    <Box sx={{ display: 'flex', gap: 4, padding: '20px', position: 'relative'}}>
      {/* Left Column - Forms */}
      <Box sx={{ flex: '1 1 60%',
        maxWidth: 'calc(60% - 40px);',
        marginRight: '40%'
      }}>

      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography 
            variant="h4" 
            sx={{ 
              fontWeight: 500,
              fontSize: '1.75rem'
            }}
          >
            Checkout
          </Typography>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate('/checkout')}
            sx={{
              alignSelf: 'flex-start',  
              textTransform: 'none',
              fontSize: '0.875rem',
              fontWeight: 500,
              mb: 2  // Space before the tabs
            }}
          >
            Back to Job
          </Button>
      </Box>
    </Box>

    <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
      <Tabs 
        value={tabValue} 
        onChange={handleTabChange}
        aria-label="checkout process tabs"
        sx = {{
            '& .MuiTab-root': {
              fontSize: '0.875rem',
              fontWeight: 500,
              minWidth: 100
              }
            }}
      >
        <Tab label="DETAILS" />
        <Tab label="PAYMENT" />
      </Tabs>
    </Box>

    <TabPanel value={tabValue} index={0}>
      <Paper elevation={3} sx={{ p: 3 }}>
          <Typography 
            variant="h6" 
            sx={{
              mb: 2,
              fontWeight: 500,
              fontSize: '1.1rem',
              color: 'text.primary'
             }}
          >
            Contact Information
          </Typography>
          <Grid container spacing={1.5}>
            <Grid item xs={12}>
              <TextField 
                fullWidth 
                label="Email" 
                required 
                variant="outlined" 
                value={formData.email}
                onChange={handleInputChange('email')}
                error={tabValue === 1 && formData.email === ''} 
                helperText={tabValue === 1 && formData.email === '' ? 'This field is required' : ''}
              />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                fullWidth 
                label="First Name" 
                required 
                variant="outlined"
                value = {formData.firstName}
                onChange={handleInputChange('firstName')}
                error={tabValue === 1 && formData.firstName === ''} 
                helperText= {tabValue === 1 && formData.firstName === '' ? 'This field is required' : ''}
              />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                  fullWidth 
                  label="Unit" 
                  required 
                  variant="outlined"
                  value = {formData.unit} 
                  onChange={handleInputChange('unit')}
                  error={tabValue === 1 && formData.unit === ''}
                  helperText= {tabValue === 1 && formData.unit === '' ? 'This field is required' : ''}/>
              </Grid>
            </Grid>

            <Typography variant="h6" sx={{ mb: 3, mt: 4 }}>
              Delivery Address
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField 
                fullWidth 
                label="Street Address" 
                required 
                variant="outlined"
                value = {formData.streetAddress} 
                onChange={handleInputChange('streetAddress')}
                error={tabValue === 1 && formData.streetAddress === ''}
                helperText= {tabValue === 1 && formData.streetAddress === '' ? 'This field is required' : ''} 
                />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                fullWidth
                label="City" 
                required 
                variant="outlined"
                value = {formData.city} 
                onChange={handleInputChange('city')}
                error={tabValue === 1 && formData.city === ''}
                helperText= {tabValue === 1 && formData.city === '' ? 'This field is required' : ''} 
                />
              </Grid>
              <Grid item xs={3}>
                <TextField 
                fullWidth 
                label="State" 
                required 
                variant="outlined"
                value = {formData.state} 
                onChange={handleInputChange('state')}
                error={tabValue === 1 && formData.state === ''}
                helperText= {tabValue === 1 && formData.state === '' ? 'This field is required' : ''}                 
                />
              </Grid>
              <Grid item xs={3}>
                <TextField 
                fullWidth 
                label="Zip" 
                required 
                variant="outlined"
                value = {formData.zip} 
                onChange={handleInputChange('zip')}
                error={tabValue === 1 && formData.zip === ''}
                helperText= {tabValue === 1 && formData.zip === '' ? 'This field is required' : ''}                 
                />
              </Grid>
            </Grid>
          </Paper>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <Paper elevation={3} sx={{ p: 3 }}>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Payment Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField 
                fullWidth 
                label="Card Number" 
                required 
                variant="outlined"
                value={formData.cardNumber}
                onChange={handleInputChange('cardNumber')}
                error={tabValue === 1 && formData.cardNumber === ''}
                helperText={tabValue === 1 && formData.cardNumber === '' ? 'This field is required' : ''}
                 />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                fullWidth 
                label="Expiration Date"
                required 
                variant="outlined"
                value = {formData.expirationDate} 
                onChange={handleInputChange('expirationDate')}
                error={tabValue === 1 && formData.expirationDate === ''}
                helperText= {tabValue === 1 && formData.expirationDate === '' ? 'This field is required' : ''}                 
                />
              </Grid>
              <Grid item xs={6}>
                <TextField 
                fullWidth 
                label="CVV" 
                required 
                variant="outlined"
                value = {formData.cvv} 
                onChange={handleInputChange('cvv')}
                error={tabValue === 1 && formData.cvv === ''}
                helperText= {tabValue === 1 && formData.cvv === '' ? 'This field is required' : ''}                 
                />
              </Grid>
            </Grid>
          </Paper>
        </TabPanel>
        </Box>

          {/*Right side order summary*/}
        <Box sx={{ 
          position: 'fixed',
          right: '40px',
          top: '100px',
          width: '35%',
          backgroundColor: '#f5f5f5',
          padding: 3,
          border: '1px solid #ddd',
          borderRadius: 2,
          boxShadow: 3
        }}>
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
            mb: 2
        }}
      >
        <Typography variant="body1">
          Workflow {index + 1}
        </Typography>
        <Typography variant="body1">
          ${workflow.cost.toFixed(2)}
        </Typography>
      </Box>
    ))}

    <Divider sx={{ my: 2 }} />

    <Box sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      mb: 3
      }}>
      <Typography variant="h6" fontWeight="bold">
        Total Cost
      </Typography>
      <Typography variant="h6" fontWeight="bold">
        ${totalCost?.toFixed(2)}
      </Typography>
    </Box>

    <Button
      variant="contained"
      color="primary"
      fullWidth
      onClick={handleSubmitJob}
      disabled={!isFormValid()}
      sx={{
        width: '100%'
      }}
    >
      Submit Job
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
      severity={snackbarState.severity}
      variant="filled"
      sx={{ 
        width: '100%',
        minWidth: '300px',
        boxShadow: 2,
        fontSize: '0.95rem'
    }}
    >
      {snackbarState.message}
    </Alert>
  </Snackbar>
  </Box>
  </Box>
</Box>
);

}
  