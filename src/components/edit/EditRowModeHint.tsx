import { Edit } from '@mui/icons-material';
import { Alert } from '@mui/material';

/**
 * Shown above admin DataGrids that use row edit mode + Actions pencil.
 * Keep copy in sync with user expectations (Actions column → pencil → edit row).
 */
export const EditRowModeHint: React.FC = () => (
  <Alert
    severity="info"
    variant="outlined"
    icon={<Edit fontSize="inherit" />}
    sx={{
      py: 0.5,
      alignItems: 'center',
      '& .MuiAlert-message': { py: 0.5, width: '100%' },
    }}
  >
    Click the pencil in the <strong>Actions</strong> column to edit a row before changing other cells.
  </Alert>
);
