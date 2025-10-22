// SOWGeneratorModal.tsx - Modal component for generating Statement of Work
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Card,
  CardContent,
  Divider,
  Alert,
  IconButton,
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PreviewIcon from '@mui/icons-material/Preview';
import EditIcon from '@mui/icons-material/Edit';
import { PDFDownloadLink } from '@react-pdf/renderer';

import { SOWData, SOWTechnicianInputs, SOWPricingAdjustment, SOWEditableSections } from '../types/SOWTypes';
import { generateSOWData, getTeamMembers, storeSOW } from '../utils/sowGenerator';
import SOWDocument from './SOWDocument';

interface SOWGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  jobData: any; // Job data from GraphQL query
}

const SOWGeneratorModal: React.FC<SOWGeneratorModalProps> = ({ open, onClose, jobData }) => {
  const [technicianInputs, setTechnicianInputs] = useState<SOWTechnicianInputs>({
    projectManager: '',
    projectLead: '',
    startDate: new Date().toISOString().split('T')[0],
    duration: 14,
    pricingAdjustments: [],
    specialInstructions: '',
    clientProjectManager: '',
    clientCostCenter: '',
  });

  const [generatedSOW, setGeneratedSOW] = useState<SOWData | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [editableSections, setEditableSections] = useState<SOWEditableSections>({
    scopeOfWork: '',
    deliverables: [],
    services: [],
    additionalInformation: '',
  });
  const [isEditingContent, setIsEditingContent] = useState(false);

  const teamMembers = getTeamMembers();

  // Generate SOW data whenever inputs change
  useEffect(() => {
    if (jobData && technicianInputs.projectManager && technicianInputs.projectLead) {
      try {
        const sowData = generateSOWData(jobData, technicianInputs);
        setGeneratedSOW(sowData);
        
        // Initialize editable sections from generated data
        setEditableSections({
          scopeOfWork: sowData.scopeOfWork,
          deliverables: sowData.deliverables,
          services: sowData.services,
          additionalInformation: '',
        });
      } catch (error) {
        console.error('Error generating SOW:', error);
      }
    }
  }, [jobData, technicianInputs]);

  const handleInputChange = (field: keyof SOWTechnicianInputs, value: any) => {
    setTechnicianInputs(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // Clear errors when user makes changes
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const addPricingAdjustment = () => {
    const newAdjustment: SOWPricingAdjustment = {
      id: `adj-${Date.now()}`,
      type: 'discount',
      description: '',
      amount: 0,
      reason: '',
    };
    
    setTechnicianInputs(prev => ({
      ...prev,
      pricingAdjustments: [...prev.pricingAdjustments, newAdjustment],
    }));
  };

  const removePricingAdjustment = (id: string) => {
    setTechnicianInputs(prev => ({
      ...prev,
      pricingAdjustments: prev.pricingAdjustments.filter(adj => adj.id !== id),
    }));
  };

  const updatePricingAdjustment = (id: string, field: keyof SOWPricingAdjustment, value: any) => {
    setTechnicianInputs(prev => ({
      ...prev,
      pricingAdjustments: prev.pricingAdjustments.map(adj =>
        adj.id === id ? { ...adj, [field]: value } : adj
      ),
    }));
  };

  const validateInputs = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!technicianInputs.projectManager) {
      newErrors.projectManager = 'Project Manager is required';
    }
    if (!technicianInputs.projectLead) {
      newErrors.projectLead = 'Project Lead is required';
    }
    if (!technicianInputs.startDate) {
      newErrors.startDate = 'Start date is required';
    }
    if (technicianInputs.duration <= 0) {
      newErrors.duration = 'Duration must be greater than 0';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleGenerateSOW = () => {
    const finalSOWData = getFinalSOWData();
    if (!validateInputs() || !finalSOWData) {
      return;
    }

    // Store the SOW in localStorage
    storeSOW(finalSOWData);
    
    // Close modal and show success message
    onClose();
    // Could add a success notification here
  };

  const handleReviewSOW = () => {
    if (!validateInputs()) {
      return;
    }
    setShowPreview(true);
  };

  const handleClosePreview = () => {
    setShowPreview(false);
  };

  const getFinalSOWData = (): SOWData | null => {
    if (!generatedSOW) return null;
    
    return {
      ...generatedSOW,
      scopeOfWork: editableSections.scopeOfWork,
      deliverables: editableSections.deliverables,
      services: editableSections.services,
      additionalInformation: editableSections.additionalInformation,
    };
  };

  if (!jobData) {
    return null;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
        <DialogTitle>
          <Typography variant="h5">Generate Statement of Work</Typography>
          <Typography variant="subtitle2" color="text.secondary">
            Job: {jobData.name} (ID: {jobData.id})
          </Typography>
        </DialogTitle>

        <DialogContent>
          {showPreview && getFinalSOWData() ? (
            (() => {
              const finalSOWData = getFinalSOWData();
              if (!finalSOWData) return null;
              return (
              <Box>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">SOW Ready for Download</Typography>
                  <Box>
                    <Button
                      variant="outlined"
                      startIcon={<PreviewIcon />}
                      onClick={handleClosePreview}
                      sx={{ mr: 1 }}
                    >
                      Back to Edit
                    </Button>
                    <PDFDownloadLink
                      document={<SOWDocument sowData={finalSOWData} />}
                      fileName={`SOW-${finalSOWData.sowNumber.replace(' ', '-')}-${jobData.name}.pdf`}
                    >
                      {({ blob, url, loading, error }) => (
                        <Button
                          variant="contained"
                          color="primary"
                          disabled={loading}
                        >
                          {loading ? 'Generating...' : 'Download SOW'}
                        </Button>
                      )}
                    </PDFDownloadLink>
                  </Box>
                </Box>
              
              {/* SOW Summary Preview */}
              <Card sx={{ p: 3, mb: 2 }}>
                <Typography variant="h6" gutterBottom>SOW Summary</Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                  <Box sx={{ flex: '1 1 300px' }}>
                    <Typography variant="body2"><strong>SOW Number:</strong> {finalSOWData.sowNumber}</Typography>
                    <Typography variant="body2"><strong>Client:</strong> {finalSOWData.clientName}</Typography>
                    <Typography variant="body2"><strong>Email:</strong> {finalSOWData.clientEmail}</Typography>
                    <Typography variant="body2"><strong>Institution:</strong> {finalSOWData.clientInstitution}</Typography>
                  </Box>
                  <Box sx={{ flex: '1 1 300px' }}>
                    <Typography variant="body2"><strong>Project Manager:</strong> {finalSOWData.resources.projectManager}</Typography>
                    <Typography variant="body2"><strong>Project Lead:</strong> {finalSOWData.resources.projectLead}</Typography>
                    <Typography variant="body2"><strong>Timeline:</strong> {finalSOWData.timeline.startDate} - {finalSOWData.timeline.endDate}</Typography>
                    <Typography variant="body2"><strong>Total Cost:</strong> ${finalSOWData.pricing.totalCost.toLocaleString()}</Typography>
                  </Box>
                </Box>
                
                <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}><strong>Scope of Work:</strong></Typography>
                <Typography variant="body2" sx={{ mb: 2 }}>{finalSOWData.scopeOfWork}</Typography>
                
                <Typography variant="subtitle1" sx={{ mb: 1 }}><strong>Deliverables:</strong></Typography>
                <ul>
                  {finalSOWData.deliverables.map((deliverable, index) => (
                    <li key={index}><Typography variant="body2">{deliverable}</Typography></li>
                  ))}
                </ul>
              </Card>
              
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  Click "Download SOW" to generate and download the complete PDF document. 
                  The PDF will contain all the details shown above plus the full legal terms and signature sections.
                </Typography>
              </Alert>
            </Box>
              );
            })()
          ) : (
            <Box>
              {/* Auto-populated information display */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Auto-Populated Information
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flex: '1 1 300px' }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Client:</strong> {jobData.username}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Email:</strong> {jobData.email}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Institution:</strong> {jobData.institute}
                      </Typography>
                    </Box>
                    <Box sx={{ flex: '1 1 300px' }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Services:</strong> {jobData.workflows?.[0]?.nodes?.length || 0} service(s)
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        <strong>Estimated Base Cost:</strong> ${generatedSOW?.pricing.baseCost || 0}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
                {/* Team Assignment */}
                <Box sx={{ flex: '1 1 400px' }}>
                  <Typography variant="h6" gutterBottom>
                    Team Assignment
                  </Typography>
                  <FormControl fullWidth error={!!errors.projectManager} sx={{ mb: 2 }}>
                    <InputLabel>Project Manager</InputLabel>
                    <Select
                      value={technicianInputs.projectManager}
                      onChange={(e) => handleInputChange('projectManager', e.target.value)}
                      label="Project Manager"
                    >
                      {teamMembers.map((member) => (
                        <MenuItem key={member.id} value={member.name}>
                          {member.name} - {member.title}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.projectManager && (
                      <Typography variant="caption" color="error">
                        {errors.projectManager}
                      </Typography>
                    )}
                  </FormControl>

                  <FormControl fullWidth error={!!errors.projectLead}>
                    <InputLabel>Project Lead</InputLabel>
                    <Select
                      value={technicianInputs.projectLead}
                      onChange={(e) => handleInputChange('projectLead', e.target.value)}
                      label="Project Lead"
                    >
                      {teamMembers.map((member) => (
                        <MenuItem key={member.id} value={member.name}>
                          {member.name} - {member.title}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.projectLead && (
                      <Typography variant="caption" color="error">
                        {errors.projectLead}
                      </Typography>
                    )}
                  </FormControl>
                </Box>

                {/* Timeline */}
                <Box sx={{ flex: '1 1 400px' }}>
                  <Typography variant="h6" gutterBottom>
                    Timeline
                  </Typography>
                  <DatePicker
                    label="Start Date"
                    value={new Date(technicianInputs.startDate)}
                    onChange={(date) => handleInputChange('startDate', date?.toISOString().split('T')[0] || '')}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.startDate,
                        helperText: errors.startDate,
                        sx: { mb: 2 }
                      }
                    }}
                  />

                  <TextField
                    fullWidth
                    label="Duration (days)"
                    type="number"
                    value={technicianInputs.duration}
                    onChange={(e) => handleInputChange('duration', parseInt(e.target.value) || 0)}
                    error={!!errors.duration}
                    helperText={errors.duration}
                  />
                </Box>

              </Box>

              {/* Pricing Adjustments */}
              <Box sx={{ mt: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Typography variant="h6">
                    Pricing Adjustments
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={addPricingAdjustment}
                    size="small"
                  >
                    Add Adjustment
                  </Button>
                </Box>

                {technicianInputs.pricingAdjustments.map((adjustment) => (
                  <Card key={adjustment.id} sx={{ mb: 2 }}>
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="subtitle1">
                          Pricing Adjustment
                        </Typography>
                        <IconButton
                          size="small"
                          onClick={() => removePricingAdjustment(adjustment.id)}
                          color="error"
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Box>

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                        <Box sx={{ flex: '1 1 200px' }}>
                          <FormControl fullWidth>
                            <InputLabel>Type</InputLabel>
                            <Select
                              value={adjustment.type}
                              onChange={(e) => updatePricingAdjustment(adjustment.id, 'type', e.target.value)}
                              label="Type"
                            >
                              <MenuItem value="discount">Discount</MenuItem>
                              <MenuItem value="additional_cost">Additional Cost</MenuItem>
                              <MenuItem value="special_term">Special Term</MenuItem>
                            </Select>
                          </FormControl>
                        </Box>
                        <Box sx={{ flex: '1 1 250px' }}>
                          <TextField
                            fullWidth
                            label="Description"
                            value={adjustment.description}
                            onChange={(e) => updatePricingAdjustment(adjustment.id, 'description', e.target.value)}
                          />
                        </Box>
                        <Box sx={{ flex: '1 1 150px' }}>
                          <TextField
                            fullWidth
                            label="Amount"
                            type="number"
                            value={adjustment.amount}
                            onChange={(e) => updatePricingAdjustment(adjustment.id, 'amount', parseFloat(e.target.value) || 0)}
                          />
                        </Box>
                        <Box sx={{ flex: '1 1 200px' }}>
                          <TextField
                            fullWidth
                            label="Reason"
                            value={adjustment.reason || ''}
                            onChange={(e) => updatePricingAdjustment(adjustment.id, 'reason', e.target.value)}
                          />
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                ))}

                  {generatedSOW && (
                    <Card sx={{ mt: 2 }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Pricing Summary
                        </Typography>
                        <Typography variant="body2">
                          Base Cost: ${generatedSOW.pricing.baseCost.toLocaleString()}
                        </Typography>
                        {generatedSOW.pricing.adjustments.map((adj, index) => (
                          <Typography key={index} variant="body2">
                            {adj.type === 'discount' ? '-' : '+'} ${adj.amount.toLocaleString()} - {adj.description}
                          </Typography>
                        ))}
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="h6">
                          Total Cost: ${generatedSOW.pricing.totalCost.toLocaleString()}
                        </Typography>
                      </CardContent>
                    </Card>
                  )}

              {/* Additional Information */}
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Additional Information
                </Typography>
                <TextField
                  fullWidth
                  label="Client Project Manager"
                  value={technicianInputs.clientProjectManager}
                  onChange={(e) => handleInputChange('clientProjectManager', e.target.value)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label="Client Cost Center"
                  value={technicianInputs.clientCostCenter}
                  onChange={(e) => handleInputChange('clientCostCenter', e.target.value)}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Special Instructions"
                  value={technicianInputs.specialInstructions}
                  onChange={(e) => handleInputChange('specialInstructions', e.target.value)}
                />
              </Box>

              {/* SOW Content Editing */}
              {isEditingContent && (
                <Card sx={{ mt: 3, p: 2, backgroundColor: '#f5f5f5' }}>
                  <Typography variant="h6" gutterBottom>
                    Edit SOW Content
                  </Typography>
                  
                  {/* Scope of Work Editor */}
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Scope of Work"
                    value={editableSections.scopeOfWork}
                    onChange={(e) => setEditableSections({
                      ...editableSections,
                      scopeOfWork: e.target.value
                    })}
                    sx={{ mb: 2 }}
                  />
                  
                  {/* Deliverables Editor */}
                  <Typography variant="subtitle1" sx={{ mb: 1 }}>Deliverables</Typography>
                  {editableSections.deliverables.map((deliverable, index) => (
                    <Box key={index} display="flex" gap={1} mb={1}>
                      <TextField
                        fullWidth
                        value={deliverable}
                        onChange={(e) => {
                          const newDeliverables = [...editableSections.deliverables];
                          newDeliverables[index] = e.target.value;
                          setEditableSections({...editableSections, deliverables: newDeliverables});
                        }}
                      />
                      <IconButton
                        onClick={() => {
                          const newDeliverables = editableSections.deliverables.filter((_, i) => i !== index);
                          setEditableSections({...editableSections, deliverables: newDeliverables});
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </Box>
                  ))}
                  <Button
                    startIcon={<AddIcon />}
                    onClick={() => setEditableSections({
                      ...editableSections,
                      deliverables: [...editableSections.deliverables, '']
                    })}
                  >
                    Add Deliverable
                  </Button>
                  
                  {/* Services Editor - only descriptions */}
                  <Typography variant="subtitle1" sx={{ mt: 2, mb: 1 }}>Services</Typography>
                  {editableSections.services.map((service, index) => (
                    <Card key={service.id} sx={{ mb: 1, p: 1 }}>
                      <Typography variant="body2" fontWeight="bold">{service.name}</Typography>
                      <TextField
                        fullWidth
                        size="small"
                        label="Description"
                        value={service.description}
                        onChange={(e) => {
                          const newServices = [...editableSections.services];
                          newServices[index] = {...service, description: e.target.value};
                          setEditableSections({...editableSections, services: newServices});
                        }}
                        sx={{ mt: 1 }}
                      />
                    </Card>
                  ))}
                  
                  {/* Additional Information */}
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Additional Information (Optional)"
                    value={editableSections.additionalInformation}
                    onChange={(e) => setEditableSections({
                      ...editableSections,
                      additionalInformation: e.target.value
                    })}
                    helperText="Add any custom information that doesn't fit in standard sections"
                    sx={{ mt: 2 }}
                  />
                </Card>
              )}
            </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose}>
            Cancel
          </Button>
          {!showPreview && (
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setIsEditingContent(!isEditingContent)}
            >
              {isEditingContent ? 'Done Editing' : 'Edit Content'}
            </Button>
          )}
          {!showPreview && (
            <Button
              variant="outlined"
              startIcon={<PreviewIcon />}
              onClick={handleReviewSOW}
              disabled={!getFinalSOWData()}
            >
              Review SOW
            </Button>
          )}
          {!showPreview && (
            <Button
              variant="contained"
              onClick={handleGenerateSOW}
              disabled={!getFinalSOWData()}
            >
              Generate & Save SOW
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </LocalizationProvider>
  );
};

export default SOWGeneratorModal;
