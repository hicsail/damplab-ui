import React from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@apollo/client';
import { Box, Button, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SubmittedJobsList, { type JobListItem } from '../components/SubmittedJobsList';
import { GET_OWN_JOBS } from '../gql/queries';

export default function MyJobs() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery(GET_OWN_JOBS);

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

  const jobs: JobListItem[] = (data?.ownJobs ?? []).map((j: { id: string; name: string; state: string; submitted: string; sow?: { id: string; sowNumber: string; status: string } | null }) => ({
    id: j.id,
    name: j.name,
    state: j.state,
    submitted: j.submitted,
    sow: j.sow ?? null,
  }));

  return (
    <SubmittedJobsList
      jobs={jobs}
      isStaff={false}
      getJobLink={(j) => `/client_view/${j.id}`}
      loading={loading}
      emptyMessage="You have not submitted any jobs yet. Design a workflow on the Canvas and submit it from Checkout."
      title="My Jobs"
      subtitle="Jobs you have submitted. Click a job to view its status, SOW, and comments."
      onBack={() => navigate('/')}
      backLabel="Back to Home"
      showHasSowFilter
    />
  );
}
