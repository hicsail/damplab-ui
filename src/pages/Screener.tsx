import { useState } from 'react';
import { Box, Button, Typography } from '@mui/material';
import { Grid } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import AddIcon from '@mui/icons-material/Add';
import { useQuery } from '@apollo/client';

import SecureDNAScreeningTable from '../components/SecureDNAScreeningTable';
import UploadAndScreenSequences from '../components/UploadAndScreenSequences';
import { GET_ORG_SCREENINGS } from '../mpi/SequencesQueries';

function Screener() {
  const [openUploadAndScreen, setOpenUploadAndScreen] = useState(false);

  const { data, loading, error, refetch } = useQuery(GET_ORG_SCREENINGS);

  const handleRefresh = () => refetch();

  return (
    <>
      <Box sx={{ position: 'relative', mt: 2 }}>
        <Typography variant="h5" component="h5" gutterBottom
          sx={{ display: 'flex', alignItems: 'start', ml: 3 }}>
          SecureDNA Screenings
        </Typography>
        <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'start', ml: 3, mb: 5 }}>
          Upload sequences to screen them against SecureDNA's biosecurity database.
        </Typography>
        <Box sx={{ ml: 3 }}>
          <Grid
            container
            direction="row"
            justifyContent="flex-start"
            alignItems="stretch"
            spacing={3}
          >
            <Grid size={12}>
              <Box sx={{ display: 'flex', mb: 2 }}>
                <Button variant='outlined' sx={{ mr: 3 }} onClick={handleRefresh}>
                  <RefreshIcon fontSize='small' />
                </Button>
                <Button
                  sx={{ mr: 3 }}
                  variant="contained"
                  onClick={() => setOpenUploadAndScreen(true)}
                  startIcon={<AddIcon fontSize="small" />}
                >
                  Upload and Screen Sequences
                </Button>
              </Box>
              <SecureDNAScreeningTable
                screenings={data?.orgScreenings ?? []}
                loading={loading}
                error={error}
              />
            </Grid>
          </Grid>
          <UploadAndScreenSequences
            open={openUploadAndScreen}
            onClose={() => setOpenUploadAndScreen(false)}
          />
        </Box>
      </Box>
    </>
  );
}

export default Screener;
