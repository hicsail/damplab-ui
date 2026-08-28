import React, { useCallback } from 'react';
import { Link } from 'react-router';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  MenuItem,
  Pagination,
  Select,
  Skeleton,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DescriptionIcon from '@mui/icons-material/Description';
import SearchIcon from '@mui/icons-material/Search';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import ArchiveOutlinedIcon from '@mui/icons-material/ArchiveOutlined';
import UnarchiveOutlinedIcon from '@mui/icons-material/UnarchiveOutlined';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import { sowStatusLabel } from './sow/sowTypes';

export interface JobListItem {
  id: string;
  name: string;
  state: string;
  submitted: string;
  sow?: { id: string; sowNumber: string; sowTitle?: string; status: string } | null;
  username?: string;
  institute?: string;
  email?: string;
  isArchived?: boolean;
  archivedAt?: string;
  archivedBy?: string;
  archivedFromState?: string;
}

const PAGE_SIZE_OPTIONS = [10, 20, 25, 50] as const;
export const STATE_OPTIONS = ['', 'SUBMITTED', 'QUEUED', 'IN_PROGRESS', 'COMPLETE'];
export type ArchiveFilter = 'ACTIVE' | 'ARCHIVED' | 'ALL';
export type JobScope = 'ALL' | 'CREATED_BY_ME' | 'WORKED_BY_ME';
export const SCOPE_LABELS: Record<JobScope, string> = {
  ALL: 'All jobs',
  CREATED_BY_ME: 'Created by me',
  WORKED_BY_ME: 'Worked by me'
};

/** A person the jobs list can be filtered down to. */
export interface JobFilterOption {
  id: string;
  displayName: string;
}
export const ARCHIVE_FILTER_LABELS: Record<ArchiveFilter, string> = {
  ACTIVE: 'Active',
  ARCHIVED: 'Archived',
  ALL: 'All'
};

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
  /**
   * Whether the caller sees everyone's jobs. Re-pointed off the old `isStaff`
   * boolean: this list now serves a client and a technician alike, and "staff" was
   * never the question — `jobs:view-all` is.
   *
   * Controls the submitter columns, the scope toggle and the two people filters.
   */
  canViewAllJobs?: boolean;
  title: string;
  subtitle?: string;
  emptyMessage?: string;
  onBack?: () => void;
  backLabel?: string;
  isJobNew?: (job: JobListItem) => boolean;
  /**
   * Whether the caller may archive. Separate from `canViewAllJobs` because the two
   * are different permissions — `jobs:view-all` and `labmonitor:archive` — and the
   * old `isStaff` flag conflated them.
   */
  canArchive?: boolean;
  /** Supplying this renders the per-job archive/restore action, if canArchive. */
  onArchiveToggle?: (job: JobListItem) => void;
  /** Supplying both renders the Active/Archived/All filter, if canArchive. */
  archiveFilter?: ArchiveFilter;
  onArchiveFilterChange?: (value: ArchiveFilter) => void;

  /** Scope toggle. Rendered only with canViewAllJobs — a client has one scope. */
  scope?: JobScope;
  onScopeChange?: (value: JobScope) => void;
  /** Filter to one submitter. Rendered only with canViewAllJobs. */
  clientOptions?: JobFilterOption[];
  createdBySub?: string;
  onCreatedBySubChange?: (value: string) => void;
  /** Filter to one assignee. Rendered only with canViewAllJobs. */
  technicianOptions?: JobFilterOption[];
  assigneeId?: string;
  onAssigneeIdChange?: (value: string) => void;
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
  canViewAllJobs = false,
  title,
  subtitle,
  emptyMessage = 'No jobs found.',
  onBack,
  backLabel = 'Back to Home',
  isJobNew,
  canArchive = false,
  onArchiveToggle,
  archiveFilter,
  onArchiveFilterChange,
  scope,
  onScopeChange,
  clientOptions,
  createdBySub,
  onCreatedBySubChange,
  technicianOptions,
  assigneeId,
  onAssigneeIdChange,
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
        {/* Scope and the two people filters exist only for a caller who can see
            everyone's jobs. For a client there is one scope — their own — and the
            server enforces it regardless of what this sends. */}
        {canViewAllJobs && scope && onScopeChange && (
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel>Scope</InputLabel>
            <Select value={scope} label="Scope" onChange={(e) => onScopeChange(e.target.value as JobScope)}>
              {(Object.keys(SCOPE_LABELS) as JobScope[]).map((key) => (
                <MenuItem key={key} value={key}>
                  {SCOPE_LABELS[key]}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {canViewAllJobs && clientOptions && onCreatedBySubChange && (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Client</InputLabel>
            <Select value={createdBySub ?? ''} label="Client" onChange={(e) => onCreatedBySubChange(e.target.value)}>
              <MenuItem value="">Any client</MenuItem>
              {clientOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {canViewAllJobs && technicianOptions && onAssigneeIdChange && (
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Technician</InputLabel>
            <Select value={assigneeId ?? ''} label="Technician" onChange={(e) => onAssigneeIdChange(e.target.value)}>
              <MenuItem value="">Any technician</MenuItem>
              {technicianOptions.map((option) => (
                <MenuItem key={option.id} value={option.id}>
                  {option.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
        {canArchive && archiveFilter && onArchiveFilterChange && (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Archive</InputLabel>
            <Select
              value={archiveFilter}
              label="Archive"
              onChange={(e) => onArchiveFilterChange(e.target.value as ArchiveFilter)}
            >
              {(Object.keys(ARCHIVE_FILTER_LABELS) as ArchiveFilter[]).map((k) => (
                <MenuItem key={k} value={k}>
                  {ARCHIVE_FILTER_LABELS[k]}
                </MenuItem>
              ))}
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
                      {canViewAllJobs && (
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
                      {isJobNew?.(job) ? (
                        <Chip
                          icon={<FiberNewIcon sx={{ fontSize: 16 }} />}
                          label="New"
                          size="small"
                          color="error"
                          variant="outlined"
                        />
                      ) : null}
                      {job.isArchived && (
                        <Chip
                          icon={<Inventory2OutlinedIcon sx={{ fontSize: 16 }} />}
                          label="Archived"
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      )}
                      <Chip
                        label={job.state ?? '—'}
                        size="small"
                        color="default"
                        variant="outlined"
                      />
                      {job.sow && (
                        <Chip
                          icon={<DescriptionIcon sx={{ fontSize: 16 }} />}
                          label={`SOW - ${sowStatusLabel(job.sow.status)}`}
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      )}
                      {canArchive && onArchiveToggle && (
                        <Tooltip title={job.isArchived ? 'Restore job' : 'Archive job'}>
                          <IconButton
                            size="small"
                            aria-label={job.isArchived ? `Restore job ${job.name}` : `Archive job ${job.name}`}
                            // The whole Card is a router Link, so suppress navigation.
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              onArchiveToggle(job);
                            }}
                          >
                            {job.isArchived ? (
                              <UnarchiveOutlinedIcon fontSize="small" />
                            ) : (
                              <ArchiveOutlinedIcon fontSize="small" />
                            )}
                          </IconButton>
                        </Tooltip>
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
