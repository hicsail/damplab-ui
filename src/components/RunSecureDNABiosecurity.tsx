import { Box, Button, FormControl, InputLabel, MenuItem, Modal, Select, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useApolloClient } from '@apollo/client';
import { Sequence } from '../mpi/types';
import { Region } from '../mpi/types';
import { GET_SEQUENCES, SCREEN_SEQUENCES_BATCH } from '../mpi/SequencesQueries';

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

interface RunSecureDNABiosecurityProps {
  open: boolean
  onClose: () => void
  onScreeningComplete?: () => void
}

function RunSecureDNABiosecurity({ onClose, open, onScreeningComplete }: RunSecureDNABiosecurityProps) {
  const [selectedSequences, setSelectedSequences] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region>(Region.ALL);
  const [alreadyRun, setAlreadyRun] = useState(false);
  const [message, setMessage] = useState("");
  const client = useApolloClient();

  const { data: sequencesData, loading: sequencesLoading } = useQuery(GET_SEQUENCES);
  const [screenSequences] = useMutation(SCREEN_SEQUENCES_BATCH);

  useEffect(() => {
    setSelectedSequences([]);
    setSelectedRegion(Region.ALL);
    setAlreadyRun(false);
    setMessage("");
  }, [open]);

  const handleSequenceSelection = (event: any) => {
    setSelectedSequences(event.target.value);
  }

  const handleRegionSelection = (event: any) => {
    setSelectedRegion(event.target.value);
  }

  const handleClose = () => {
    onClose();
  };

  const runBiosecurityCheck = async () => {
    if (selectedSequences.length === 0) return;

    try {
      const result = await screenSequences({
        variables: {
          input: {
            sequenceIds: selectedSequences,
            region: selectedRegion
          }
        }
      });

      if (result.data) {
        setMessage("Screening started successfully");
        setAlreadyRun(true);
        onScreeningComplete?.();
      }
    } catch (error) {
      console.error('Error running screening:', error);
      setMessage('Error running screening. Please try again.');
    }
  }

  const allSequences = sequencesData?.sequences || [];

  return (
    <Modal
      open={open}
      onClose={handleClose}
    >
      <Box sx={style}>
        <Stack spacing={2} direction="column" alignItems="center" sx={{ height: "100%" }}>
          <Typography variant="h4" >
            Run SecureDNA's screening
          </Typography>
          <Typography variant="body1" sx={{ pb: 2 }}>
            Powered by SecureDNA, the biosecurity check evaluates the safety of a sequence by looking
            for known pathogenic sequences and toxins. Sequences must each be at least 50 base pairs in length.
          </Typography>
          <FormControl size="small" sx={{ width: '100%' }}>
            <InputLabel id="sequence-label">Select sequences</InputLabel>
            <Select
              label="Select sequences"
              multiple
              sx={{ minWidth: 150 }}
              value={selectedSequences}
              onChange={handleSequenceSelection}
            >
              {allSequences.filter((seq: Sequence) => seq.seq.length >= 50).map((seq: Sequence) => {
                return <MenuItem key={seq.id} value={seq.id}>{seq.name}</MenuItem>
              })}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ width: '100%' }}>
            <InputLabel id="region-label">Select region</InputLabel>
            <Select
              label="Select region"
              sx={{ minWidth: 150 }}
              value={selectedRegion}
              onChange={handleRegionSelection}
            >
              {Object.values(Region).map((region) => (
                <MenuItem key={region} value={region}>{region.toUpperCase()}</MenuItem>
              ))}
            </Select>
          </FormControl>
          {!alreadyRun &&
            <Button 
              variant="contained" 
              onClick={runBiosecurityCheck} 
              disabled={selectedSequences.length === 0 || sequencesLoading}
            >
              Run
            </Button>
          }
          {alreadyRun &&
            <Typography variant="body1" color="success">
              {message}
            </Typography>
          }
        </Stack>
      </Box>
    </Modal>
  );
}

export default RunSecureDNABiosecurity;
