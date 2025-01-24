import { Box, Button, FormControl, InputLabel, MenuItem, Modal, Select, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
// import { LoadingButton } from '@mui/lab';
import { screenSequence } from '../mpi/SecureDNAQueries';
import { Sequence } from '../mpi/models/sequence';
import { getAllSequences } from '../mpi/SequencesQueries';

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
  const [selectedSequence, setSelectedSequence] = useState<Sequence | undefined>();
  const [alreadyRun, setAlreadyRun] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetchSequences()
    setSelectedSequence(undefined);
    setAlreadyRun(false);
  }, [open]);

  const fetchSequences = async () => {
    const responseSequences = await getAllSequences();
    if (responseSequences && Array.isArray(responseSequences)) {
      setAllSequences(responseSequences);
    }
    console.log('all sequences: ', responseSequences);
  }

  const handleSequenceSelection = (sequenceId: string) => {
    const selected = allSequences.find((seq) => seq.id === sequenceId);
    setSelectedSequence(selected);
  }

  const handleClose = () => {
    onClose();
  };

  const runBiosecurityCheck = async () => {
    const id = selectedSequence?.id || "";
    const result = await screenSequence([id]);
    setMessage(result['message']);
    setAlreadyRun(true);
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
            <InputLabel id="sequence-label">Select sequence</InputLabel>
            <Select
              label="Select sequence"
              sx={{ minWidth: 150 }}
              value={selectedSequence ? selectedSequence.id : ""}
              onChange={(e) => handleSequenceSelection(e.target.value)}
            >
              {allSequences.filter((seq) => seq.seq.length >= 50).map((seq) => {
                return <MenuItem key={seq.id} value={seq.id}>{seq.name}</MenuItem>
              })}
            </Select>
          </FormControl>
          {!alreadyRun &&
            <Button variant="contained" onClick={() => runBiosecurityCheck()} disabled={!selectedSequence}>
              Run
            </Button>
          }
          {alreadyRun &&
            <Typography variant="body1" color="success">
              The biosecurity check is running on the backround. You can close this window. Results will be showin in the sequence view.
            </Typography>
          }
        </Stack>
      </Box>
    </Modal>
  );
}
export default RunSecureDNABiosecurity;
