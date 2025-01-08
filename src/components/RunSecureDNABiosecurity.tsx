import { Box, Button, FormControl, InputLabel, MenuItem, Modal, Select, Stack, TextField, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
// import { LoadingButton } from '@mui/lab';
import { screenSequence } from '../mpi/AclidQueries';
import { Sequence } from '../mpi/models/sequence';
import { getAllSequences } from '../mpi/SequencesQueries';
import ErrorModal from '../components/ErrorModal';

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

// TODO: Copied from Aclid; reimplement for SecureDNA

interface RunAclidBiosecurityProps {
  open: boolean
  onClose: () => void
}

function RunAclidBiosecurity({ onClose, open }: RunAclidBiosecurityProps) {
  const [submissionName, setSubmissionName] = useState("");
  const [allSequences, setAllSequences] = useState<Sequence[]>([]);
  const [selectedSequence, setSelectedSequence] = useState<Sequence | undefined>();
  const [loading, setLoading] = useState(false);
  const [alreadyRun, setAlreadyRun] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [openErrorModal, setOpenErrorModal] = useState(false);

  useEffect(() => {
    fetchSequences()
    setSubmissionName("");
    setSelectedSequence(undefined);
    setAlreadyRun(false);
    setOpenErrorModal(false);
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
    setLoading(true);
    const name = selectedSequence?.name || "";
    const sequence = selectedSequence?.seq || "";
    const sequences = { 'name': name, 'sequence': sequence };
    const result = await screenSequence(submissionName, [sequences]);
    // TODO: eventully this will be an error thrown instead
    if (result && result['code'] && result['code'] === 'NO_NDA') {
      setErrorMessage("An approved NDA with Aclid is needed to screen your sequences. Head to Linked Accounts and upload an NDA. Once it's approved, you'll be able to screen sequences.");
      setOpenErrorModal(true);
    } else if (result && result['code'] && result['code'] === 'NO_KEY') {
      setErrorMessage("A key with Aclid is needed to screen your sequences. Head to My Resources and enter your key for the Aclid resource.");
      setOpenErrorModal(true);
    } else {
      setAlreadyRun(true);
    }
    setLoading(false);
  }


  return (
    <Modal
      open={open}
      onClose={handleClose}
    >
      <Box sx={style}>
        <Stack spacing={2} direction="column" alignItems="center" sx={{ height: "100%" }}>
          <Typography variant="h4" >
            Run Aclid's biosecurity check
          </Typography>
          <Typography variant="body1" sx={{ pb: 2 }}>
            Powered by Aclid, the biosecurity check evaluates the safety of a sequence by looking
            for known pathogenic sequences and toxins. Sequences must each be at least 50 base pairs in length.
          </Typography>
          <FormControl size="small" sx={{ width: '100%' }}>
            <TextField
              label="Screening name"
              variant="outlined"
              size="small"
              value={submissionName}
              onChange={(e) => setSubmissionName(e.target.value)}
            />
          </FormControl>
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
            <Button variant="contained" onClick={() => runBiosecurityCheck()} disabled={!setSubmissionName || !selectedSequence}>
              Run
            </Button>
          }
          {alreadyRun &&
            <Typography variant="body1" color="success">
              The biosecurity check is running on the backround. You can close this window. Results will be showin in the sequence view.
            </Typography>
          }
        </Stack>
        {openErrorModal && <ErrorModal open={openErrorModal} onClose={() => setOpenErrorModal(false)} message={errorMessage} />}
      </Box>
    </Modal>
  );
}
export default RunAclidBiosecurity;
