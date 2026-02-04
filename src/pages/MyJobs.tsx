import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@apollo/client';
import { Box, Button, Alert } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SubmittedJobsList, { type JobListItem, STATE_OPTIONS } from '../components/SubmittedJobsList';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { OWN_JOBS } from '../gql/queries';

export default function MyJobs() {
  const navigate = useNavigate();
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [searchInput, setSearchInput] = React.useState('');
  const [stateFilter, setStateFilter] = React.useState<string>(STATE_OPTIONS[0]);
  const [hasSowFilter, setHasSowFilter] = React.useState<'all' | 'yes' | 'no'>('all');

  const search = useDebouncedValue(searchInput, 300);

  const input = useMemo(() => {
    const inp: Record<string, unknown> = { page, limit, sortBy: 'SUBMITTED', sortOrder: 'DESC' };
    if (search.trim()) inp.search = search.trim();
    if (stateFilter) inp.state = stateFilter;
    if (hasSowFilter !== 'all') inp.hasSow = hasSowFilter === 'yes';
    return inp;
  }, [page, limit, search, stateFilter, hasSowFilter]);

  const { data, loading, error } = useQuery(OWN_JOBS, { variables: { input } });

  const result = data?.ownJobs;
  const items: JobListItem[] = useMemo(() => {
    const raw = result?.items ?? [];
    return raw.map((j: Record<string, unknown>) => ({
      id: String(j.id ?? ''),
      name: String(j.name ?? ''),
      state: String(j.state ?? ''),
      submitted: String(j.submitted ?? ''),
      username: j.username != null ? String(j.username) : undefined,
      institute: j.institute != null ? String(j.institute) : undefined,
      email: j.email != null ? String(j.email) : undefined,
      sow: j.sow ? {
        id: String((j.sow as Record<string, unknown>).id ?? ''),
        sowNumber: String((j.sow as Record<string, unknown>).sowNumber ?? ''),
        sowTitle: (j.sow as Record<string, unknown>).sowTitle != null ? String((j.sow as Record<string, unknown>).sowTitle) : undefined,
        status: String((j.sow as Record<string, unknown>).status ?? ''),
      } : null,
    }));
  }, [result?.items]);
  const totalCount = result?.totalCount ?? 0;

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handleLimitChange = useCallback((l: number) => { setLimit(l); setPage(1); }, []);

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')} sx={{ mb: 2 }}>Back to Home</Button>
        <Alert severity="error">Failed to load your jobs. Please try again later.</Alert>
      </Box>
    );
  }

  return (
    <SubmittedJobsList
      items={items}
      totalCount={totalCount}
      loading={loading}
      page={page}
      limit={limit}
      onPageChange={handlePageChange}
      onLimitChange={handleLimitChange}
      search={searchInput}
      onSearchChange={setSearchInput}
      stateFilter={stateFilter}
      onStateFilterChange={setStateFilter}
      hasSowFilter={hasSowFilter}
      onHasSowFilterChange={setHasSowFilter}
      showHasSowFilter
      getJobLink={(j) => `/client_view/${j.id}`}
      isStaff={false}
      title="My Jobs"
      subtitle="Jobs you have submitted. Click a job to view its status, SOW, and comments."
      emptyMessage="You have not submitted any jobs yet. Design a workflow on the Canvas and submit it from Checkout."
      onBack={() => navigate('/')}
      backLabel="Back to Home"
    />
  );
}