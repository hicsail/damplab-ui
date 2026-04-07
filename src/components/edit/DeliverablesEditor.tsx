import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';

interface DeliverablesEditorProps {
  deliverables: string[];
  onSave: (deliverables: string[]) => void;
  readOnly?: boolean;
}

export const DeliverablesEditor: React.FC<DeliverablesEditorProps> = ({ 
  deliverables, 
  onSave, 
  readOnly = false 
}) => {
  const [localDeliverables, setLocalDeliverables] = useState<string[]>(deliverables || []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    setLocalDeliverables(deliverables || []);
  }, [deliverables]);

  const handleAdd = () => {
    setEditingIndex(null);
    setEditValue('');
    setDialogOpen(true);
  };

  const handleEdit = (index: number) => {
    setEditingIndex(index);
    setEditValue(localDeliverables[index]);
    setDialogOpen(true);
  };

  const handleDelete = (index: number) => {
    const updated = localDeliverables.filter((_, i) => i !== index);
    setLocalDeliverables(updated);
    onSave(updated);
  };

  const handleSaveDialog = () => {
    if (editValue.trim()) {
      let updated: string[];
      if (editingIndex !== null) {
        // Update existing
        updated = [...localDeliverables];
        updated[editingIndex] = editValue.trim();
      } else {
        // Add new
        updated = [...localDeliverables, editValue.trim()];
      }
      setLocalDeliverables(updated);
      onSave(updated);
      setDialogOpen(false);
      setEditValue('');
      setEditingIndex(null);
    }
  };

  const handleCancelDialog = () => {
    setDialogOpen(false);
    setEditValue('');
    setEditingIndex(null);
  };

  if (readOnly) {
    return (
      <Box>
        {localDeliverables.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No deliverables
          </Typography>
        ) : (
          <List dense>
            {localDeliverables.map((deliverable, index) => (
              <ListItem key={index}>
                <ListItemText primary={deliverable} />
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="body2">
          {localDeliverables.length} deliverable{localDeliverables.length !== 1 ? 's' : ''}
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          variant="outlined"
        >
          Add
        </Button>
      </Box>
      
      {localDeliverables.length > 0 && (
        <List dense>
          {localDeliverables.map((deliverable, index) => (
            <ListItem
              key={index}
              sx={{
                border: '1px solid #e0e0e0',
                borderRadius: 1,
                mb: 0.5,
                bgcolor: 'background.paper'
              }}
            >
              <ListItemText primary={deliverable} />
              <ListItemSecondaryAction>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => handleEdit(index)}
                  sx={{ mr: 0.5 }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => handleDelete(index)}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </ListItemSecondaryAction>
            </ListItem>
          ))}
        </List>
      )}

      <Dialog open={dialogOpen} onClose={handleCancelDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingIndex !== null ? 'Edit Deliverable' : 'Add Deliverable'}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Deliverable Description"
            fullWidth
            multiline
            rows={3}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            placeholder="e.g., FASTQ files from BaseSpace"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancelDialog}>Cancel</Button>
          <Button onClick={handleSaveDialog} variant="contained" disabled={!editValue.trim()}>
            {editingIndex !== null ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
