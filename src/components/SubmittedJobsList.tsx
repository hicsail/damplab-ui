import React, { useMemo, useState, useCallback } from 'react';
import { Link } from 'react-router';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionIcon from '@mui/icons-material/Description';
import SearchIcon from '@mui/icons-material/Search';

export interface JobListItem {
  id: string;
  name: string;
  state: string;
  submitted: string;
  sow?: { id: string; sowNumber: string; status: string } | null;
  username?: string;
  institute?: string;
  email?: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const STATE_OPTIONS = ['', 'SUBMITTED', 'QUEUED', 'IN_PROGRESS', 'COMPLETE'];

function matchSearch(job: JobListItem, q: string): boolean {
  if (!q.trim()) return true;
  const lower = q.toLowerCase().trim();
  const name = (job.name ?? '').toLowerCase();
  const id = (job.id ?? '').toLowerCase();
  const username = (job.username ?? '').toLowerCase();
  const institute = (job.institute ?? '').toLowerCase();
  const email = (job.email ?? '').toLowerCase();
  return (
    name.includes(lower) ||
    id.includes(lower) ||
    username.includes(lower) ||
    institute.includes(lower) ||
    email.includes(lower)
  );
}

export interface SubmittedJobsListProps {
  jobs: JobListItem[];
  isStaff?: boolean;
  getJobLink: (job: JobListItem) => string;
  loading?: boolean;
  emptyMessage?: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  showHasSowFilter?: boolean;
}

export default function SubmittedJobsList({
  jobs,
  isStaff = false,
  getJobLink,
  loading = false,
  emptyMessage = 'No jobs found.',
  title,
  subtitle,
  onBack,
  backLabel = 'Back to Home',
  showHasSowFilter = false,
}: SubmittedJobsListProps) {
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState<string>(STATE_OPTIONS[0]);
  const [hasSowFilter, setHasSowFilter] = useState<'all' | 'yes' | 'no'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);

  const filteredAndSorted = useMemo(() => {
    let list = [...jobs];
    list = list.filter((j) => matchSearch(j, search));
    if (stateFilter) {
      list = list.filter((j) => (j.state ?? '').toUpperCase() === stateFilter);
    }
    if (showHasSowFilter && hasSowFilter !== 'all') {
      if (hasSowFilter === 'yes') list = list.filter((j) => !!j?.sow);
      else list = list.filter((j) => !j?.sow);
    }
    list.sort((a, b) => {
      const da = new Date(a.submitted || 0).getTime();
      const db = new Date(b.submitted || 0).getTime();
      return db - da;
    });
    return list;
  }, [jobs, search, stateFilter, showHasSowFilter, hasSowFilter]);

  const totalCount = filteredAndSorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const start = (pageSafe - 1) * pageSize;
  const pageJobs = filteredAndSorted.slice(start, start + pageSize);

  const handlePageChange = useCallback((_: unknown, p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback(
    (e: { target: { value: string } }) => {
      const v = Number(e.target.value);
      if (PAGE_SIZE_OPTIONS.includes(v as (typeof PAGE_SIZE_OPTIONS)[number])) {
        setPageSize(v);
        setPage(1);
      }
    },
    []
  );

  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      {onBack && (
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={onBack}
          sx={{ mb: 2, textTransform: 'none' }}
        >
          {backLabel}
        </Button>
      )}

      <Typography variant="h4" sx={{ mb: 1 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {subtitle}
        </Typography>
      )}

      {/* Search & filters */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        sx={{ mb: 3 }}
        flexWrap="wrap"
        useFlexGap
      >
        <TextField
          size="small"
          placeholder="Search by name, ID, username, institution, email…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 280, flex: '1 1 280px' }}
        />
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={stateFilter}
            label="Status"
            onChange={(e) => {
              setStateFilter(e.target.value);
              setPage(1);
            }}
          >
            <MenuItem value="">All</MenuItem>
            {STATE_OPTIONS.slice(1).map((s) => (
              <MenuItem key={s} value={s}>
                {s.replace('_', ' ')}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {showHasSowFilter && (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>SOW</InputLabel>
            <Select
              value={hasSowFilter}
              label="SOW"
              onChange={(e) => {
                setHasSowFilter(e.target.value as 'all' | 'yes' | 'no');
                setPage(1);
              }}
            >
              <MenuItem value="all">Any</MenuItem>
              <MenuItem value="yes">Has SOW</MenuItem>
              <MenuItem value="no">No SOW</MenuItem>
            </Select>
          </FormControl>
        )}
      </Stack>

      {loading ? (
        <Stack spacing={2}>
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} variant="rounded" height={120} />
          ))}
        </Stack>
      ) : totalCount === 0 ? (
        <Typography color="text.secondary">{emptyMessage}</Typography>
      ) : (
        <>
          <Stack spacing={2} sx={{ mb: 3 }}>
            {pageJobs.map((job) => (
              <Card
                key={job.id}
                component={Link}
                to={getJobLink(job)}
                sx={{
                  textDecoration: 'none',
                  color: 'inherit',
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: 4 },
                }}
              >
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      flexWrap: 'wrap',
                      gap: 1,
                    }}
                  >
                    <Box>
                      <Typography variant="h6" fontWeight="bold">
                        {job.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Job ID: {job.id}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Submitted: {job.submitted ? new Date(job.submitted).toLocaleString() : '—'}
                      </Typography>
                      {isStaff && (
                        <>
                          <Typography variant="body2" color="text.secondary">
                            {job.username && `User: ${job.username}`}
                            {job.institute && ` · ${job.institute}`}
                          </Typography>
                          {job.email && (
                            <Typography variant="body2" color="text.secondary">
                              {job.email}
                            </Typography>
                          )}
                        </>
                      )}
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={job.state ?? '—'}
                        size="small"
                        color="default"
                        variant="outlined"
                      />
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

          {/* Pagination */}
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={2}
            alignItems="center"
            justifyContent="space-between"
            flexWrap="wrap"
            useFlexGap
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="body2" color="text.secondary">
                {totalCount} job{totalCount !== 1 ? 's' : ''}
              </Typography>
              <FormControl size="small" sx={{ minWidth: 90 }}>
                <InputLabel>Per page</InputLabel>
                <Select
                  value={String(pageSize)}
                  label="Per page"
                  onChange={handlePageSizeChange}
                >
                  {PAGE_SIZE_OPTIONS.map((n) => (
                    <MenuItem key={n} value={String(n)}>
                      {n}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
            <Pagination
              count={totalPages}
              page={pageSafe}
              onChange={handlePageChange}
              showFirstButton
              showLastButton
              color="primary"
            />
          </Stack>
        </>
      )}
    </Box>
  );
}
