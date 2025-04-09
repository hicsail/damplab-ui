import { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Grid } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import { useQuery, useApolloClient } from '@apollo/client';

import MPILoginButton from '../components/MPILoginButton';
import SecureDNAScreeningTable from '../components/SecureDNAScreeningTable';
import UploadAndScreenSequences from '../components/UploadAndScreenSequences';
import { UserInfo } from '../types/mpi';
import { GET_USER_SCREENINGS } from '../mpi/SequencesQueries';

function Screener() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [openUploadAndScreen, setOpenUploadAndScreen] = useState(false);
  const client = useApolloClient();

  const { data, loading, error, refetch } = useQuery(GET_USER_SCREENINGS, {
    pollInterval: 30000, // Poll every 30 seconds
  });

  const handleRefresh = () => {
    refetch();
  };

  return (
    <>
      <Box sx={{ position: 'relative', mt: 2 }}>
        <Typography variant="h5" component="h5" gutterBottom 
          sx={{ display: 'flex', alignItems: 'start', ml: 3 }}>
          SecureDNA Screenings
        </Typography>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'start', ml: 3, mb: 5 }}>
          Sign into the MPI to access SecureDNA's screening tool.
        </Typography>
        <Box maxWidth="lg" sx={{ ml: 3 }}>
          <Grid
            container
            direction="row"
            justifyContent="flex-start"
            alignItems="stretch"
            spacing={3}
          >
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', mb: 2 }}>
                <Button variant='outlined' sx={{ mr: 3 }} onClick={handleRefresh}>
                  <RefreshIcon fontSize='small' />
                </Button>
                <Button
                  sx={{ mr: 3 }}
                  variant="contained"
                  onClick={() => setOpenUploadAndScreen(true)}
                  startIcon={<AddIcon fontSize="small" />}
                  disabled={!isLoggedIn}
                >
                  Upload and Screen Sequences
                </Button>
                <Box sx={{ mt: 0.0 }}>
                  <MPILoginButton 
                    isLoggedIn={isLoggedIn} 
                    setIsLoggedIn={setIsLoggedIn}
                    userInfo={userInfo}
                    setUserInfo={setUserInfo}
                  />
                </Box>
              </Box>
              <SecureDNAScreeningTable />
            </Grid>
          </Grid>
          <UploadAndScreenSequences 
            open={openUploadAndScreen} 
            onClose={() => setOpenUploadAndScreen(false)}
            onScreeningComplete={handleRefresh}
          />
        </Box>
      </Box>
    </>
  );
}

export default Screener;
