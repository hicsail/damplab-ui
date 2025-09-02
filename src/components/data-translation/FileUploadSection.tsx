import React from 'react';
import {
  Box,
  Button,
  Typography,
  Paper
} from '@mui/material';
import {
  Upload as UploadIcon,
  CloudUpload as CloudUploadIcon,
  Bookmark as BookmarkIcon
} from '@mui/icons-material';
import { Template } from './types';

interface FileUploadSectionProps {
  fileInputRef: React.RefObject<HTMLInputElement>;
  isProcessing: boolean;
  savedTemplates: Template[];
  templatesLoading?: boolean;
  useLocalStorage?: boolean;
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onTriggerFileInput: () => void;
  onOpenTemplateDialog: () => void;
}

export default function FileUploadSection({
  fileInputRef,
  isProcessing,
  savedTemplates,
  templatesLoading = false,
  useLocalStorage = false,
  onFileUpload,
  onTriggerFileInput,
  onOpenTemplateDialog
}: FileUploadSectionProps) {
  return (
    <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
      <Box sx={{ textAlign: 'center' }}>
        <CloudUploadIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
        
        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          style={{ display: 'none' }}
          onChange={onFileUpload}
        />
        
        <Button
          variant="contained"
          size="large"
          startIcon={<UploadIcon />}
          onClick={onTriggerFileInput}
          disabled={isProcessing}
          sx={{ mb: 2 }}
        >
          {isProcessing ? 'Processing File...' : 'Upload Excel/CSV File'}
        </Button>
        
        <Typography variant="body2" color="text.secondary" sx={{ mb: savedTemplates.length > 0 ? 2 : 0 }}>
          Supported formats: .xlsx, .xls, .csv
        </Typography>
        
        {(savedTemplates.length > 0 || templatesLoading) && (
          <Box sx={{ mt: 2 }}>
            {templatesLoading ? (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                🔄 Loading templates...
              </Typography>
            ) : (
              <>
                <Typography variant="body2" color="primary" sx={{ mb: 1 }}>
                  📋 You have {savedTemplates.length} saved template{savedTemplates.length > 1 ? 's' : ''}
                  {useLocalStorage && (
                    <Typography component="span" variant="body2" color="warning.main" sx={{ ml: 1 }}>
                      (📱 stored locally)
                    </Typography>
                  )}
                </Typography>
                <Button
                  size="small"
                  variant="text"
                  startIcon={<BookmarkIcon />}
                  onClick={onOpenTemplateDialog}
                  sx={{ textTransform: 'none' }}
                >
                  Apply template after upload
                </Button>
              </>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
}
