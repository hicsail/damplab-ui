import React, { useCallback } from 'react';
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
  sow?: { id: string; sowNumber: string; sowTitle?: string; status: string } | null;
  username?: string;
  institute?: string;
  email?: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 25, 50] as const;
export const STATE_OPTIONS = ['', 'SUBMITTED', 'QUEUED', 'IN_PROGRESS', 'COMPLETE'];

export interface SubmittedJobsListProps {
  /** Server-provided items for current page. */
  items: JobListItem[];
  /** Total count from API (for pagination). */
  totalCount: number;
  loading?: boolean;
  page: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  search: string;
  onSearchChange: (value: string) => void;
  stateFilter: string;
  onStateFilterChange: (value: string) => void;
  hasSowFilter: 'all' | 'yes' | 'no';
  onHasSowFilterChange: (value: 'all' | 'yes' | 'no') => void;
  showHasSowFilter?: boolean;
  getJobLink: (job: JobListItem) => string;
  isStaff?: boolean;
  title: string;
  subtitle?: string;
  emptyMessage?: string;
  onBack?: () => void;
  backLabel?: string;
}

export default function SubmittedJobsList({
  items,
  totalCount,
  loading = false,
  page,
  limit,
  onPageChange,
  onLimitChange,
  search,
  onSearchChange,
  stateFilter,
  onStateFilterChange,
  hasSowFilter,
  onHasSowFilterChange,
  showHasSowFilter = false,
  getJobLink,
  isStaff = false,
  title,
  subtitle,
  emptyMessage = 'No jobs found.',
  onBack,
  backLabel = 'Back to Home',
}: SubmittedJobsListProps) {
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const pageSafe = Math.min(Math.max(1, page), totalPages);

  const handlePageChange = useCallback(
    (_: unknown, p: number) => onPageChange(p),
    [onPageChange]
  );
  const handleLimitChange = useCallback(
    (e: { target: { value: string } }) => {
      const v = Number(e.target.value);
      if (PAGE_SIZE_OPTIONS.includes(v as (typeof PAGE_SIZE_OPTIONS)[number])) {
        onLimitChange(v);
        onPageChange(1);
      }
    },
    [onLimitChange, onPageChange]
  );

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onSearchChange(e.target.value);
      onPageChange(1);
    },
    [onSearchChange, onPageChange]
  );

  const handleStateChange = useCallback(
    (e: { target: { value: string } }) => {
      onStateFilterChange(e.target.value);
      onPageChange(1);
    },
    [onStateFilterChange, onPageChange]
  );

  const handleHasSowChange = useCallback(
    (e: { target: { value: string } }) => {
      onHasSowFilterChange(e.target.value as 'all' | 'yes' | 'no');
      onPageChange(1);
    },
    [onHasSowFilterChange, onPageChange]
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
          onChange={handleSearchChange}
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
          <Select value={stateFilter} label="Status" onChange={handleStateChange}>
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
            <Select value={hasSowFilter} label="SOW" onChange={handleHasSowChange}>
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
            {items.map((job) => (
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
                  value={String(limit)}
                  label="Per page"
                  onChange={handleLimitChange}
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
