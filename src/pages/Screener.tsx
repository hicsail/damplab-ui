import { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Grid } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
// import LoadingButton from '@mui/lab/LoadingButton/LoadingButton';
import AddIcon from '@mui/icons-material/Add';

// import { SecureDNAScreen } from '../mpi/models/sequence';
// import { getSecureDNAScreenings } from '../mpi/SecureDNAQueries';

import MPILoginForm from '../components/MPILoginForm';
import SecureDNAScreeningTable from '../components/SecureDNAScreeningTable';
import RunSecureDNABiosecurity from '../components/RunSecureDNABiosecurity';
import { getUserScreenings } from '../mpi/SecureDNAQueries';
import { getAllSequences } from '../mpi/SequencesQueries';
import SequencesTable from '../components/SequencesTable';
import SequenceUploader from '../components/SequenceUploader';
import { Sequence } from '../mpi/models/sequence';
import { UserInfo } from '../types/mpi';
import { ScreeningResult } from '../mpi/types';


function Screener() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const [secureDNAScreenings, setSecureDNAScreenings] = useState<ScreeningResult[]>([]);
  const [openNewSecureDNAScreening, setOpenNewSecureDNAScreening] = useState(false);

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
    const data = await getUserScreenings();
    if (data) {
      const sortedData = data.sort((a: any, b: any) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setSecureDNAScreenings(sortedData);
    }
  };

  useEffect(() => {
    fetchSequences();
    fetchSecureDNAScreenings();
  }, []);

  return (
    <>
      <Box sx={{ position: 'relative', mb: 8, mt: 2 }}>
        <Box sx={{ position: 'absolute', top: 0, right: 0, mr: 3 }}>
          <MPILoginForm 
            isLoggedIn={isLoggedIn} 
            setIsLoggedIn={setIsLoggedIn}
            userInfo={userInfo}
            setUserInfo={setUserInfo}
          />
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
              <SecureDNAScreeningTable screenings={secureDNAScreenings}/>
            </Grid>
          </Grid>
          <RunSecureDNABiosecurity open={openNewSecureDNAScreening} onClose={() => setOpenNewSecureDNAScreening(false)} />
        </Box>
      </Box>
    </>
  );
}

export default Screener;
