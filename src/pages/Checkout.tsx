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
  AccordionDetails,
  Alert,
  Stack
} from "@mui/material";

import CircleIcon from '@mui/icons-material/Circle';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';

import { CanvasContext } from "../contexts/Canvas";
import { UserContext, UserContextProps } from "../contexts/UserContext";
import { getWorkflowsFromGraph } from "../controllers/GraphHelpers";
import { calculateServiceCost } from "../utils/servicePricing";


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
      price: number | null;
      pricingMode?: 'SERVICE' | 'PARAMETER';
      description: string;
      serviceId: string;
      icon?: string;
      parameters?: Array<{
          id: string;
          name: string;
          type: string;
          paramType: string;
          required: boolean;
          allowMultipleValues?: boolean;
          price?: number;
      }>;
      formData?: Array<{
          id: string;
          nodeId: string;
          name: string;
          value: any;
          allowMultipleValues?: boolean;
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
  const userContext: UserContextProps = useContext(UserContext);
  const customerCategory = userContext.userProps?.customerCategory;
  const rawWorkflows = getWorkflowsFromGraph(val.nodes, val.edges) || [];

  const [workflows, setWorkflows] = useState<WorkflowNode[][]>(rawWorkflows);
  const [open, setOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<number | null>(null);

  useEffect(() => {
    if (workflows && workflows.length > 0) {
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
        cost: calculateWorkflowCost(workflow)
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

  const getNodeCost = (node: WorkflowNode) => {
    return calculateServiceCost(
      {
        pricingMode: node.data.pricingMode,
        price: node.data.price,
        internalPrice: (node.data as any).internalPrice,
        externalPrice: (node.data as any).externalPrice,
        externalAcademicPrice: (node.data as any).externalAcademicPrice,
        externalMarketPrice: (node.data as any).externalMarketPrice,
        externalNoSalaryPrice: (node.data as any).externalNoSalaryPrice,
        pricing: (node.data as any).pricing,
        parameters: node.data.parameters
      },
      node.data.formData,
      node.data.price,
      customerCategory
    );
  };

  const calculateWorkflowCost = (workflow: WorkflowNode[]) => {
    return workflow.reduce((total, node) => total + getNodeCost(node), 0);
  };

  const formatPriceLabel = (price: number | null | undefined): string => {
    if (!price) return "[Price Pending Review]";
    if (price >= 0) {
      return `$${price.toFixed(2)}`;
    } else {
      return "[Price Pending Review]";} // handles all 3 cases of price
  }

  const formatParameterValue = (value: unknown): string => {
    if (Array.isArray(value)) {
      return value.map((item) => formatParameterValue(item)).join(', ');
    }
    if (value === null || value === undefined || value === '') {
      return '';
    }
    if (typeof value === 'object') {
      const v = value as any;
      // Pending file metadata object from file parameters during checkout.
      if (typeof v.filename === 'string' && v.filename.trim() !== '') {
        return v.filename;
      }
      // Uploaded file metadata may be serialized JSON string elsewhere, but if object sneaks through,
      // still try a readable fallback.
      if (typeof v.name === 'string' && v.name.trim() !== '') {
        return v.name;
      }
      return '[File attached]';
    }
    return String(value);
  };

  const formatParameterDisplayValue = (parameterDef: any, value: unknown): string => {
    const base = formatParameterValue(value);
    if (!parameterDef || parameterDef.type !== 'dropdown') {
      return base;
    }

    const options = Array.isArray(parameterDef.options) ? parameterDef.options : [];
    const optionNameById = new Map(
      options
        .filter((opt: any) => opt && typeof opt.id === 'string')
        .map((opt: any) => [String(opt.id), String(opt.name ?? opt.id)] as const)
    );

    const mapOne = (raw: unknown): string => {
      const key = String(raw ?? '');
      return optionNameById.get(key) ?? formatParameterValue(raw);
    };

    if (Array.isArray(value)) {
      return value.map((v) => mapOne(v)).join(', ');
    }
    return mapOne(value);
  };


  const groupServicesByLabel = (workflow: WorkflowNode[]) => {
    return workflow.reduce((acc, node) => {
      const label = node.data.label;
      const nodeCost = getNodeCost(node);
      if (!acc[label]) {
        acc[label] = {
          count: 1,
          cost: nodeCost,
          nodes: [node]  // Store array of nodes instead of single node
        };
      } else {
        acc[label].count += 1;
        acc[label].cost += nodeCost;
        acc[label].nodes.push(node);  // Add node to array
      }
      return acc;
    }, {} as { [key: string]: { count: number; cost: number; nodes: WorkflowNode[] } });
  };

  const calculateTotalJobCost = (workflows: WorkflowNode[][]) => {
    return workflows.reduce((total, workflow) => {
      return total + calculateWorkflowCost(workflow);
    }, 0);
  };

  const getParameterLineItems = (node: WorkflowNode) => {
    const parameters = node.data.parameters || [];
    const formData = node.data.formData || [];
    const formDataMap = new Map(formData.map((entry) => [entry.id, entry.value]));

    const normalizePrice = (value: unknown): number | undefined => {
      if (typeof value === 'number' && Number.isFinite(value)) return value;
      if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : undefined;
      }
      return undefined;
    };

    const resolveCategoryPrice = (obj: any): number | undefined => {
      const pricing = obj?.pricing;
      if (customerCategory === 'INTERNAL_CUSTOMERS') {
        const p = normalizePrice(pricing?.internal ?? obj?.internalPrice);
        if (p !== undefined) return p;
      } else if (customerCategory === 'EXTERNAL_CUSTOMER_ACADEMIC') {
        const p = normalizePrice(pricing?.externalAcademic ?? pricing?.external ?? obj?.externalAcademicPrice ?? obj?.externalPrice);
        if (p !== undefined) return p;
      } else if (customerCategory === 'EXTERNAL_CUSTOMER_MARKET') {
        const p = normalizePrice(pricing?.externalMarket ?? pricing?.external ?? obj?.externalMarketPrice ?? obj?.externalPrice);
        if (p !== undefined) return p;
      } else if (customerCategory === 'EXTERNAL_CUSTOMER_NO_SALARY') {
        const p = normalizePrice(pricing?.externalNoSalary ?? pricing?.external ?? obj?.externalNoSalaryPrice ?? obj?.externalPrice);
        if (p !== undefined) return p;
      }
      return normalizePrice(pricing?.legacy ?? obj?.price);
    };

    const items: {
      id: string;
      name: string;
      count: number;
      unitPrice: number;
      total: number;
      pricingExplanation?: string;
    }[] = [];

    parameters.forEach((param: any) => {
      if (!param || !param.id) return;

      const rawValue = formDataMap.get(param.id);
      const isMulti = param.allowMultipleValues === true || Array.isArray(rawValue);

      const options = Array.isArray(param.options) ? param.options : undefined;
      const hasOptionPricing =
        param.type === 'dropdown' &&
        options &&
        options.some(
          (opt: any) =>
            opt &&
            resolveCategoryPrice(opt) !== undefined
        );

      // When dropdown options have prices, show line items per option value.
      if (hasOptionPricing && options) {
        const valuesArray = Array.isArray(rawValue)
          ? rawValue
          : rawValue != null
          ? [rawValue]
          : [];

        valuesArray.forEach((v: any) => {
          if (v === null || v === undefined || v === '') return;
          const optId = String(v);
          const opt = options.find((o: any) => o && o.id === optId);
          if (!opt) return;
          const unitPrice = resolveCategoryPrice(opt);
          if (unitPrice === undefined) return;
          const pricingExplanation =
            typeof opt.pricingExplanation === 'string' && opt.pricingExplanation.trim() !== ''
              ? opt.pricingExplanation.trim()
              : undefined;

          items.push({
            id: `${param.id}:${optId}`,
            name: `${param.name} – ${opt.name ?? optId}`,
            count: 1,
            unitPrice,
            total: unitPrice,
            pricingExplanation
          });
        });

        return;
      }

      // Fallback: parameter-level pricing (original behavior).
      const unitPrice = resolveCategoryPrice(param);
      if (unitPrice === undefined) return;

      let count = 0;
      if (isMulti) {
        if (Array.isArray(rawValue)) count = rawValue.length;
        else if (rawValue !== null && rawValue !== undefined) count = 1;
      } else if (rawValue !== null && rawValue !== undefined) {
        count = 1;
      }
      if (count === 0) return;

      items.push({
        id: param.id,
        name: param.name,
        count,
        unitPrice,
        total: unitPrice * count,
        pricingExplanation:
          typeof param.pricingExplanation === 'string' && param.pricingExplanation.trim() !== ''
            ? param.pricingExplanation.trim()
            : undefined
      });
    });

    return items;
  };


  return (
    <div>
      <Box sx={{ mb: 3, width: '30%' }}>
        <Typography
          variant="h4"
          sx={(theme) => ({
            textAlign: 'left',
            fontWeight: 500,
            fontSize: '1.75rem',
            borderBottom: `2px solid ${theme.palette.secondary.main}`,
            paddingBottom: '8px'
          })}
        >
          Your Job
        </Typography>
      </Box>
              
      {/* Edit & Remove Buttons */}
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
      <Grid item xs={12} md={5} space key={index}>
        <Item sx={{ minHeight: 'unset' }}>
          {/* Top row: Title with cost + actions */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              m: 1.5,
            }}
          >
            <Typography variant="h6" color="textPrimary">
              Workflow {index + 1} ({`~$${calculateWorkflowCost(workflow).toFixed(2)}`})
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                size="medium"
                variant="outlined"
                color="primary"
                onClick={() => handleOpen(index)}
              >
                Review
              </Button>
              <Button
                size="medium"
                variant="outlined"
                color="error"
                onClick={() => handleRemoveWorkflow(index)}
              >
                Remove
              </Button>
            </Box>

            {/* Review Modal */}
            <Modal
              open={open}
              onClose={handleClose}
              aria-labelledby="workflow-review-modal"
            >
              <Box
                sx={{
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
                }}
              >
                <Button
                  onClick={handleClose}
                  sx={{
                    position: 'absolute',
                    top: 20,
                    right: 20
                  }}
                >
                  Close
                </Button>

                <Typography variant="h6">
                  Review Workflow {selectedWorkflow !== null ? selectedWorkflow + 1 : ""}
                </Typography>
              </Box>
            </Modal>
          </Box>

          <Divider sx={{ my: 2}}/>
          
          {/* Accordion Section */}
          <Accordion
            elevation={0}
            sx={{
              '& .MuiAccordionSummary-content': { margin: '8px 0' },
              '&:before': { display: 'none' }
            }}
          >
            <AccordionSummary
              expandIcon={<ArrowDropDownIcon />}
              sx={{
                minHeight: '40px',
                '& .MuiTypography-root': { fontSize: '0.875rem', fontWeight: 500 },
                mt: -1
              }}
            >
              <Typography variant="subtitle1" color="textSecondary">Workflow details</Typography>
            </AccordionSummary>

            <AccordionDetails>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  width: '100%',
                  mb: 2
                }}
              >
                <Typography variant="body2" color="text.primary">
                  Processes
                </Typography>
                <Typography variant="body2" color="text.primary" sx={{ fontWeight: 500 }}>
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
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%'
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>{label}</span>
                            {service.count > 1 && (
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ ml: 1, fontSize: '0.875rem' }}
                              >
                                (×{service.count})
                              </Typography>
                            )}
                          </Box>
                          <Typography variant="body2" color="text.secondary">
                            {formatPriceLabel(service.cost)}
                          </Typography>
                        </Box>
                      }
                      secondary={
                        <Box sx={{ mt: 1 }}>
                          {service.nodes.map((node, index) => (
                            <Box key={node.id}>
                              <Stack spacing={0.5} sx={{ ml: service.count > 1 ? 0 : 2 }}>
                                {service.count > 1 && (
                                  <Typography variant="body2" color="text.secondary">
                                    Service {index + 1}:
                                  </Typography>
                                )}
                                <Box sx={{ ml: service.count > 1 ? 2 : 0 }}>
                                  {node.data.pricingMode === 'PARAMETER' && (
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{ fontSize: '0.875rem' }}
                                    >
                                      Estimated cost: {formatPriceLabel(getNodeCost(node))}
                                    </Typography>
                                  )}
                                  {node.data?.formData?.map((param) => {
                                    const paramDef = (node.data.parameters || []).find((p: any) => p?.id === param.id);
                                    return (
                                    <Typography
                                      key={param.id}
                                      variant="body2"
                                      color="text.secondary"
                                      sx={{ fontSize: '0.875rem' }}
                                    >
                                      {param.name}: {formatParameterDisplayValue(paramDef, param.value)}
                                    </Typography>
                                    );
                                  })}
                                  {node.data.pricingMode === 'PARAMETER' && (
                                    <Box sx={{ mt: 0.5 }}>
                                      {getParameterLineItems(node).map((item) => (
                                        <Box key={item.id} sx={{ mb: item.pricingExplanation ? 0.5 : 0 }}>
                                          <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{ fontSize: '0.8rem' }}
                                          >
                                            {item.name}: {item.count} × ${item.unitPrice.toFixed(2)} = ${item.total.toFixed(2)}
                                          </Typography>
                                          {item.pricingExplanation ? (
                                            <Typography
                                              variant="body2"
                                              color="text.secondary"
                                              sx={{ fontSize: '0.78rem', fontStyle: 'italic' }}
                                            >
                                              {item.pricingExplanation}
                                            </Typography>
                                          ) : null}
                                        </Box>
                                      ))}
                                    </Box>
                                  )}
                                </Box>
                              </Stack>
                            </Box>
                          ))}
                        </Box>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>

        </Item>

      </Grid>
      ))}
      
      </Grid>  
      )}
      
    {/* Order Summary */}
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
        Order Summary
      </Typography>

      <Box>
        <Box sx={{maxHeight: 'calc(100vh - 400px)', overflowY: 'auto', pr: 1}}>
        {workflows.map((workflow, index) => (
          <Box key={index} sx={{ mb: 3}}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 1
              }}
            >
              <Typography variant="h6" sx={{ fontSize: '1.1rem', fontWeight: 500, mb: -2 }}>
                Workflow {index + 1}
              </Typography>
              {/*<Typography variant="subtitle1" sx={{ fontSize: '0.875rem' }}>
                ${calculateServiceCost(workflow).toFixed(2)}
              </Typography>*/}
            </Box>

            <List dense>
              {workflow.map((node) => (
                <ListItem
                  key={node.id}
                  sx={{ pl: 2, display: 'flex', justifyContent: 'space-between' }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <ListItemIcon sx={{ minWidth: '30px' }}>
                      <CircleIcon sx={{ fontSize: '0.5rem' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Typography sx={{ fontSize: '0.85rem' }}>
                          {node.data.label}
                        </Typography>
                      }
                    />
                  </Box>
                  <Typography
                    variant="body2"
                    sx={{ fontSize: '0.85rem', textAlign: 'right', minWidth: '80px' }}
                  >
                    {formatPriceLabel(getNodeCost(node))}
                  </Typography>
                </ListItem>
              ))}
            </List>
          </Box>
        ))}
      </Box>

        <Divider sx={{ my: 2 }} />
        
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 1
          }}
        >
          <Typography variant="h6" fontWeight="bold">
            Estimated Cost*
          </Typography>
          <Typography variant="h6" fontWeight="bold">
            ${calculateTotalJobCost(workflows).toFixed(2)}
          </Typography>
        </Box>

        <Alert
          severity="info" color="error" sx={{ mb: 3, borderRadius: 2}}
        >
          *This cost is subject to lab review. Final pricing is likely to vary.
        </Alert>

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