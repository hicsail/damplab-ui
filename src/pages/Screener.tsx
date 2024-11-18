import { useEffect, useState } from 'react';
import { Button } from '@mui/material';
import { Grid, Container } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
// import LoadingButton from '@mui/lab/LoadingButton/LoadingButton';

import { AclidScreen } from '../mpi/models/aclid';
import { getAclidScreenings } from '../mpi/AclidQueries';

import ScreenerHeader from '../components/ScreenerHeader';
import ScreenerTable from '../components/ScreenerTable';
import MPILoginForm from '../components/MPILoginForm';


function AclidScreenings() {
  const [screenings, setScreenings] = useState<AclidScreen[]>([]);
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);

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
      <ScreenerHeader />
      <Container maxWidth="lg">
        <Grid
          container
          direction="row"
          justifyContent="center"
          alignItems="stretch"
          spacing={3}
        >
          <Grid item xs={12}>
            <Button variant='outlined' size='small' sx={{ mb: 1 }} onClick={() => fetchScreenings()}>
              <RefreshIcon fontSize='small'/>
            </Button>
            <MPILoginForm isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />
            <ScreenerTable screenings={screenings}/>
          </Grid>
        </Grid>
      </Container>
    </>
  );
}

export default AclidScreenings;
