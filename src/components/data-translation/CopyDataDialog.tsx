import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Paper,
  Button,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import {
  ContentCopy as CopyIcon,
  ViewHeadline as ViewHeadlineIcon,
  ViewStream as ViewStreamIcon
} from '@mui/icons-material';

interface CopyDataDialogProps {
  open: boolean;
  copyData: string;
  includesHeaders: boolean;
  onClose: () => void;
  onToggleHeaders: (includeHeaders: boolean) => void;
  onCopyToClipboard: () => void;
}

export default function CopyDataDialog({
  open,
  copyData,
  includesHeaders,
  onClose,
  onToggleHeaders,
  onCopyToClipboard
}: CopyDataDialogProps) {
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
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
            value={includesHeaders ? 'with-headers' : 'data-only'}
            exclusive
            onChange={(_, newValue) => {
              if (newValue !== null) {
                const includeHeaders = newValue === 'with-headers';
                onToggleHeaders(includeHeaders);
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
          Preview ({includesHeaders ? 'with headers' : 'data only'}):
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
        <Button onClick={onClose}>
          Close
        </Button>
        <Button 
          variant="contained" 
          onClick={onCopyToClipboard}
          startIcon={<CopyIcon />}
        >
          Copy {includesHeaders ? 'with Headers' : 'Data Only'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
