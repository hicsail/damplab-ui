import { Box, CircularProgress, Modal, Stack, Typography } from '@mui/material';
import { useEffect, useState } from 'react';
import { getAclidScreeningDetails } from '../mpi/AclidQueries';
import { AclidMatch, AclidScreen } from '../mpi/models/aclid';

const style = {
  position: 'absolute',
  top: '50%',
  left: '55%',
  transform: 'translate(-50%, -50%)',
  width: 700,
  height: 700,
  bgcolor: 'background.paper',
  border: '1px solid #000',
  boxShadow: 24,
  p: 4,
  borderRadius: '16px'
};

interface AclidMatchElementProps {
  index: number;
  match: AclidMatch;
}

const AclidMatchElement = ({ index, match }: AclidMatchElementProps) => {
  return (
    <>
      <Typography variant='h6'>
        Match #{index + 1}
      </Typography>
      <Typography variant='body1' textAlign='start' sx={{ width: '100%' }}>
        <b>E value:</b> {match.evalue}
      </Typography>
      <Typography variant='body1' textAlign='start' sx={{ width: '100%' }}>
        <b>Bitscore:</b> {match.bitscore}
      </Typography>
      <Typography variant='body1' textAlign='start' sx={{ width: '100%' }}>
        <b>TaxId:</b> {match.taxid}
      </Typography>
      <Typography variant='body1' textAlign='start' sx={{ width: '100%' }}>
        <b>Organism:</b> {match.organism}
      </Typography>
      <Typography variant='body1' textAlign='start' sx={{ width: '100%' }}>
        <b>Gene:</b> {match.gene}
      </Typography>
      <Typography variant='body1' textAlign='start' sx={{ width: '100%' }}>
        <b>Function:</b> {match.function ?? 'Not available'}
      </Typography>
    </>
  )

}


interface AclidBiosecurityDetailsProps {
  onClose: () => void;
  open: boolean;
  screening: AclidScreen | null;
}

function AclidBiosecurityDetails({ onClose, open, screening }: AclidBiosecurityDetailsProps) {
  const [matches, setMatches] = useState<AclidMatch[]>();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (screening?.id) {
      fetchScreeningDetails(screening?.id);
    }
  }, [open, screening?.id]);

  const handleClose = () => {
    onClose();
  };

  const fetchScreeningDetails = async (id: string) => {
    setLoading(true);
    const details = await getAclidScreeningDetails(id)
    if (details) {
      // Get first key since for now, we are only sending 1 sequence
      const screeningName = Object.keys(details)[0];
      setMatches(details[screeningName].matches);
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
            {screening?.name} details
          </Typography>
          {loading || !matches ?
            <CircularProgress />
            :
            <>
              <Typography variant='h5'>
                Matches
              </Typography>
              <Stack spacing={1} direction="column" alignItems="center" sx={{ maxHeight: '100%', overflowY: 'auto' }}>
                {matches.length > 0 ?
                  matches?.map((match, index) => (
                    <AclidMatchElement key={index} match={match} index={index} />
                  ))
                  :
                  <Typography variant='body1'>
                    No matches found for this screening, your sequence is safe!
                  </Typography>
                }
              </Stack>
            </>
          }
        </Stack>
      </Box>
    </Modal>
  );
}
export default AclidBiosecurityDetails;
