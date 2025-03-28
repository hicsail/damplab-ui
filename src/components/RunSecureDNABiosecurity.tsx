import { Box, Button, FormControl, InputLabel, MenuItem, Modal, Select, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
// import { LoadingButton } from '@mui/lab';
import { screenSequencesBatch } from '../mpi/SecureDNAQueries';
import { Sequence } from '../mpi/models/sequence';
import { getAllSequences } from '../mpi/SequencesQueries';
import { Region } from '../mpi/types';

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
}

function RunSecureDNABiosecurity({ onClose, open }: RunSecureDNABiosecurityProps) {
  const [allSequences, setAllSequences] = useState<Sequence[]>([]);
  const [selectedSequences, setSelectedSequences] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<Region>(Region.ALL);
  const [alreadyRun, setAlreadyRun] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSequences();
    setSelectedSequences([]);
    setSelectedRegion(Region.ALL);
    setAlreadyRun(false);
    setMessage("");
  }, [open]);

  const fetchSequences = async () => {
    const responseSequences = await getAllSequences();
    if (responseSequences && Array.isArray(responseSequences)) {
      setAllSequences(responseSequences);
    }
  }

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

    const result = await screenSequencesBatch(selectedSequences, selectedRegion);
    if (result) {
      setMessage(result.message);
      setAlreadyRun(true);
    }
  }

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
              {allSequences.filter((seq) => seq.seq.length >= 50).map((seq) => {
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
              disabled={selectedSequences.length === 0}
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
