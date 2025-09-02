import React from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Stack,
  Chip,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  DataGrid,
  GridColDef,
  GridRowModesModel,
  GridEventListener,
  GridRowModel,
  useGridApiRef,
  GridColumnHeaderParams
} from '@mui/x-data-grid';
import {
  TableView as TableViewIcon,
  DragIndicator as DragIndicatorIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Delete as DeleteIcon,
  ViewColumn as ViewColumnIcon,
  FolderOpen as FolderOpenIcon,
  BookmarkAdd as BookmarkAddIcon,
  ContentCopy as CopyIcon
} from '@mui/icons-material';
import { FileData, Template } from './types';

interface DataGridSectionProps {
  fileData: FileData;
  rowModesModel: GridRowModesModel;
  savedTemplates: Template[];
  onRowModesModelChange: (model: GridRowModesModel) => void;
  onRowEditStop: GridEventListener<'rowEditStop'>;
  onProcessRowUpdate: (newRow: GridRowModel) => GridRowModel;
  onColumnReorder: (field: string, direction: 'left' | 'right') => void;
  onColumnRename: (field: string, newHeaderName: string) => void;
  onColumnDelete: (field: string) => void;
  onOpenColumnManager: () => void;
  onOpenTemplateDialog: () => void;
  onOpenSaveTemplateDialog: () => void;
  onCopyData: () => void;
}

export default function DataGridSection({
  fileData,
  rowModesModel,
  savedTemplates,
  onRowModesModelChange,
  onRowEditStop,
  onProcessRowUpdate,
  onColumnReorder,
  onColumnRename,
  onColumnDelete,
  onOpenColumnManager,
  onOpenTemplateDialog,
  onOpenSaveTemplateDialog,
  onCopyData
}: DataGridSectionProps) {
  const gridApiRef = useGridApiRef();

  // Enhanced columns with reorder and delete functionality
  const enhancedColumns: GridColDef[] = fileData.columns.map((col) => ({
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
                  onColumnRename(params.field, newName);
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
                  onClick={() => onColumnReorder(params.field, 'left')}
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
                  onClick={() => onColumnReorder(params.field, 'right')}
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
                onClick={() => onColumnDelete(params.field)}
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
  }));

  return (
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
            onClick={onOpenColumnManager}
            color="primary"
          >
            Manage Columns
          </Button>
          <Button
            variant="outlined"
            startIcon={<FolderOpenIcon />}
            onClick={onOpenTemplateDialog}
            disabled={savedTemplates.length === 0}
          >
            Load Template
          </Button>
          <Button
            variant="outlined"
            startIcon={<BookmarkAddIcon />}
            onClick={onOpenSaveTemplateDialog}
          >
            Save Template
          </Button>
          <Button
            variant="contained"
            color="success"
            startIcon={<CopyIcon />}
            onClick={onCopyData}
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
          onRowModesModelChange={onRowModesModelChange}
          onRowEditStop={onRowEditStop}
          processRowUpdate={onProcessRowUpdate}
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
  );
}
