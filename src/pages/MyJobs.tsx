import React from 'react';
import { useNavigate, Link } from 'react-router';
import { useQuery } from '@apollo/client';
import {
  Box,
  Button,
  Typography,
  Alert,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionIcon from '@mui/icons-material/Description';
import { GET_OWN_JOBS } from '../gql/queries';

interface OwnJob {
  id: string;
  name: string;
  state: string;
  submitted: string;
  sow?: { id: string; sowNumber: string; status: string } | null;
}

export default function MyJobs() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(GET_OWN_JOBS);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mb: 2 }}>
          Back to Home
        </Button>
        <Alert severity="error">
          Failed to load your jobs. Please try again later.
        </Alert>
      </Box>
    );
  }

  const jobs: OwnJob[] = data?.ownJobs ?? [];

  return (
    <Box sx={{ p: 3, maxWidth: 900, mx: 'auto' }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/')}
        sx={{ mb: 2, textTransform: 'none' }}
      >
        Back to Home
      </Button>

      <Typography variant="h4" sx={{ mb: 1 }}>
        My Jobs
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Jobs you have submitted. Click a job to view its status, SOW, and comments.
      </Typography>

      {jobs.length === 0 ? (
        <Alert severity="info">
          You have not submitted any jobs yet. Design a workflow on the Canvas and submit it from Checkout.
        </Alert>
      ) : (
        <Stack spacing={2}>
          {jobs.map((job) => (
            <Card
              key={job.id}
              component={Link}
              to={`/client_view/${job.id}`}
              sx={{
                textDecoration: 'none',
                color: 'inherit',
                transition: 'box-shadow 0.2s',
                '&:hover': { boxShadow: 4 },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 1 }}>
                  <Box>
                    <Typography variant="h6" fontWeight="bold">
                      {job.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Job ID: {job.id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Submitted: {new Date(job.submitted).toLocaleString()}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip label={job.state} size="small" color="default" variant="outlined" />
                    {job.sow && (
                      <Chip
                        icon={<DescriptionIcon sx={{ fontSize: 16 }} />}
                        label="SOW"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
