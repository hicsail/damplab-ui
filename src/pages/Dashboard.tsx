import React, { useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useMutation, useQuery } from '@apollo/client';
import {
  Box,
  Button,
  Alert,
  Stack,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Snackbar,
  Tooltip,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import RefreshIcon from '@mui/icons-material/Refresh';
import SubmittedJobsList, {
  type ArchiveFilter,
  type JobFilterOption,
  type JobListItem,
  type JobScope,
  STATE_OPTIONS,
} from '../components/SubmittedJobsList';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { GET_LAB_MONITOR_STAFF_LIST, JOB_CLIENTS, JOBS_FEED_STATUS, JOBS_FOR_VIEWER } from '../gql/queries';
import { ARCHIVE_JOB, MARK_JOBS_FEED_VIEWED, UNARCHIVE_JOB } from '../gql/mutations';
import { PERMISSIONS, usePermissions } from '../hooks/usePermissions';
import { formatSaveError } from '../utils/gqlError';

/**
 * States where lab work is genuinely under way, so archiving is worth a warning.
 * Admins can still proceed — this only makes sure it isn't done by accident.
 */
const ACTIVE_WORK_STATES = new Set(['IN_PROGRESS', 'QUEUED', 'ACCEPTED', 'WAITING_FOR_SOW']);

/**
 * The jobs page — one page for what `/my_jobs` and `/dashboard` used to split.
 *
 * The two rendered the same component and differed only in props and in which
 * query they ran, so merging them is mostly deletion. What makes it safe is that
 * scope is enforced by the server (`jobsForViewer`) rather than by the route: this
 * page now sits in the baseline tier and a client reaching it gets their own jobs.
 */
export default function Dashboard() {
  const [markJobsFeedViewed] = useMutation(MARK_JOBS_FEED_VIEWED);
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canViewAllJobs = can(PERMISSIONS.JobsViewAll);
  const canArchive = can(PERMISSIONS.LabMonitorArchive);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(20);
  const [searchInput, setSearchInput] = React.useState('');
  const [stateFilter, setStateFilter] = React.useState<string>(STATE_OPTIONS[0]);
  const [hasSowFilter, setHasSowFilter] = React.useState<'all' | 'yes' | 'no'>('all');
  const [archiveFilter, setArchiveFilter] = React.useState<ArchiveFilter>('ACTIVE');
  // Closed-out jobs are hidden by default. Separate from archiveFilter, which is
  // about a job being shelved rather than finished, and from COMPLETE, which stays
  // visible because a job's lab work ending is not the job being done with.
  const [includeClosed, setIncludeClosed] = React.useState(false);
  // Default scope: everything for someone who can see everything, otherwise their
  // own. The server would force the latter anyway; this keeps the control honest.
  const [scope, setScope] = React.useState<JobScope>(canViewAllJobs ? 'ALL' : 'CREATED_BY_ME');
  const [createdByClient, setCreatedByClient] = React.useState('');
  const [assigneeId, setAssigneeId] = React.useState('');
  const [lastViewedAt, setLastViewedAt] = React.useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = React.useState<JobListItem | null>(null);
  const [archiveBusy, setArchiveBusy] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);
  const [archiveError, setArchiveError] = React.useState<string | null>(null);

  const search = useDebouncedValue(searchInput, 300);

  const input = useMemo(() => {
    const inp: Record<string, unknown> = {
      page,
      limit,
      sortBy: 'SUBMITTED',
      sortOrder: 'DESC',
      archiveFilter,
      scope,
      includeClosed,
    };
    if (search.trim()) inp.search = search.trim();
    if (stateFilter) inp.state = stateFilter;
    if (hasSowFilter !== 'all') inp.hasSow = hasSowFilter === 'yes';
    if (createdByClient) inp.createdByClient = createdByClient;
    if (assigneeId) inp.assigneeId = assigneeId;
    return inp;
  }, [page, limit, search, stateFilter, hasSowFilter, archiveFilter, includeClosed, scope, createdByClient, assigneeId]);

  const { data, loading, error, refetch } = useQuery(JOBS_FOR_VIEWER, {
    variables: { input },
  });

  // Filter sources. Both are jobs:view-all queries, so skipped for a client —
  // asking would 403 and put a red error on a page that is otherwise fine.
  const { data: clientsData } = useQuery(JOB_CLIENTS, { skip: !canViewAllJobs });
  const { data: staffData } = useQuery(GET_LAB_MONITOR_STAFF_LIST, { skip: !canViewAllJobs });
  const clientOptions: JobFilterOption[] = useMemo(
    () => (clientsData?.jobClients ?? []).map((c: any) => ({ id: String(c.clientKey), displayName: String(c.displayName) })),
    [clientsData],
  );
  const technicianOptions: JobFilterOption[] = useMemo(
    () => (staffData?.getLabMonitorStaffList ?? []).map((m: any) => ({ id: String(m.id), displayName: String(m.displayName) })),
    [staffData],
  );
  const [archiveJob] = useMutation(ARCHIVE_JOB);
  const [unarchiveJob] = useMutation(UNARCHIVE_JOB);
  // The unseen-jobs badge is a jobs:view-all concept — there is no shared feed for
  // one client's own jobs — and `markJobsFeedViewed` requires that permission too.
  const { data: feedStatusData } = useQuery(JOBS_FEED_STATUS, {
    fetchPolicy: 'network-only',
    skip: !canViewAllJobs,
  });

  React.useEffect(() => {
    if (!feedStatusData) {
      return;
    }
    setLastViewedAt(feedStatusData.jobsFeedStatus?.viewedAt ?? null);
    markJobsFeedViewed().catch(() => {
      // Keep dashboard functional even if feed state update fails.
    });
  }, [feedStatusData, markJobsFeedViewed]);

  const result = data?.jobsForViewer;
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
      isArchived: Boolean(j.isArchived),
      archivedAt: j.archivedAt != null ? String(j.archivedAt) : undefined,
      archivedBy: j.archivedBy != null ? String(j.archivedBy) : undefined,
      archivedFromState: j.archivedFromState != null ? String(j.archivedFromState) : undefined,
      sow: j.sow
        ? {
            id: String((j.sow as Record<string, unknown>).id ?? ''),
            sowNumber: String((j.sow as Record<string, unknown>).sowNumber ?? ''),
            sowTitle: (j.sow as Record<string, unknown>).sowTitle != null
              ? String((j.sow as Record<string, unknown>).sowTitle)
              : undefined,
            status: String((j.sow as Record<string, unknown>).status ?? ''),
          }
        : null,
    }));
  }, [result?.items]);
  const totalCount = result?.totalCount ?? 0;

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handleLimitChange = useCallback((l: number) => {
    setLimit(l);
    setPage(1);
  }, []);
  const isJobNew = useCallback(
    (job: JobListItem) => {
      if (!job.submitted) return false;
      if (!lastViewedAt) return true;
      return new Date(job.submitted).getTime() > new Date(lastViewedAt).getTime();
    },
    [lastViewedAt]
  );

  const handleArchiveFilterChange = useCallback((v: ArchiveFilter) => {
    setArchiveFilter(v);
    setPage(1);
  }, []);

  // Restoring is harmless, so it applies straight away. Archiving always asks,
  // and the dialog escalates its wording when work is under way.
  const handleArchiveToggle = useCallback(
    async (job: JobListItem) => {
      setArchiveError(null);
      if (job.isArchived) {
        try {
          await unarchiveJob({ variables: { jobId: job.id } });
          await refetch();
          setToast(`Restored "${job.name}".`);
        } catch (e) {
          setArchiveError(formatSaveError(e, 'this restore'));
        }
        return;
      }
      setArchiveTarget(job);
    },
    [unarchiveJob, refetch]
  );

  const confirmArchive = useCallback(async () => {
    if (!archiveTarget) return;
    setArchiveBusy(true);
    setArchiveError(null);
    try {
      await archiveJob({ variables: { jobId: archiveTarget.id } });
      await refetch();
      setToast(`Archived "${archiveTarget.name}".`);
      setArchiveTarget(null);
    } catch (e) {
      setArchiveError(formatSaveError(e, 'this archive'));
    } finally {
      setArchiveBusy(false);
    }
  }, [archiveTarget, archiveJob, refetch]);

  const targetIsActiveWork = archiveTarget ? ACTIVE_WORK_STATES.has(archiveTarget.state) : false;

  const content = error ? (
    <Alert severity="error">
      Failed to load submitted jobs. Please try again later.
    </Alert>
  ) : (
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
      // `/technician_view/:id` moved to the jobs:view-all tier in the same change
      // (matrix amendment Q8) precisely so this link is reachable by everyone who
      // reaches this page. A client goes to their own tracking view instead.
      getJobLink={(j) => (canViewAllJobs ? `/technician_view/${j.id}` : `/client_view/${j.id}`)}
      canViewAllJobs={canViewAllJobs}
      canArchive={canArchive}
      title="Jobs"
      subtitle={canViewAllJobs ? 'Every submitted job. Click a job to open the technician view.' : 'Jobs you have submitted. Click a job to view its status, SOW, and comments.'}
      emptyMessage={canViewAllJobs ? 'No submitted jobs yet.' : 'You have not submitted any jobs yet. Design a workflow on the Canvas and submit it from Checkout.'}
      onBack={() => navigate('/')}
      backLabel="Back to Home"
      isJobNew={isJobNew}
      onArchiveToggle={handleArchiveToggle}
      archiveFilter={archiveFilter}
      onArchiveFilterChange={handleArchiveFilterChange}
      includeClosed={includeClosed}
      onIncludeClosedChange={(value) => {
        setIncludeClosed(value);
        setPage(1);
      }}
      scope={scope}
      onScopeChange={(value) => {
        setScope(value);
        setPage(1);
      }}
      clientOptions={clientOptions}
      createdByClient={createdByClient}
      onCreatedByClientChange={(value) => {
        setCreatedByClient(value);
        setPage(1);
      }}
      technicianOptions={technicianOptions}
      assigneeId={assigneeId}
      onAssigneeIdChange={(value) => {
        setAssigneeId(value);
        setPage(1);
      }}
    />
  );

  return (
    <Box sx={{ p: 3 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'stretch', sm: 'center' }}
        spacing={2}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
            Back to Home
          </Button>
          {/* In the left slot on purpose. The staff shortcut stack on the right is
              `display: none` for a client, and a client watching for their job to
              change state is exactly who needs this most. */}
          <Tooltip title="Refresh jobs">
            <span>
              <IconButton onClick={() => void refetch()} disabled={loading} aria-label="Refresh jobs">
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Stack>
        {/* Shortcuts to staff destinations. Hidden for a client, who would only
            be bounced by those routes' own layouts. */}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ display: canViewAllJobs ? 'flex' : 'none' }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/lab-monitor/north')}
            sx={{ textTransform: 'none' }}
          >
            Lab Monitor North
          </Button>
          <Button
            variant="contained"
            color="primary"
            onClick={() => navigate('/lab-monitor/south')}
            sx={{ textTransform: 'none' }}
          >
            Lab Monitor South
          </Button>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate('/customer-management')}
            sx={{ textTransform: 'none' }}
          >
            User Management
          </Button>
        </Stack>
      </Stack>
      {content}

      <Dialog open={!!archiveTarget} onClose={() => (archiveBusy ? null : setArchiveTarget(null))} fullWidth maxWidth="sm">
        <DialogTitle>Archive this job?</DialogTitle>
        <DialogContent>
          <DialogContentText component="div">
            <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
              {archiveTarget?.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Current status: {archiveTarget?.state?.replace('_', ' ') || '—'}
            </Typography>
          </DialogContentText>

          {targetIsActiveWork && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              This job is still <strong>{archiveTarget?.state?.replace('_', ' ')}</strong> — work has not
              finished. Archiving removes it from the jobs dashboard and the lab monitor boards, so
              technicians will no longer see it. You can archive it anyway if that's what you intend.
            </Alert>
          )}

          <Typography variant="body2" color="text.secondary">
            Nothing is deleted. The job keeps its status, SOW and invoices, and you can restore it at any
            time from the <strong>Archived</strong> filter.
          </Typography>

          {archiveError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {archiveError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setArchiveTarget(null)} disabled={archiveBusy}>
            Cancel
          </Button>
          <Button
            onClick={confirmArchive}
            variant="contained"
            color={targetIsActiveWork ? 'warning' : 'primary'}
            disabled={archiveBusy}
          >
            {archiveBusy ? 'Archiving…' : targetIsActiveWork ? 'Archive anyway' : 'Archive job'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      />
      {archiveError && !archiveTarget && (
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setArchiveError(null)}>
          {archiveError}
        </Alert>
      )}
    </Box>
  );
}
