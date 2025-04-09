import { Dialog, DialogContent, DialogTitle, Box, Typography } from '@mui/material';
import { ScreeningResult } from '../mpi/types';

interface ScreeningDetailsModalProps {
  screening: ScreeningResult;
  open: boolean;
  onClose: () => void;
}

export function ScreeningDetailsModal({ screening, open, onClose }: ScreeningDetailsModalProps) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Screening Details</DialogTitle>
      <DialogContent>
        <Box>
          <Typography variant="h6">Sequence</Typography>
          <Typography>{screening.sequence.name}</Typography>
          <Typography variant="h6" sx={{ mt: 2 }}>Status</Typography>
          <Typography>{screening.status.toUpperCase()}</Typography>
          <Typography variant="h6" sx={{ mt: 2 }}>Region</Typography>
          <Typography>{screening.region}</Typography>
          <Typography variant="h6" sx={{ mt: 2 }}>Sequence</Typography>
          <Box sx={{ 
            maxHeight: '200px', 
            overflowY: 'auto', 
            backgroundColor: '#f5f5f5',
            p: 2,
            borderRadius: 1,
            fontFamily: 'monospace',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>
            {screening.sequence.seq}
          </Box>
          {screening.threats && screening.threats.length > 0 && (
            <>
              <Typography variant="h6" sx={{ mt: 2 }}>Threats Detected</Typography>
              {screening.threats.map((threat, index) => (
                <Box key={index} sx={{ mt: 1 }}>
                  <Typography variant="subtitle1">{threat.name}</Typography>
                  <Typography variant="body2">Description: {threat.description}</Typography>
                  <Typography variant="body2">Wild Type: {threat.is_wild_type ? 'Yes' : 'No'}</Typography>
                  {threat.references.length > 0 && (
                    <Typography variant="body2" color="text.secondary">
                      References: {threat.references.join(', ')}
                    </Typography>
                  )}
                </Box>
              ))}
            </>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
} 