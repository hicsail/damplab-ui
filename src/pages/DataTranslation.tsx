import React, { useState, useRef } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Stack,
  IconButton,
  Tooltip,
  TextField,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRowsProp,
  GridRowModesModel,
  GridRowModes,
  GridRowId,
  GridEventListener,
  GridRowEditStopReasons,
  GridRowModel,
  GridSlots,
  useGridApiRef,
  GridColumnHeaderParams,
  GridRenderCellParams
} from '@mui/x-data-grid';
import {
  Upload as UploadIcon,
  ContentCopy as CopyIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  CloudUpload as CloudUploadIcon,
  TableView as TableViewIcon,
  BookmarkAdd as BookmarkAddIcon,
  Bookmark as BookmarkIcon,
  FolderOpen as FolderOpenIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  DragIndicator as DragIndicatorIcon,
  ViewHeadline as ViewHeadlineIcon,
  ViewStream as ViewStreamIcon,
  Tune as TuneIcon,
  Add as AddIcon,
  ViewColumn as ViewColumnIcon
} from '@mui/icons-material';
import * as XLSX from 'xlsx';

interface AlertState {
  open: boolean;
  message: string;
  severity: 'success' | 'error' | 'warning' | 'info';
}

interface FileData {
  fileName: string;
  columns: GridColDef[];
  rows: GridRowsProp;
}

interface Template {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  columnMapping: {
    field: string;
    headerName: string;
    type: string;
    width: number;
    order: number;
  }[];
}

