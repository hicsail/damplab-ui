/**
 * Checkout Component
 * Handles the shopping cart functionality for workflow jobs including:
 * - Displaying workflow summaries
 * - Cost calculations
 * - Workflow management (edit, remove)
 * - Navigation to final checkout
 */


import React, {useContext, useState, useEffect} from "react";
import { useNavigate } from 'react-router';

import { styled } from '@mui/material/styles';
import {
  Typography,
  Grid,
  Paper,
  Box,
  Divider,
  Button,
  Modal,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from "@mui/material";

import CircleIcon from '@mui/icons-material/Circle';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

import { CanvasContext } from "../contexts/Canvas";
import { getWorkflowsFromGraph } from "../controllers/GraphHelpers";


import { PausePresentationRounded } from "@mui/icons-material";

interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  position: {
      x: number;
      y: number;
  };
  active: boolean;
  data: {
      id: string;
      label: string;
      price: number;
      description: string;
      serviceId: string;
      icon?: string;
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
  width: number;
  height: number;
}

interface Workflow {
  nodes?: WorkflowNode[];
}

const Item = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(1.5),
  textAlign: 'center',
  color: theme.palette.text.secondary,
  minHeight: '150px',
  '& .MuiTypography-h6': {
    fontSize: '1.1rem',
    fontWeight: 500
  },
  '& .MuiTypography-subtitle1': {
    fontSize: '0.875rem'
  },
  '& .MuiTypography-body2': {
    fontSize: '0.875rem'
  }
}));

