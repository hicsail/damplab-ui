import React, { useState } from 'react';
import {
  Box,
  Typography,
  Alert,
  Snackbar
} from '@mui/material';
import {
  GridRowEditStopReasons,
  GridEventListener,
  GridRowModel
} from '@mui/x-data-grid';

// Import custom hooks
import { useFileUpload, useTemplateManager, useDataManager } from './hooks';

// Import components
import FileUploadSection from './FileUploadSection';
import DataGridSection from './DataGridSection';
import CopyDataDialog from './CopyDataDialog';
import TemplateDialogs from './TemplateDialogs';
import ColumnManagerDialog from './ColumnManagerDialog';

// Import types and utilities
import { AlertState } from './types';
import { generateCopyData } from './utils';

export default function DataTranslation() {
  // State for UI
  const [alert, setAlert] = useState<AlertState>({ open: false, message: '', severity: 'success' });
  
  // Copy dialog state
  const [copyDialog, setCopyDialog] = useState(false);
  const [copyData, setCopyData] = useState('');
  const [copyIncludesHeaders, setCopyIncludesHeaders] = useState(true);
  
  // Template dialog state
  const [templateDialog, setTemplateDialog] = useState(false);
  const [saveTemplateDialog, setSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  
  // Column manager state
  const [columnManagerDialog, setColumnManagerDialog] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnDefaultValue, setNewColumnDefaultValue] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Custom hooks
  const { isProcessing, fileInputRef, handleFileUpload, triggerFileInput } = useFileUpload();
  const { savedTemplates, saveTemplate, applyTemplate, deleteTemplate } = useTemplateManager();
  const {
    fileData,
    setFileData,
    rowModesModel,
    setRowModesModel,
    handleColumnDelete,
    handleColumnRename,
    handleColumnReorder,
    handleColumnManagerReorder,
    handleAddNewColumn,
    processRowUpdate
  } = useDataManager();

  // Event handlers
  const handleFileUploadEvent = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file, setFileData, setAlert);
    }
  };

  const handleRowEditStop: GridEventListener<'rowEditStop'> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const handleCopyData = () => {
    if (!fileData) return;
    
    // Start with headers by default
    setCopyIncludesHeaders(true);
    const data = generateCopyData(fileData, true);
    setCopyData(data);
    setCopyDialog(true);
  };

  const handleToggleCopyHeaders = (includeHeaders: boolean) => {
    if (!fileData) return;
    
    const data = generateCopyData(fileData, includeHeaders);
    setCopyData(data);
    setCopyIncludesHeaders(includeHeaders);
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(copyData);
      setAlert({
        open: true,
        message: `Data ${copyIncludesHeaders ? 'with headers' : '(data only)'} copied to clipboard! You can now paste it into eLabs bulk uploader.`,
        severity: 'success'
      });
      setCopyDialog(false);
    } catch (error) {
      setAlert({
        open: true,
        message: 'Failed to copy to clipboard. Please copy manually from the dialog.',
        severity: 'error'
      });
    }
  };

  // Template handlers
  const handleSaveTemplate = () => {
    if (fileData && templateName.trim()) {
      saveTemplate(templateName.trim(), templateDescription.trim(), fileData, setAlert);
      setSaveTemplateDialog(false);
      setTemplateName('');
      setTemplateDescription('');
    }
  };

  const handleApplyTemplate = (template: any) => {
    if (fileData) {
      applyTemplate(template, fileData, setFileData, setAlert);
      setTemplateDialog(false);
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    deleteTemplate(templateId, setAlert);
  };

  // Column manager handlers
  const handleColumnManagerClose = () => {
    setColumnManagerDialog(false);
    setNewColumnName('');
    setNewColumnDefaultValue('');
    setDraggedIndex(null);
  };

  const handleAddNewColumnClick = () => {
    if (fileData) {
      handleAddNewColumn(newColumnName, newColumnDefaultValue, setAlert);
      setNewColumnName('');
      setNewColumnDefaultValue('');
    }
  };

  const handleColumnNameUpdate = (field: string, newName: string) => {
    if (fileData && newName.trim()) {
      handleColumnRename(field, newName.trim());
    }
  };

  const handleColumnDeleteFromManager = (field: string) => {
    if (fileData) {
      const columnToDelete = fileData.columns.find(col => col.field === field);
      handleColumnDelete(field, setAlert);
      if (columnToDelete) {
        setAlert({
          open: true,
          message: `Column "${columnToDelete.headerName}" deleted successfully.`,
          severity: 'success'
        });
      }
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: '100%', margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Abbott Blood Testing Data Translation
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Upload your Abbott blood testing machine data file to edit, reorder, and prepare it for eLabs bulk upload.
      </Typography>

      {/* File Upload Section */}
      <FileUploadSection
        fileInputRef={fileInputRef}
        isProcessing={isProcessing}
        savedTemplates={savedTemplates}
        onFileUpload={handleFileUploadEvent}
        onTriggerFileInput={triggerFileInput}
        onOpenTemplateDialog={() => setTemplateDialog(true)}
      />

      {/* Data Display and Edit Section */}
      {fileData && (
        <DataGridSection
          fileData={fileData}
          rowModesModel={rowModesModel}
          savedTemplates={savedTemplates}
          onRowModesModelChange={setRowModesModel}
          onRowEditStop={handleRowEditStop}
          onProcessRowUpdate={processRowUpdate}
          onColumnReorder={(field, direction) => handleColumnReorder(field, direction, setAlert)}
          onColumnRename={handleColumnRename}
          onColumnDelete={(field) => handleColumnDelete(field, setAlert)}
          onOpenColumnManager={() => setColumnManagerDialog(true)}
          onOpenTemplateDialog={() => setTemplateDialog(true)}
          onOpenSaveTemplateDialog={() => setSaveTemplateDialog(true)}
          onCopyData={handleCopyData}
        />
      )}

      {/* Copy Dialog */}
      <CopyDataDialog
        open={copyDialog}
        copyData={copyData}
        includesHeaders={copyIncludesHeaders}
        onClose={() => setCopyDialog(false)}
        onToggleHeaders={handleToggleCopyHeaders}
        onCopyToClipboard={copyToClipboard}
      />

      {/* Template Dialogs */}
      <TemplateDialogs
        saveDialogOpen={saveTemplateDialog}
        templateName={templateName}
        templateDescription={templateDescription}
        onSaveDialogClose={() => {
          setSaveTemplateDialog(false);
          setTemplateName('');
          setTemplateDescription('');
        }}
        onTemplateNameChange={setTemplateName}
        onTemplateDescriptionChange={setTemplateDescription}
        onSaveTemplate={handleSaveTemplate}
        loadDialogOpen={templateDialog}
        savedTemplates={savedTemplates}
        onLoadDialogClose={() => setTemplateDialog(false)}
        onApplyTemplate={handleApplyTemplate}
        onDeleteTemplate={handleDeleteTemplate}
      />

      {/* Column Manager Dialog */}
      {fileData && (
        <ColumnManagerDialog
          open={columnManagerDialog}
          columns={fileData.columns}
          newColumnName={newColumnName}
          newColumnDefaultValue={newColumnDefaultValue}
          draggedIndex={draggedIndex}
          onClose={handleColumnManagerClose}
          onNewColumnNameChange={setNewColumnName}
          onNewColumnDefaultValueChange={setNewColumnDefaultValue}
          onAddNewColumn={handleAddNewColumnClick}
          onColumnNameUpdate={handleColumnNameUpdate}
          onColumnDelete={handleColumnDeleteFromManager}
          onDragStart={(index) => setDraggedIndex(index)}
          onDragEnd={() => setDraggedIndex(null)}
          onDrop={handleColumnManagerReorder}
          setDraggedIndex={setDraggedIndex}
        />
      )}

      {/* Alert Snackbar */}
      <Snackbar
        open={alert.open}
        autoHideDuration={6000}
        onClose={() => setAlert({ ...alert, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={() => setAlert({ ...alert, open: false })} 
          severity={alert.severity}
          variant="filled"
        >
          {alert.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
