import { Typography, Button, Grid } from '@mui/material';

import AddIcon from '@mui/icons-material/Add';
import { useState } from 'react';
import RunAclidBiosecurity from '../components/RunAclidBiosecurity';


function ScreenerHeader() {

  const [openNewSreening, setOpenNewScreening] = useState(false);

  return (
    <>
      <Grid container justifyContent="space-between" alignItems="center">
        <Grid item>
          <Typography variant="h3" component="h3" gutterBottom>
            Aclid screening
          </Typography>
          <Typography variant="subtitle2">
            Run a biosecurity screening on your sequences using Aclid's state of the art algorithm.
          </Typography>
        </Grid>
        <Grid item>
          <Button
            sx={{ mt: { xs: 2, md: 0 } }}
            variant="contained"
            onClick={() => setOpenNewScreening(true)}
            startIcon={<AddIcon fontSize="small" />}
          >
            New screening
          </Button>
        </Grid>
      </Grid>
      <RunAclidBiosecurity open={openNewSreening} onClose={() => setOpenNewScreening(false)} />
    </>
  );
}

export default ScreenerHeader;
