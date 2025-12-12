import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Paper,
  Button,
  TextField,
  List,
  ListItem,
  Stack,
  IconButton,
  Box,
  Chip,
  Tooltip
} from '@mui/material';
import {
  ViewColumn as ViewColumnIcon,
  Add as AddIcon,
  Tune as TuneIcon,
  Delete as DeleteIcon,
  DragIndicator as DragIndicatorIcon
} from '@mui/icons-material';
import { GridColDef } from '@mui/x-data-grid';

interface ColumnManagerDialogProps {
  open: boolean;
  columns: GridColDef[];
  newColumnName: string;
  newColumnDefaultValue: string;
  draggedIndex: number | null;
  onClose: () => void;
  onNewColumnNameChange: (name: string) => void;
  onNewColumnDefaultValueChange: (value: string) => void;
  onAddNewColumn: () => void;
  onColumnNameUpdate: (field: string, newName: string) => void;
  onColumnDelete: (field: string) => void;
  onDragStart: (index: number) => void;
  onDragEnd: () => void;
  onDrop: (fromIndex: number, toIndex: number) => void;
  setDraggedIndex: (index: number | null) => void;
}

export default function ColumnManagerDialog({
  open,
  columns,
  newColumnName,
  newColumnDefaultValue,
  draggedIndex,
  onClose,
  onNewColumnNameChange,
  onNewColumnDefaultValueChange,
  onAddNewColumn,
  onColumnNameUpdate,
  onColumnDelete,
  onDragStart,
  onDragEnd,
  onDrop,
  setDraggedIndex
}: ColumnManagerDialogProps) {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { height: '80vh' } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ViewColumnIcon color="primary" />
          Column Manager
          <Chip 
            label={`${columns.length} columns`}
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
                onChange={(e) => onNewColumnNameChange(e.target.value)}
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
                onChange={(e) => onNewColumnDefaultValueChange(e.target.value)}
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
                onClick={onAddNewColumn}
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
            
            {columns.length === 0 ? (
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
                {columns.map((column, index) => (
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
                      onDragStart(index);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = 'move';
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (draggedIndex !== null && draggedIndex !== index) {
                        onDrop(draggedIndex, index);
                      }
                      setDraggedIndex(null);
                    }}
                    onDragEnd={() => {
                      setDraggedIndex(null);
                      onDragEnd();
                    }}
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
                        onChange={(e) => onColumnNameUpdate(column.field, e.target.value)}
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
                          onClick={() => onColumnDelete(column.field)}
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
        <Button onClick={onClose} variant="contained">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
