import { useEffect, useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Grid } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';

import MPILoginForm from '../components/MPILoginForm';
import SecureDNAScreeningTable from '../components/SecureDNAScreeningTable';
import UploadAndScreenSequences from '../components/UploadAndScreenSequences';
import { getUserScreenings } from '../mpi/SecureDNAQueries';
import { UserInfo } from '../types/mpi';
import { ScreeningResult } from '../mpi/types';

function Screener() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);

  const [secureDNAScreenings, setSecureDNAScreenings] = useState<ScreeningResult[]>([]);
  const [openUploadAndScreen, setOpenUploadAndScreen] = useState(false);

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
          SecureDNA Screenings
        </Typography>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'start', ml: 3, mb: 3 }}>
          Run biosecurity screenings on your sequences using SecureDNA's algorithm.
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
                  onClick={() => setOpenUploadAndScreen(true)}
                  startIcon={<AddIcon fontSize="small" />}
                >
                  Upload and Screen Sequences
                </Button>
              </Box>
              <SecureDNAScreeningTable screenings={secureDNAScreenings}/>
            </Grid>
          </Grid>
          <UploadAndScreenSequences 
            open={openUploadAndScreen} 
            onClose={() => setOpenUploadAndScreen(false)}
            onScreeningComplete={fetchSecureDNAScreenings}
          />
        </Box>
      </Box>
    </>
  );
}

export default Screener;
