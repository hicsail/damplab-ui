import { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Grid, Container } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
// import LoadingButton from '@mui/lab/LoadingButton/LoadingButton';
import AddIcon from '@mui/icons-material/Add';

import { AclidScreen } from '../mpi/models/aclid';
import { getAclidScreenings } from '../mpi/AclidQueries';

import ScreenerTable from '../components/ScreenerTable';
import MPILoginForm from '../components/MPILoginForm';
import RunAclidBiosecurity from '../components/RunAclidBiosecurity';


function AclidScreenings() {
  const [screenings, setScreenings] = useState<AclidScreen[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [openNewSreening, setOpenNewScreening] = useState(false);

  useEffect(() => {
    fetchScreenings();
  }, [])

  const fetchScreenings = async () => {
    setLoading(true);
    const responseScreens = await getAclidScreenings();
    if (responseScreens) {
      setScreenings(responseScreens['items']);
      setLoading(false);
    }
  }

  return (
    <>
      <Typography variant="h4" component="h4" gutterBottom 
        sx={{ display: 'flex', alignItems: 'start', ml: 3 }}>
        Aclid screening
      </Typography>
      <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'start', ml: 3, mb: 5 }}>
        Run a biosecurity screening on your sequences using Aclid's state of the art algorithm.
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
              <Button variant='outlined' sx={{ display: 'flex', alignItems: 'start', mr: 3 }} onClick={() => fetchScreenings()}>
                <RefreshIcon fontSize='small'/>
              </Button>
              <MPILoginForm isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
              <Button
                sx={{ mt: { xs: 2, md: 0 }, ml: 3 }}
                variant="contained"
                onClick={() => setOpenNewScreening(true)}
                startIcon={<AddIcon fontSize="small" />}
              >
                New screening
              </Button>
            </Box>
            <ScreenerTable screenings={screenings}/>
          </Grid>
        </Grid>
        <RunAclidBiosecurity open={openNewSreening} onClose={() => setOpenNewScreening(false)} />
      </Container>
    </>
  );
}

export default AclidScreenings;