export default function DataTranslation() {
  const [fileData, setFileData] = useState<FileData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rowModesModel, setRowModesModel] = useState<GridRowModesModel>({});
  const [alert, setAlert] = useState<AlertState>({ open: false, message: '', severity: 'success' });
  const [copyDialog, setCopyDialog] = useState(false);
  const [copyData, setCopyData] = useState('');
  const [copyIncludesHeaders, setCopyIncludesHeaders] = useState(true);
  const [templateDialog, setTemplateDialog] = useState(false);
  const [saveTemplateDialog, setSaveTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [savedTemplates, setSavedTemplates] = useState<Template[]>([]);
  const [columnManagerDialog, setColumnManagerDialog] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const [newColumnDefaultValue, setNewColumnDefaultValue] = useState('');
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridApiRef = useGridApiRef();

  // Load saved templates on component mount
  React.useEffect(() => {
    loadSavedTemplates();
  }, []);

  const loadSavedTemplates = () => {
    try {
      const templates = localStorage.getItem('abbott_data_templates');
      if (templates) {
        setSavedTemplates(JSON.parse(templates));
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  const saveTemplate = (name: string, description: string) => {
    if (!fileData) return;

    const template: Template = {
      id: `template_${Date.now()}`,
      name,
      description,
      createdAt: new Date().toISOString(),
      columnMapping: fileData.columns.map((col, index) => ({
        field: col.field,
        headerName: col.headerName || col.field,
        type: col.type || 'string',
        width: col.width || 150,
        order: index
      }))
    };

    const updatedTemplates = [...savedTemplates, template];
    setSavedTemplates(updatedTemplates);
    localStorage.setItem('abbott_data_templates', JSON.stringify(updatedTemplates));

    setAlert({
      open: true,
      message: `Template "${name}" saved successfully!`,
      severity: 'success'
    });
  };

  const applyTemplate = (template: Template) => {
    if (!fileData) return;

    // Create a mapping of original data to template columns, preserving order
    const templateColumns = template.columnMapping
      .sort((a, b) => a.order - b.order)
      .map(mapping => ({
        field: mapping.field,
        headerName: mapping.headerName,
        type: mapping.type as 'string' | 'number' | 'date',
        width: Math.max(mapping.width, 220), // Ensure minimum width for new controls
        minWidth: 220,
        editable: true,
        sortable: true,
        resizable: true
      }));

    // Filter rows to only include columns that exist in the template, maintaining order
    const templateFields = templateColumns.map(col => col.field);
    const filteredRows = fileData.rows.map(row => {
      const newRow: any = { id: row.id };
      templateFields.forEach(field => {
        if (row[field] !== undefined) {
          newRow[field] = row[field];
        } else {
          newRow[field] = '';
        }
      });
      return newRow;
    });

    setFileData({
      ...fileData,
      columns: templateColumns,
      rows: filteredRows
    });

    setAlert({
      open: true,
      message: `Template "${template.name}" applied successfully! Columns reordered and filtered.`,
      severity: 'success'
    });

    setTemplateDialog(false);
  };

  const deleteTemplate = (templateId: string) => {
    const updatedTemplates = savedTemplates.filter(t => t.id !== templateId);
    setSavedTemplates(updatedTemplates);
    localStorage.setItem('abbott_data_templates', JSON.stringify(updatedTemplates));

    setAlert({
      open: true,
      message: 'Template deleted successfully!',
      severity: 'success'
    });
  };

  const detectDataType = (value: any): 'number' | 'date' | 'string' => {
    if (value === null || value === undefined || value === '') return 'string';
    
    // Check if it's a number
    if (typeof value === 'number' || (!isNaN(Number(value)) && !isNaN(parseFloat(value)))) {
      return 'number';
    }
    
    // Check if it's a date
    const dateValue = new Date(value);
    if (!isNaN(dateValue.getTime()) && typeof value === 'string' && value.match(/\d{1,4}[\/\-]\d{1,2}[\/\-]\d{1,4}/)) {
      return 'date';
    }
    
    return 'string';
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
      setAlert({
        open: true,
        message: 'Please upload an Excel file (.xlsx, .xls) or CSV file.',
        severity: 'error'
      });
      return;
    }

    setIsProcessing(true);
    
    try {
      let jsonData: any[][];
      
      if (file.name.match(/\.csv$/i)) {
        // Handle CSV files
        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        jsonData = lines.map(line => {
          // Simple CSV parsing - in production, consider using a proper CSV parser
          return line.split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
        });
      } else {
        // Handle Excel files
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { 
          type: 'array',
          cellDates: true,
          cellNF: false,
          cellText: false
        });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON with header row
        jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
      }
      
      if (jsonData.length === 0) {
        throw new Error('The file appears to be empty.');
      }

      // Extract headers from first row
      const headers = jsonData[0] || [];
      const dataRows = jsonData.slice(1).filter(row => row.some(cell => cell !== '' && cell !== null && cell !== undefined));

      if (headers.length === 0) {
        throw new Error('No columns found in the file.');
      }

      // Analyze data types for each column
      const columnTypes: string[] = headers.map((_, colIndex) => {
        const sampleValues = dataRows.slice(0, 10).map(row => row[colIndex]).filter(val => val !== '' && val !== null && val !== undefined);
        if (sampleValues.length === 0) return 'string';
        
        const types = sampleValues.map(detectDataType);
        const typeCount = types.reduce((acc, type) => {
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        // Return the most common type
        return Object.entries(typeCount).sort(([,a], [,b]) => b - a)[0][0];
      });

      // Create columns definition with auto-detected types
      const columns: GridColDef[] = headers.map((header, index) => ({
        field: `col_${index}`,
        headerName: String(header || `Column ${index + 1}`),
        width: columnTypes[index] === 'number' ? 220 : 260,
        minWidth: 220,
        editable: true,
        type: columnTypes[index] as 'string' | 'number' | 'date'
      }));

      // Create rows data with proper type conversion
      const rows: GridRowsProp = dataRows.map((row, rowIndex) => {
        const rowData: any = { id: rowIndex };
        headers.forEach((_, colIndex) => {
          let value = row[colIndex];
          
          // Convert based on detected type
          if (columnTypes[colIndex] === 'number' && value !== '' && value !== null && value !== undefined) {
            value = Number(value);
          } else if (columnTypes[colIndex] === 'date' && value !== '' && value !== null && value !== undefined) {
            value = new Date(value).toLocaleDateString();
          }
          
          rowData[`col_${colIndex}`] = value || '';
        });
        return rowData;
      });

      setFileData({
        fileName: file.name,
        columns,
        rows
      });

      setAlert({
        open: true,
        message: `Successfully loaded ${file.name} with ${headers.length} columns and ${dataRows.length} rows. Data types auto-detected.`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error processing file:', error);
      setAlert({
        open: true,
        message: `Error processing file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        severity: 'error'
      });
    } finally {
      setIsProcessing(false);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleColumnDelete = (fieldToDelete: string) => {
    if (!fileData) return;

    const updatedColumns = fileData.columns.filter(col => col.field !== fieldToDelete);
    const updatedRows = fileData.rows.map(row => {
      const newRow = { ...row };
      delete newRow[fieldToDelete];
      return newRow;
    });

    setFileData({
      ...fileData,
      columns: updatedColumns,
      rows: updatedRows
    });

    setAlert({
      open: true,
      message: 'Column deleted successfully.',
      severity: 'success'
    });
  };

  const handleColumnRename = (field: string, newHeaderName: string) => {
    if (!fileData) return;

    const updatedColumns = fileData.columns.map(col => 
      col.field === field ? { ...col, headerName: newHeaderName } : col
    );

    setFileData({
      ...fileData,
      columns: updatedColumns
    });
  };

  const handleColumnReorder = (field: string, direction: 'left' | 'right') => {
    if (!fileData) return;

    const currentIndex = fileData.columns.findIndex(col => col.field === field);
    const newIndex = direction === 'left' ? currentIndex - 1 : currentIndex + 1;

    // Check bounds
    if (newIndex < 0 || newIndex >= fileData.columns.length) return;

    const updatedColumns = [...fileData.columns];
    const [movedColumn] = updatedColumns.splice(currentIndex, 1);
    updatedColumns.splice(newIndex, 0, movedColumn);

    setFileData({
      ...fileData,
      columns: updatedColumns
    });

    setAlert({
      open: true,
      message: `Column "${movedColumn.headerName}" moved ${direction}.`,
      severity: 'success'
    });
  };

  // Column Manager Functions
  const handleColumnManagerReorder = (fromIndex: number, toIndex: number) => {
    if (!fileData || fromIndex === toIndex) return;

    const updatedColumns = [...fileData.columns];
    const [movedColumn] = updatedColumns.splice(fromIndex, 1);
    updatedColumns.splice(toIndex, 0, movedColumn);

    setFileData({
      ...fileData,
      columns: updatedColumns
    });
  };

  const handleAddNewColumn = () => {
    if (!fileData || !newColumnName.trim()) return;

    const newField = `col_${Date.now()}`;
    const newColumn: GridColDef = {
      field: newField,
      headerName: newColumnName.trim(),
      width: 200,
      minWidth: 220,
      editable: true,
      type: 'string',
      sortable: true,
      resizable: true
    };

    // Add the column to the columns array
    const updatedColumns = [...fileData.columns, newColumn];

    // Add the default value to all existing rows
    const updatedRows = fileData.rows.map(row => ({
      ...row,
      [newField]: newColumnDefaultValue.trim() || ''
    }));

    setFileData({
      ...fileData,
      columns: updatedColumns,
      rows: updatedRows
    });

    setAlert({
      open: true,
      message: `Column "${newColumnName}" added successfully!`,
      severity: 'success'
    });

    // Reset form
    setNewColumnName('');
    setNewColumnDefaultValue('');
  };

  const handleColumnNameUpdate = (field: string, newName: string) => {
    if (!fileData || !newName.trim()) return;

    const updatedColumns = fileData.columns.map(col => 
      col.field === field ? { ...col, headerName: newName.trim() } : col
    );

    setFileData({
      ...fileData,
      columns: updatedColumns
    });
  };

  const handleColumnDeleteFromManager = (field: string) => {
    if (!fileData) return;

    const columnToDelete = fileData.columns.find(col => col.field === field);
    if (!columnToDelete) return;

    const updatedColumns = fileData.columns.filter(col => col.field !== field);
    const updatedRows = fileData.rows.map(row => {
      const newRow = { ...row };
      delete newRow[field];
      return newRow;
    });

    setFileData({
      ...fileData,
      columns: updatedColumns,
      rows: updatedRows
    });

    setAlert({
      open: true,
      message: `Column "${columnToDelete.headerName}" deleted successfully.`,
      severity: 'success'
    });
  };

  const handleRowEditStop: GridEventListener<'rowEditStop'> = (params, event) => {
    if (params.reason === GridRowEditStopReasons.rowFocusOut) {
      event.defaultMuiPrevented = true;
    }
  };

  const processRowUpdate = (newRow: GridRowModel) => {
    if (!fileData) return newRow;

    const updatedRows = fileData.rows.map(row => 
      row.id === newRow.id ? newRow : row
    );

    setFileData({
      ...fileData,
      rows: updatedRows
    });

    return newRow;
  };

  const handleCopyData = () => {
    if (!fileData) return;
    
    // Start with headers by default
    setCopyIncludesHeaders(true);
    generateCopyData(true);
    setCopyDialog(true);
  };

  const generateCopyData = (includeHeaders: boolean) => {
    if (!fileData) return;

    // Create TSV (Tab-separated values) format for easy pasting into Excel/eLabs
    const dataLines = fileData.rows.map(row => 
      fileData.columns.map(col => String(row[col.field] || '')).join('\t')
    );
    
    let tsvData: string;
    if (includeHeaders) {
      const headers = fileData.columns.map(col => col.headerName).join('\t');
      tsvData = [headers, ...dataLines].join('\n');
    } else {
      tsvData = dataLines.join('\n');
    }
    
    setCopyData(tsvData);
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

  // Enhanced columns with reorder and delete functionality
  const enhancedColumns: GridColDef[] = fileData ? fileData.columns.map((col, index) => ({
    ...col,
    sortable: true,
    resizable: true,
    renderHeader: (params: GridColumnHeaderParams) => {
      const currentIndex = fileData.columns.findIndex(c => c.field === params.field);
      const isFirst = currentIndex === 0;
      const isLast = currentIndex === fileData.columns.length - 1;
      
      return (
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column',
          alignItems: 'stretch',
          width: '100%', 
          height: '100%',
          py: 0.5
        }}>
          {/* Top row: Drag indicator and column name */}
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 0.5,
            mb: 0.5,
            minHeight: '20px'
          }}>
            <DragIndicatorIcon 
              sx={{ 
                color: 'rgba(255,255,255,0.7)', 
                fontSize: 14,
                cursor: 'grab',
                flexShrink: 0
              }} 
            />
            <Typography 
              variant="subtitle2" 
              sx={{ 
                flexGrow: 1, 
                cursor: 'text',
                fontSize: '0.75rem',
                fontWeight: 'bold',
                color: 'inherit',
                minWidth: 0,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => {
                const newName = e.target.textContent?.trim();
                if (newName && newName !== params.colDef.headerName) {
                  handleColumnRename(params.field, newName);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  (e.target as HTMLElement).blur();
                }
              }}
              title={`Click to edit: ${params.colDef.headerName}`}
            >
              {params.colDef.headerName}
            </Typography>
          </Box>
          
          {/* Bottom row: Action buttons */}
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'center',
            gap: 0.5,
            minHeight: '28px'
          }}>
            <Tooltip title="Move left" placement="bottom">
              <span>
                <IconButton 
                  size="small" 
                  onClick={() => handleColumnReorder(params.field, 'left')}
                  disabled={isFirst}
                  sx={{ 
                    p: 0.25,
                    minWidth: '24px',
                    minHeight: '24px',
                    color: 'rgba(255,255,255,0.9)',
                    '&:disabled': { 
                      color: 'rgba(255,255,255,0.3)' 
                    },
                    '&:hover:not(:disabled)': {
                      backgroundColor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            
            <Tooltip title="Move right" placement="bottom">
              <span>
                <IconButton 
                  size="small" 
                  onClick={() => handleColumnReorder(params.field, 'right')}
                  disabled={isLast}
                  sx={{ 
                    p: 0.25,
                    minWidth: '24px',
                    minHeight: '24px',
                    color: 'rgba(255,255,255,0.9)',
                    '&:disabled': { 
                      color: 'rgba(255,255,255,0.3)' 
                    },
                    '&:hover:not(:disabled)': {
                      backgroundColor: 'rgba(255,255,255,0.1)'
                    }
                  }}
                >
                  <ArrowForwardIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            
            <Tooltip title="Delete column" placement="bottom">
              <IconButton 
                size="small" 
                onClick={() => handleColumnDelete(params.field)}
                sx={{ 
                  p: 0.25,
                  minWidth: '24px',
                  minHeight: '24px',
                  color: '#ff5252',
                  '&:hover': {
                    backgroundColor: 'rgba(255, 82, 82, 0.1)',
                    color: '#ff1744'
                  }
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      );
    }
  })) : [];

  return (
    <Box sx={{ p: 3, maxWidth: '100%', margin: '0 auto' }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
        Abbott Blood Testing Data Translation
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        Upload your Abbott blood testing machine data file to edit, reorder, and prepare it for eLabs bulk upload.
      </Typography>

      {/* File Upload Section */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Box sx={{ textAlign: 'center' }}>
          <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            style={{ display: 'none' }}
            onChange={handleFileUpload}
          />
          
          <Button
            variant="contained"
            size="large"
            startIcon={<UploadIcon />}
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            sx={{ mb: 2 }}
          >
            {isProcessing ? 'Processing File...' : 'Upload Excel/CSV File'}
          </Button>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: savedTemplates.length > 0 ? 2 : 0 }}>
            Supported formats: .xlsx, .xls, .csv
          </Typography>
          
          {savedTemplates.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
                📋 You have {savedTemplates.length} saved template{savedTemplates.length > 1 ? 's' : ''}
              </Typography>
              <Button
                size="small"
                variant="text"
                startIcon={<BookmarkIcon />}
                onClick={() => setTemplateDialog(true)}
                sx={{ textTransform: 'none' }}
              >
                Apply template after upload
              </Button>
            </Box>
          )}
        </Box>
      </Paper>

      {/* Data Display and Edit Section */}
      {fileData && (
        <Paper elevation={2} sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6" gutterBottom>
                <TableViewIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                {fileData.fileName}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip 
                  label={`${fileData.columns.length} columns`} 
                  size="small" 
                  color="primary" 
                  icon={<DragIndicatorIcon />}
                />
                <Chip 
                  label={`${fileData.rows.length} rows`} 
                  size="small" 
                  color="secondary" 
                />
              </Stack>
            </Box>
            
            <Stack direction="row" spacing={2}>
              <Button
                variant="outlined"
                startIcon={<ViewColumnIcon />}
                onClick={() => setColumnManagerDialog(true)}
                color="primary"
              >
                Manage Columns
              </Button>
              <Button
                variant="outlined"
                startIcon={<FolderOpenIcon />}
                onClick={() => setTemplateDialog(true)}
                disabled={savedTemplates.length === 0}
              >
                Load Template
              </Button>
              <Button
                variant="outlined"
                startIcon={<BookmarkAddIcon />}
                onClick={() => setSaveTemplateDialog(true)}
              >
                Save Template
              </Button>
              <Button
                variant="contained"
                color="success"
                startIcon={<CopyIcon />}
                onClick={handleCopyData}
                size="large"
              >
                Copy for eLabs...
              </Button>
            </Stack>
          </Box>

          <Stack spacing={1} sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              💡 <strong>Tips:</strong> Use "Manage Columns" for bulk editing with many columns, or click column headers directly for quick edits. Double-click cells to edit data. Save your column configuration as a template to reuse with future Abbott data files!
            </Typography>
            <Typography variant="body2" color="primary.main" sx={{ fontSize: '0.875rem' }}>
              🔧 <strong>Column Manager:</strong> Drag to reorder, rename, delete, or add new columns with default values
            </Typography>
            <Typography variant="body2" color="success.main" sx={{ fontSize: '0.875rem' }}>
              📋 <strong>Copy Options:</strong> Choose to copy with or without headers when exporting to eLabs
            </Typography>
          </Stack>

          <Box sx={{ height: 620, width: '100%' }}>
            <DataGrid
              rows={fileData.rows}
              columns={enhancedColumns}
              editMode="row"
              rowModesModel={rowModesModel}
              onRowModesModelChange={setRowModesModel}
              onRowEditStop={handleRowEditStop}
              processRowUpdate={processRowUpdate}
              apiRef={gridApiRef}
              sx={{
                '& .MuiDataGrid-columnHeader': {
                  backgroundColor: 'primary.light',
                  color: 'primary.contrastText',
                  fontWeight: 'bold',
                  minHeight: '72px !important',
                  height: '72px !important',
                  padding: '4px 8px !important'
                },
                '& .MuiDataGrid-columnHeaderTitle': {
                  fontWeight: 'bold',
                  display: 'none' // Hide default title since we're using custom header
                },
                '& .MuiDataGrid-columnHeaderTitleContainer': {
                  padding: '0 !important'
                },
                '& .MuiDataGrid-row:hover': {
                  backgroundColor: 'action.hover'
                },
                '& .MuiDataGrid-cell:focus': {
                  outline: '2px solid #1976d2'
                },
                '& .MuiDataGrid-columnSeparator': {
                  display: 'none'
                },
                '& .MuiDataGrid-columnHeaders': {
                  borderBottom: '2px solid #1976d2'
                }
              }}
              pageSizeOptions={[25, 50, 100]}
              initialState={{
                pagination: {
                  paginationModel: { pageSize: 25 }
                }
              }}
            />
          </Box>
        </Paper>
      )}

      {/* Copy Dialog */}
      <Dialog 
        open={copyDialog} 
        onClose={() => setCopyDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Copy Data for eLabs Bulk Upload
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Choose how you want to copy the data for pasting into eLabs bulk uploader.
          </Typography>
          
          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" sx={{ mb: 2 }}>
              Copy Format:
            </Typography>
            <ToggleButtonGroup
              value={copyIncludesHeaders ? 'with-headers' : 'data-only'}
              exclusive
              onChange={(_, newValue) => {
                if (newValue !== null) {
                  const includeHeaders = newValue === 'with-headers';
                  generateCopyData(includeHeaders);
                }
              }}
              fullWidth
              sx={{ mb: 2 }}
            >
              <ToggleButton value="with-headers" sx={{ textTransform: 'none' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ViewHeadlineIcon color="primary" />
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="body2" fontWeight="bold">
                      With Headers
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Include column names (recommended)
                    </Typography>
                  </Box>
                </Box>
              </ToggleButton>
              <ToggleButton value="data-only" sx={{ textTransform: 'none' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <ViewStreamIcon color="primary" />
                  <Box sx={{ textAlign: 'left' }}>
                    <Typography variant="body2" fontWeight="bold">
                      Data Only
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Just the data rows
                    </Typography>
                  </Box>
                </Box>
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Preview ({copyIncludesHeaders ? 'with headers' : 'data only'}):
          </Typography>
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2, 
              maxHeight: 300, 
              overflow: 'auto', 
              fontFamily: 'monospace',
              whiteSpace: 'pre-wrap',
              fontSize: '0.875rem',
              backgroundColor: 'grey.50'
            }}
          >
            {copyData}
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCopyDialog(false)}>
            Close
          </Button>
          <Button 
            variant="contained" 
            onClick={copyToClipboard}
            startIcon={<CopyIcon />}
          >
            Copy {copyIncludesHeaders ? 'with Headers' : 'Data Only'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Save Template Dialog */}
      <Dialog 
        open={saveTemplateDialog} 
        onClose={() => {
          setSaveTemplateDialog(false);
          setTemplateName('');
          setTemplateDescription('');
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <BookmarkAddIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Save Column Template
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Save the current column configuration to reuse with future uploads. This includes column names, order, and which columns are kept/deleted.
          </Typography>
          
          <TextField
            autoFocus
            margin="dense"
            label="Template Name"
            type="text"
            fullWidth
            variant="outlined"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g., Abbott Blood Panel Standard"
            sx={{ mb: 2 }}
            required
          />
          
          <TextField
            margin="dense"
            label="Description (Optional)"
            type="text"
            fullWidth
            variant="outlined"
            multiline
            rows={3}
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            placeholder="Describe what this template is for..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setSaveTemplateDialog(false);
            setTemplateName('');
            setTemplateDescription('');
          }}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={() => {
              if (templateName.trim()) {
                saveTemplate(templateName.trim(), templateDescription.trim());
                setSaveTemplateDialog(false);
                setTemplateName('');
                setTemplateDescription('');
              }
            }}
            disabled={!templateName.trim()}
            startIcon={<SaveIcon />}
          >
            Save Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Load Template Dialog */}
      <Dialog 
        open={templateDialog} 
        onClose={() => setTemplateDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <FolderOpenIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Load Saved Template
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Choose a saved template to apply to your current data. This will reorder and rename columns according to the saved configuration.
          </Typography>
          
          {savedTemplates.length === 0 ? (
            <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
              <BookmarkIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
              <Typography variant="body1" color="text.secondary">
                No saved templates yet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Configure your columns and save a template to reuse it later
              </Typography>
            </Paper>
          ) : (
            <List>
              {savedTemplates.map((template, index) => (
                <React.Fragment key={template.id}>
                  <ListItem>
                    <ListItemText
                      primary={template.name}
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            {template.description || 'No description'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            Created: {new Date(template.createdAt).toLocaleDateString()} • 
                            {template.columnMapping.length} columns
                          </Typography>
                        </Box>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => applyTemplate(template)}
                        >
                          Apply
                        </Button>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => deleteTemplate(template.id)}
                        >
                          <DeleteIcon />
                        </IconButton>
                      </Stack>
                    </ListItemSecondaryAction>
                  </ListItem>
                  {index < savedTemplates.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemplateDialog(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Column Manager Dialog */}
      <Dialog 
        open={columnManagerDialog} 
        onClose={() => {
          setColumnManagerDialog(false);
          setNewColumnName('');
          setNewColumnDefaultValue('');
          setDraggedIndex(null);
        }}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { height: '80vh' } }}
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <ViewColumnIcon color="primary" />
            Column Manager
            <Chip 
              label={`${fileData?.columns.length || 0} columns`}
              size="small"
              color="primary"
              sx={{ ml: 'auto' }}
            />
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            
            {/* Add New Column Section */}
            <Paper elevation={1} sx={{ p: 3, m: 3, mb: 2, backgroundColor: 'primary.light', color: 'primary.contrastText' }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AddIcon />
                Add New Column
              </Typography>
              <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                <TextField
                  label="Column Name"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{ 
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white'
                    }
                  }}
                  placeholder="e.g., Lab Result, Patient ID"
                />
                <TextField
                  label="Default Value (Optional)"
                  value={newColumnDefaultValue}
                  onChange={(e) => setNewColumnDefaultValue(e.target.value)}
                  variant="outlined"
                  size="small"
                  sx={{ 
                    flex: 1,
                    '& .MuiOutlinedInput-root': {
                      backgroundColor: 'white'
                    }
                  }}
                  placeholder="Applied to all rows"
                />
                <Button
                  variant="contained"
                  onClick={handleAddNewColumn}
                  disabled={!newColumnName.trim()}
                  startIcon={<AddIcon />}
                  sx={{ 
                    backgroundColor: 'white',
                    color: 'primary.main',
                    '&:hover': {
                      backgroundColor: 'grey.100'
                    }
                  }}
                >
                  Add
                </Button>
              </Stack>
            </Paper>

            {/* Column List */}
            <Box sx={{ flex: 1, overflow: 'auto', px: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TuneIcon />
                Existing Columns
                <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  Drag to reorder, edit names, or delete
                </Typography>
              </Typography>
              
              {fileData?.columns.length === 0 ? (
                <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', mt: 2 }}>
                  <ViewColumnIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                  <Typography variant="body1" color="text.secondary">
                    No columns yet
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Upload a file or add columns manually
                  </Typography>
                </Paper>
              ) : (
                <List sx={{ mt: 1 }}>
                  {fileData?.columns.map((column, index) => (
                    <ListItem
                      key={column.field}
                      sx={{
                        border: '1px solid',
                        borderColor: draggedIndex === index ? 'primary.main' : 'divider',
                        borderRadius: 1,
                        mb: 1,
                        backgroundColor: draggedIndex === index ? 'primary.light' : 'background.paper',
                        cursor: 'grab',
                        opacity: draggedIndex === index ? 0.7 : 1,
                        transform: draggedIndex === index ? 'scale(1.02)' : 'scale(1)',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          backgroundColor: draggedIndex === index ? 'primary.light' : 'action.hover'
                        },
                        '&:active': {
                          cursor: 'grabbing'
                        }
                      }}
                      draggable
                      onDragStart={(e) => {
                        setDraggedIndex(index);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedIndex !== null && draggedIndex !== index) {
                          handleColumnManagerReorder(draggedIndex, index);
                        }
                        setDraggedIndex(null);
                      }}
                      onDragEnd={() => setDraggedIndex(null)}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 2 }}>
                        <DragIndicatorIcon 
                          sx={{ 
                            color: 'text.secondary',
                            cursor: 'grab',
                            '&:active': { cursor: 'grabbing' }
                          }} 
                        />
                        
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            minWidth: '40px',
                            fontWeight: 'bold',
                            color: 'primary.main'
                          }}
                        >
                          #{index + 1}
                        </Typography>
                        
                        <TextField
                          value={column.headerName}
                          onChange={(e) => handleColumnNameUpdate(column.field, e.target.value)}
                          variant="outlined"
                          size="small"
                          sx={{ flex: 1 }}
                          placeholder="Column name"
                        />
                        
                        <Chip
                          label={column.type || 'string'}
                          size="small"
                          color="secondary"
                          variant="outlined"
                        />
                        
                        <Tooltip title="Delete column">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleColumnDeleteFromManager(column.field)}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>
            💡 Drag rows to reorder columns, edit names directly, or add new columns with default values
          </Typography>
          <Button 
            onClick={() => {
              setColumnManagerDialog(false);
              setNewColumnName('');
              setNewColumnDefaultValue('');
              setDraggedIndex(null);
            }} 
            variant="contained"
          >
            Done
          </Button>
        </DialogActions>
      </Dialog>

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
