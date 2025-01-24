import { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Grid } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
// import LoadingButton from '@mui/lab/LoadingButton/LoadingButton';
import AddIcon from '@mui/icons-material/Add';

import { AclidScreen } from '../mpi/models/aclid';
import { getAclidScreenings } from '../mpi/AclidQueries';
// import { SecureDNAScreen } from '../mpi/models/sequence';
// import { getSecureDNAScreenings } from '../mpi/SecureDNAQueries';

import MPILoginForm from '../components/MPILoginForm';
import SecureDNAScreeningTable from '../components/SecureDNAScreeningTable';
import RunSecureDNABiosecurity from '../components/RunSecureDNABiosecurity';
import AclidScreeningTable from '../components/AclidScreeningTable';
import RunAclidBiosecurity from '../components/RunAclidBiosecurity';
import { getSecureDNAScreenings } from '../mpi/SecureDNAQueries';
import { getAllSequences } from '../mpi/SequencesQueries';
import SequencesTable from '../components/SequencesTable';
import SequenceUploader from '../components/SequenceUploader';
import { Sequence } from '../mpi/models/sequence';


function Screener() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const [secureDNAScreenings, setSecureDNAScreenings] = useState([]);
  const [openNewSecureDNAScreening, setOpenNewSecureDNAScreening] = useState(false);

  const [aclidScreenings, setAclidScreenings] = useState<AclidScreen[]>([]);
  const [openNewAclidSreening, setOpenNewAclidScreening] = useState(false);

  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [openSequenceUploader, setOpenSequenceUploader] = useState(false);

  const fetchSequences = async () => {
    const data = await getAllSequences();
    if (data) {
      // Reverse the array to show newest first
      setSequences([...data].reverse());
    }
  };

  const fetchSecureDNAScreenings = async () => {
      const data = await getSecureDNAScreenings();
      if (data) {
          const sortedData = data.sort((a: any, b: any) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
          );
          setSecureDNAScreenings(sortedData);
      }
  };

  const fetchAclidScreenings = async () => {
    const responseAclidScreens = await getAclidScreenings();
    if (responseAclidScreens) {
      setAclidScreenings(responseAclidScreens['items']);
    }
  }

  useEffect(() => {
    fetchSequences();
    fetchSecureDNAScreenings();
  }, []);

  return (
    <>
      <Box sx={{ position: 'relative', mb: 8, mt: 2 }}>
        <Box sx={{ position: 'absolute', top: 0, right: 0, mr: 3 }}>
          <MPILoginForm isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        </Box>

        <Typography variant="h5" component="h5" gutterBottom 
          sx={{ display: 'flex', alignItems: 'start', ml: 3 }}>
          Sequences
        </Typography>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'start', ml: 3, mb: 3 }}>
          Manage your sequences and run biosecurity screenings.
        </Typography>
        <Box maxWidth="lg" sx={{ ml: 5 }}>
          <Grid
            container
            direction="row"
            justifyContent="flex-start"
            alignItems="stretch"
            spacing={3}
          >
            <Grid item xs={12}>
              <SequencesTable 
                sequences={sequences} 
                onNewSequence={() => setOpenSequenceUploader(true)}
                onRefresh={fetchSequences}
              />
            </Grid>
          </Grid>
          <SequenceUploader 
            open={openSequenceUploader} 
            onClose={() => setOpenSequenceUploader(false)}
            onUploadComplete={fetchSequences}
          />
        </Box>
      </Box>

      <Box sx={{ position: 'relative', mb: 8, mt: 2 }}>
        <Typography variant="h5" component="h5" gutterBottom 
          sx={{ display: 'flex', alignItems: 'start', ml: 3 }}>
          SecureDNA Screenings
        </Typography>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'start', ml: 3, mb: 3 }}>
          Run a biosecurity screening on your sequence(s) using SecureDNA's algorithm.
        </Typography>
        <Box maxWidth="lg" sx={{ ml: 5 }}>
          <Grid
            container
            direction="row"
            justifyContent="flex-start"
            alignItems="stretch"
            spacing={3}
          >
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', mb: 2 }}>
                <Button variant='outlined' sx={{ display: 'flex', mr: 3 }} onClick={fetchSecureDNAScreenings}>
                  <RefreshIcon fontSize='small' />
                </Button>
                <Button
                  sx={{ mt: { xs: 2, md: 0 } }}
                  variant="contained"
                  onClick={() => setOpenNewSecureDNAScreening(true)}
                  startIcon={<AddIcon fontSize="small" />}
                >
                  New screening
                </Button>
              </Box>
              <SecureDNAScreeningTable genomes={secureDNAScreenings}/>
            </Grid>
          </Grid>
          <RunSecureDNABiosecurity open={openNewSecureDNAScreening} onClose={() => setOpenNewSecureDNAScreening(false)} />
        </Box>
      </Box>
      <Box>
        <Typography variant="h5" component="h5" gutterBottom 
          sx={{ display: 'flex', alignItems: 'start', ml: 3 }}>
          Aclid Screenings
        </Typography>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'start', ml: 3, mb: 3 }}>
          Run a biosecurity screening on your sequence(s) using Aclid's algorithm.
        </Typography>
        <Box maxWidth="lg" sx={{ ml: 5 }}>
          <Grid
            container
            direction="row"
            justifyContent="flex-start"
            alignItems="stretch"
            spacing={3}
          >
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', mb: 2 }}>
                <Button variant='outlined' sx={{ display: 'flex', mr: 3 }} onClick={() => fetchAclidScreenings()}>
                  <RefreshIcon fontSize='small' />
                </Button>
                <Button
                  sx={{ mt: { xs: 2, md: 0 } }}
                  variant="contained"
                  onClick={() => setOpenNewAclidScreening(true)}
                  startIcon={<AddIcon fontSize="small" />}
                >
                  New screening
                </Button>
              </Box>
              <AclidScreeningTable screenings={aclidScreenings}/>
            </Grid>
          </Grid>
          <RunAclidBiosecurity open={openNewAclidSreening} onClose={() => setOpenNewAclidScreening(false)} />
        </Box>
      </Box>
    </>
  );
}

export default Screener;