export default function Checkout() {
  const navigate = useNavigate();
  const val = useContext(CanvasContext);
  const rawWorkflows = getWorkflowsFromGraph(val.nodes, val.edges) || [];
  console.log('Raw workflows:', rawWorkflows);

  const [workflows, setWorkflows] = useState<WorkflowNode[][]>(rawWorkflows);
  const [open, setOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<number | null>(null);

  useEffect(() => {
    if (workflows && workflows.length > 0) {
        console.log('Sample workflow from state:', workflows);
        workflows.forEach((workflowArray) => {
            if (Array.isArray(workflowArray)) {
                workflowArray.forEach((workflow) => {
                    console.log('Each workflow node:', {
                        id: workflow.id,
                        name: workflow.name,
                        price: workflow.data.price,
                        label: workflow.data.label,
                        type: workflow.type
                    });
                });
            }
        });
    }
  }, [workflows]);
  


  const handleOpen = (index: number) => {
    setSelectedWorkflow(index);
    setOpen(true);
   };

  const handleClose = () => {
    setOpen(false);
    setSelectedWorkflow(null);
   }

  const handleEditJob = () => { navigate('/canvas'); };

  const handleFinalCheckout = () => {
    const orderSummary = {
      workflows: workflows,
      workflowCosts: workflows.map(workflow => ({
        workflowId: workflow[0]?.id,
        cost: calculateServiceCost(workflow)
      })),
      totalCost: calculateTotalJobCost(workflows),
      serviceDetails: workflows.map(workflow => groupServicesByLabel(workflow))
    };
  
    navigate('/final_checkout', { state: { orderSummary } });
  };


  const handleRemoveWorkflow = (indexToRemove: number) => {
    const updatedWorkflows = workflows.filter((_, index) => index !== indexToRemove);
    setWorkflows(updatedWorkflows);
  }

  const handleRemoveAllWorkflows = () => {
    if (window.confirm("Are you sure you want to remove your job from cart?")){
      setWorkflows([]);
    }
  };

  const calculateServiceCost = (workflow: WorkflowNode[]) => {
  return workflow.reduce((total, node) => {
    const price = node.data.price ?? 0; // default to 0 if price is missing
    return total + price;
    }, 0);
  };

  const groupServicesByLabel = (workflow: WorkflowNode[]) => {
    return workflow.reduce((acc, node) => {
      const label = node.data.label;
      if (!acc[label]) {
        acc[label] = {
          count: 1,
          cost: node.data.price,
          nodes: [node]  // Store array of nodes instead of single node
        };
      } else {
        acc[label].count += 1;
        acc[label].nodes.push(node);  // Add node to array
      }
      return acc;
    }, {} as { [key: string]: { count: number; cost: number; nodes: WorkflowNode[] } });
  };

  const calculateTotalJobCost = (workflows: WorkflowNode[][]) => {
    return workflows.reduce((total, workflow) => {
      return total + calculateServiceCost(workflow);
    }, 0);
  };


  return (
    <div>
      <Typography variant="h4"
        sx={{
          marginBottom: '24px',
          textAlign: 'left',
          fontWeight: 500,
          fontSize: '1.75rem'
        }}
      >
        Your Job
      </Typography>
              

      <div style={{ textAlign: 'left' }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleEditJob}
          disabled={workflows.length === 0}
          style={{
            marginRight: '20px',
            marginBottom: '40px',
            textTransform: 'none',
            fontSize: '0.875rem'
          }}>
            Edit Job
          </Button>
        <Button
        variant="contained"
        color="error"
        onClick={handleRemoveAllWorkflows}
        disabled={workflows.length === 0}
        style={{
          marginBottom: '40px',
        }}
        >
          Remove Job
        </Button>
        </div>

        {workflows.length === 0 ? (
          <Typography 
            variant="h5"
            sx={{
              textAlign: 'left',
              color: 'grey',
              ml: 2
          }}>
          You have no job to checkout
        </Typography>
        ) : (

        <Grid container spacing={2}
        direction="column"
        sx={{
          maxWidth: '50%',
          
        }}>

        
          {workflows.map((workflow, index) => (
                      <Grid item xs={12} md={5} key={index}>
            <Item>
              <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
              <Typography variant="h6">
                Workflow {index + 1}
                </Typography>
              <Typography variant="subtitle1">Cost : ${calculateServiceCost(workflow).toFixed(2)}</Typography>
              </Box> 
              <Divider sx={{ my: 2}} />
              <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <Button variant="outlined" 
                color="error"
                onClick={() => handleRemoveWorkflow(index)}>
                  Remove Workflow
                </Button>
                <Button variant="outlined" 
                color="primary"
                onClick = {() => handleOpen(index)}>
                  Review Workflow
                </Button>

                <Modal
                open={open}
                onClose={handleClose}
                aria-labelledby="workflow-review-modal"
                >
                <Box sx={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: '80%',
                  height: '80vh',
                  bgcolor: 'background.paper',
                  boxShadow: 24,
                  p: 4,
                  borderRadius: 2,
                  overflow: 'auto'
                }}>

              <Button 
                onClick={handleClose}
                sx={{
                position: 'absolute',
                top: 20,
                right: 20
                }}>
                  Close
              </Button>

                <Typography variant="h6">
                  Review Workflow {selectedWorkflow !== null ? selectedWorkflow + 1 : ""}
                </Typography>

                
                </Box>

                </Modal>
                </Box>
                <Divider sx={{ my: 2}}/>
                
                <Box
                 >
                  <Accordion elevation={0}
                  sx={{
                    '& .MuiAccordionSummary-content': {
                      margin: '8px 0',
                    }
                  }}>
                    <AccordionSummary
                    expandIcon={<ArrowDropDownIcon />}
                    sx={{
                      minHeight: '40px',
                      '& .MuiTypography-root': {
                        fontSize: '0.875rem',
                        fontWeight: 500
                      }
                    }}

                    aria-controls="panel1-content"
                    id="panel1-header"
                    >
                      <Typography variant="subtitle1">Workflow details</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        width: '100%',
        mb: 2  // margin bottom for spacing
      }}
    >
      <Typography variant="body2" color="text.primary">
        Processes
      </Typography>
      <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500}}>
        Cost Summary
      </Typography>
    </Box>
  <List>

  {Object.entries(groupServicesByLabel(workflow)).map(([label, service]) => (
  <ListItem key={label}>
    <ListItemIcon>
      <CircleIcon sx={{ fontSize: 8 }} /> 
    </ListItemIcon>
    <ListItemText 
      primary={
        <Box sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <span>{label}</span>
            {service.count > 1 && (
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ ml: 1,
                  fontSize: '0.875remd'
                 }}
              >
                (×{service.count})
              </Typography>
            )}
          </Box>
          <Typography variant="body2" color="text.secondary">
            ${(service.cost * service.count).toFixed(2)}
          </Typography>
        </Box>
      }
      secondary={
        <Box sx={{ mt: 1 }}>
          {service.nodes.map((node, index) => (
            <Box 
              key={node.id} 
              sx={{ mb: index !== service.nodes.length - 1 ? 2 : 0 }}
            >
              {service.count > 1 && (
                <Typography 
                  variant="body2" 
                  color="text.secondary" 
                  sx={{ ml: 2 }}
                >
                  Service {index + 1}:
                </Typography>
              )}
              {node.data?.formData?.map((param) => (
  <Typography 
    key={param.id} 
    variant="body2" 
    color="text.secondary" 
    sx={{ ml: service.count > 1 ? 3 : 2,
      fontSize: '0.875rem'
     }}
  >
    {param.name}: {param.value}
  </Typography>
))}
            </Box>
          ))}
        </Box>
      }
    />
  </ListItem>
))}



  </List>
   {/* Add this total cost section after the List */}
   <Divider sx={{ my: 2 }} />
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      width: '100%',
      mt: 2,
      px: 2
    }}
  >
    <Typography variant="subtitle1" fontWeight="bold">
      Total Cost
    </Typography>
    <Typography variant="subtitle1" 
    fontWeight="bold"
    sx={{ pr: 4}}>
      ${calculateServiceCost(workflow).toFixed(2)}
    </Typography>
  </Box>
</AccordionDetails>
                  </Accordion>
                </Box>
            </Item>
          </Grid>
          ))}

        
        </Grid>  
        )}
<Grid
  sx={{
    position: 'fixed',
    right: '40px',
    top: '100px',
    width: '40%',
    backgroundColor: '#f5f5f5',
    padding: 3,
    border: '1px solid #ddd',
    borderRadius: 2,
    boxShadow: 3
  }}
>
  <Typography variant="h6" sx={{ mb: 2 }}>
    Order summary
  </Typography>

  <Box>
    {workflows.map((workflow, index) => (
      <Box
        key={index}
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2
        }}
      >
      <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 500 }}>
          Workflow {index + 1}
        </Typography>
        <Typography variant="subtitle1" sx={{ fontSize: '0.875rem' }}>
          ${calculateServiceCost(workflow).toFixed(2)}
        </Typography>
      </Box>
    ))}

    <Divider sx={{ my: 2 }} />
    
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3
      }}
    >
      <Typography variant="h6" fontWeight="bold">
        Total Cost
      </Typography>
      <Typography variant="h6" fontWeight="bold">
        ${calculateTotalJobCost(workflows).toFixed(2)}
      </Typography>
    </Box>

    <Button
      variant="contained"
      color="primary"
      onClick={handleFinalCheckout}
      disabled={workflows.length === 0}
      sx={{
        width: '100%'
      }}
    >
      CHECKOUT
    </Button>
  </Box>
</Grid>
    </div>


    );
  }
