import { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { Grid } from '@mui/material';
import SequencesTable from '../components/SequencesTable';
import SequenceUploader from '../components/SequenceUploader';
import { Sequence } from '../mpi/models/sequence';
import { getAllSequences } from '../mpi/SequencesQueries';

function Sequences() {
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [openSequenceUploader, setOpenSequenceUploader] = useState(false);

  const fetchSequences = async () => {
    const data = await getAllSequences();
    if (data) {
      // Reverse the array to show newest first
      setSequences([...data].reverse());
    }
  };

  useEffect(() => {
    fetchSequences();
  }, []);

  return (
    <Box sx={{ position: 'relative', mb: 8, mt: 2 }}>
      <Typography variant="h5" component="h5" gutterBottom 
        sx={{ display: 'flex', alignItems: 'start', ml: 3 }}>
        Sequences
      </Typography>
      <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'start', ml: 3, mb: 3 }}>
        Manage your sequences stored in the MPI server.
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
  );
}

export default Sequences; 