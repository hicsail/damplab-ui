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
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Stack,
  IconButton,
  Box
} from '@mui/material';
import {
  BookmarkAdd as BookmarkAddIcon,
  FolderOpen as FolderOpenIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Bookmark as BookmarkIcon
} from '@mui/icons-material';
import { Template } from './types';

interface TemplateDialogsProps {
  // Save Template Dialog
  saveDialogOpen: boolean;
  templateName: string;
  templateDescription: string;
  onSaveDialogClose: () => void;
  onTemplateNameChange: (name: string) => void;
  onTemplateDescriptionChange: (description: string) => void;
  onSaveTemplate: () => void;
  
  // Load Template Dialog
  loadDialogOpen: boolean;
  savedTemplates: Template[];
  onLoadDialogClose: () => void;
  onApplyTemplate: (template: Template) => void;
  onDeleteTemplate: (templateId: string) => void;
}

export default function TemplateDialogs({
  saveDialogOpen,
  templateName,
  templateDescription,
  onSaveDialogClose,
  onTemplateNameChange,
  onTemplateDescriptionChange,
  onSaveTemplate,
  loadDialogOpen,
  savedTemplates,
  onLoadDialogClose,
  onApplyTemplate,
  onDeleteTemplate
}: TemplateDialogsProps) {
  return (
    <>
      {/* Save Template Dialog */}
      <Dialog 
        open={saveDialogOpen} 
        onClose={onSaveDialogClose}
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
            onChange={(e) => onTemplateNameChange(e.target.value)}
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
            onChange={(e) => onTemplateDescriptionChange(e.target.value)}
            placeholder="Describe what this template is for..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onSaveDialogClose}>
            Cancel
          </Button>
          <Button 
            variant="contained" 
            onClick={onSaveTemplate}
            disabled={!templateName.trim()}
            startIcon={<SaveIcon />}
          >
            Save Template
          </Button>
        </DialogActions>
      </Dialog>

      {/* Load Template Dialog */}
      <Dialog 
        open={loadDialogOpen} 
        onClose={onLoadDialogClose}
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
                        <>
                          {template.description || 'No description'}
                          <br />
                          Created: {new Date(template.createdAt).toLocaleDateString()} • 
                          {template.columnMapping.length} columns
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => onApplyTemplate(template)}
                        >
                          Apply
                        </Button>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onDeleteTemplate(template.id)}
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
          <Button onClick={onLoadDialogClose}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
