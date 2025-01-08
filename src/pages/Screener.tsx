import { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Grid, Container } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
// import LoadingButton from '@mui/lab/LoadingButton/LoadingButton';
import AddIcon from '@mui/icons-material/Add';

import { AclidScreen } from '../mpi/models/aclid';
import { getAclidScreenings } from '../mpi/AclidQueries';
import { SecureDNAScreen } from '../mpi/models/securedna';
import { getSecureDNAScreenings } from '../mpi/SecureDNAQueries';

import MPILoginForm from '../components/MPILoginForm';
import SecureDNAScreeningTable from '../components/SecureDNAScreeningTable';
import RunSecureDNABiosecurity from '../components/RunSecureDNABiosecurity';
import AclidScreeningTable from '../components/AclidScreeningTable';
import RunAclidBiosecurity from '../components/RunAclidBiosecurity';


function AclidScreenings() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

  const [aclidScreenings, setAclidScreenings] = useState<AclidScreen[]>([]);
  const [aclidLoading, setAclidLoading] = useState(false);
  const [openNewAclidSreening, setOpenNewAclidScreening] = useState(false);

  const [secureDNAScreenings, setSecureDNAScreenings] = useState<SecureDNAScreen[]>([]);
  const [secureDNALoading, setSecureDNALoading] = useState(false);
  const [openNewSecureDNAScreening, setOpenNewSecureDNAScreening] = useState(false);

  // useEffect(() => {
  //   fetchAclidScreenings();
  //   fetchSecureDNAScreenings();
  // }, [])

  const fetchAclidScreenings = async () => {
    setAclidLoading(true);
    const responseAclidScreens = await getAclidScreenings();
    if (responseAclidScreens) {
      setAclidScreenings(responseAclidScreens['items']);
      setAclidLoading(false);
    }
  }

  const fetchSecureDNAScreenings = async () => {
    setSecureDNALoading(true);
    const responseSecureDNAScreens = await getSecureDNAScreenings();
    if (responseSecureDNAScreens) {
      setSecureDNAScreenings(responseSecureDNAScreens['items']);
      setSecureDNALoading(false);
    }
  }

  return (
    <>
      <Box sx={{ position: 'relative', mb: 8, mt: 2 }}>
        
        <Box sx={{ position: 'absolute', top: 0, right: 0, mr: 3 }}>
          <MPILoginForm isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
        </Box>

        <Typography variant="h5" component="h5" gutterBottom 
          sx={{ display: 'flex', alignItems: 'start', ml: 3 }}>
          SecureDNA screening
        </Typography>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'start', ml: 3, mb: 3 }}>
          Run a biosecurity screening on your sequence(s) using SecureDNA's algorithm.
        </Typography>
        <Container maxWidth="lg">
          <Grid
            container
            direction="row"
            justifyContent="center"
            alignItems="stretch"
            spacing={3}
          >
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Button variant='outlined' sx={{ display: 'flex', alignItems: 'start', mr: 3 }} onClick={() => fetchSecureDNAScreenings()}>
                  <RefreshIcon fontSize='small'/>
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
              <SecureDNAScreeningTable screenings={secureDNAScreenings}/>
            </Grid>
          </Grid>
          <RunSecureDNABiosecurity open={openNewSecureDNAScreening} onClose={() => setOpenNewSecureDNAScreening(false)} />
        </Container>
      </Box>
      <Box>
        <Typography variant="h5" component="h5" gutterBottom 
          sx={{ display: 'flex', alignItems: 'start', ml: 3 }}>
          Aclid screening
        </Typography>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'start', ml: 3, mb: 3 }}>
          Run a biosecurity screening on your sequence(s) using Aclid's algorithm.
        </Typography>
        <Container maxWidth="lg">
          <Grid
            container
            direction="row"
            justifyContent="center"
            alignItems="stretch"
            spacing={3}
          >
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Button variant='outlined' sx={{ display: 'flex', alignItems: 'start', mr: 3 }} onClick={() => fetchAclidScreenings()}>
                  <RefreshIcon fontSize='small'/>
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
        </Container>
      </Box>
    </>
  );
}

export default AclidScreenings;
