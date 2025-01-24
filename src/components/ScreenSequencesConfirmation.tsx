import { Box, Button, Modal, Stack, Typography, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import { Sequence } from '../mpi/models/sequence';
import { screenSequencesBatch } from '../mpi/SecureDNAQueries';
import { useState, useEffect } from 'react';

const style = {
  position: 'absolute',
  top: '50%',
  left: '55%',
  transform: 'translate(-50%, -50%)',
  width: 500,
  bgcolor: 'background.paper',
  border: '1px solid #000',
  boxShadow: 24,
  p: 4,
  borderRadius: '16px'
};

interface ScreenSequencesConfirmationProps {
  open: boolean;
  onClose: () => void;
  sequences: Sequence[];
}

function ScreenSequencesConfirmation({ open, onClose, sequences }: ScreenSequencesConfirmationProps) {
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!open) {
      setMessage('');
      setError(false);
    }
  }, [open]);

  const handleScreening = async () => {
    try {
      const sequenceIds = sequences.map(seq => seq.id!);
      const result = await screenSequencesBatch(sequenceIds);
      
      if (result) {
        setError(false);
        setMessage('The biosecurity check is running in the background. Results will be shown in the SecureDNA screenings table.');
      } else {
        throw new Error('Failed to start screening');
      }
    } catch (e) {
      console.error('Error starting screening:', e);
      setError(true);
      setMessage('An error occurred while starting the screening.');
    }
  };

  const handleClose = () => {
    setMessage('');
    setError(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose}>
      <Box sx={style}>
        <Stack spacing={3} direction="column" alignItems="center">
          <Typography variant="h4">
            Screen Sequences
          </Typography>
          
          <Typography variant="body1">
            The following sequences will be screened:
          </Typography>

          <Box sx={{ width: '100%', maxHeight: '200px', overflowY: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>ID</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {sequences.map((seq) => (
                  <TableRow key={seq.id}>
                    <TableCell>{seq.name}</TableCell>
                    <TableCell>{seq.id}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>

          {!message && (
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleScreening}
              >
                Start Screening
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={handleClose}
              >
                Cancel
              </Button>
            </Box>
          )}

          {message && (
            <Typography
              sx={{
                color: error ? 'error.main' : 'success.main',
                textAlign: 'center'
              }}
            >
              {message}
            </Typography>
          )}
        </Stack>
      </Box>
    </Modal>
  );
}

export default ScreenSequencesConfirmation; 