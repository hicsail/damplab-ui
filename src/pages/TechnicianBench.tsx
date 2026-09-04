import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Link as MuiLink,
  Stack,
  Switch,
  Typography
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ScienceIcon from '@mui/icons-material/Science';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ReplayIcon from '@mui/icons-material/Replay';
import { Link as RouterLink } from 'react-router';
import { GET_ASSIGNED_OPERATIONS } from '../gql/queries';
import { MUTATE_NODE_STATUS, SET_WORKFLOW_NODE_COMPLETED_STEPS } from '../gql/mutations';
import { UserContextProps } from '../contexts/UserContext';
import { useEffectiveUser } from '../hooks/useEffectiveUser';
import ProtocolViewer from '../components/ProtocolViewer';
import { CommentsSection } from '../components/CommentsSection';

type StateName = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETE';
const STATE_NAMES: StateName[] = ['QUEUED', 'IN_PROGRESS', 'COMPLETE'];

/** Node state may arrive as the enum name or its numeric index — normalize to the name. */
function stateName(state: unknown): StateName {
  if (typeof state === 'number' && STATE_NAMES[state]) return STATE_NAMES[state];
  const s = String(state).toUpperCase();
  return (STATE_NAMES.includes(s as StateName) ? s : 'QUEUED') as StateName;
}

const STATE_LABEL: Record<StateName, string> = {
  QUEUED: 'Queued',
  IN_PROGRESS: 'In progress',
  COMPLETE: 'Complete'
};
const STATE_COLOR: Record<StateName, 'default' | 'warning' | 'success'> = {
  QUEUED: 'default',
  IN_PROGRESS: 'warning',
  COMPLETE: 'success'
};
// Show in-progress first, then queued, then complete.
const STATE_SORT: Record<StateName, number> = { IN_PROGRESS: 0, QUEUED: 1, COMPLETE: 2 };

/** Remembers the "next only" choice across visits; the page has no other persisted state. */
const NEXT_ONLY_KEY = 'bench:nextOnly';

function readNextOnlyPreference(): boolean {
  // Defaults to on: the whole point is that an unfiltered bench buries the one
  // operation you can actually start.
  try {
    return localStorage.getItem(NEXT_ONLY_KEY) !== 'false';
  } catch {
    return true;
  }
}

/**
 * The operations to show when "next only" is on: per workflow, the earliest
 * outstanding work that nothing upstream is blocking.
 *
 * `isReadyToStart` is resolved server-side over the whole workflow, because a
 * blocking predecessor is routinely assigned to somebody else and so is absent
 * from this list. An operation from a workflow the server did not answer for
 * (`isReadyToStart` undefined — an older backend, or a node with no workflow) is
 * kept rather than hidden: showing too much is a nuisance, hiding someone's work
 * with no explanation is not.
 */
export function nextOperationsPerWorkflow(operations: any[]): any[] {
  const taken = new Set<string>();
  return operations.filter((op) => {
    if (stateName(op.state) === 'COMPLETE') return false;
    if (op.isReadyToStart === false) return false;
    const key = op.workflowId ?? null;
    if (key == null || op.isReadyToStart == null) return true;
    if (taken.has(key)) return false;
    taken.add(key);
    return true;
  });
}

/** Build a paramId -> display name lookup from a service's parameter definitions. */
function paramNameLookup(parameters: any): Record<string, string> {
  const out: Record<string, string> = {};
  if (Array.isArray(parameters)) {
    for (const p of parameters) {
      if (p && typeof p.id === 'string') out[p.id] = String(p.name ?? p.id);
    }
  }
  return out;
}

/** Format a single formData value (string | string[] | file object) for display. */
function formatValue(value: any): string {
  if (value === null || value === undefined || value === '') return '—';
  if (Array.isArray(value)) return value.map((v) => formatValue(v)).join(', ');
  if (typeof value === 'object') return String(value.filename || value.name || JSON.stringify(value));
  return String(value);
}

export default function TechnicianBench() {
  const userContext = useEffectiveUser() as UserContextProps;
  const email = userContext.userProps?.idTokenParsed?.email ?? '';
  const isStaff = !!userContext.userProps?.isDamplabStaff;

  const { data, loading, error, refetch } = useQuery(GET_ASSIGNED_OPERATIONS, {
    fetchPolicy: 'cache-and-network',
    pollInterval: 20000
  });

  const [changeNodeState] = useMutation(MUTATE_NODE_STATUS);
  const [setCompletedSteps] = useMutation(SET_WORKFLOW_NODE_COMPLETED_STEPS);

  // Optimistic per-node step overrides (nodeId -> stepIds). Falls back to server value.
  const [stepOverrides, setStepOverrides] = useState<Record<string, string[]>>({});

  const [nextOnly, setNextOnly] = useState(readNextOnlyPreference);
  const handleNextOnlyChange = (value: boolean): void => {
    setNextOnly(value);
    try {
      localStorage.setItem(NEXT_ONLY_KEY, String(value));
    } catch {
      // A browser refusing storage is not a reason to refuse the filter.
    }
  };

  const allOperations: any[] = useMemo(() => {
    const ops = Array.isArray(data?.assignedOperations) ? [...data.assignedOperations] : [];
    ops.sort((a, b) => STATE_SORT[stateName(a.state)] - STATE_SORT[stateName(b.state)]);
    return ops;
  }, [data]);

  // Sorted before filtering, so "the next one" in a workflow is the in-progress
  // operation where there is one, and the queued one otherwise.
  const operations = useMemo(() => (nextOnly ? nextOperationsPerWorkflow(allOperations) : allOperations), [allOperations, nextOnly]);
  const hiddenCount = allOperations.length - operations.length;

  const handleStateChange = async (nodeId: string, newState: StateName) => {
    try {
      await changeNodeState({ variables: { _ID: nodeId, State: newState } });
      await refetch();
    } catch (e) {
      // surfaced via the query error boundary on next poll; no-op here
      console.error('Failed to change operation state', e);
    }
  };

  const handleToggleStep = async (nodeId: string, serverSteps: string[], stepId: string, done: boolean) => {
    const current = stepOverrides[nodeId] ?? serverSteps ?? [];
    const next = done ? Array.from(new Set([...current, stepId])) : current.filter((s) => s !== stepId);
    setStepOverrides((prev) => ({ ...prev, [nodeId]: next }));
    try {
      await setCompletedSteps({ variables: { workflowNode: nodeId, completedSteps: next } });
    } catch (e) {
      console.error('Failed to save step progress', e);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
        <ScienceIcon color="primary" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            My Bench
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Operations assigned to you. Open the linked protocol, check off steps, record notes and files, and mark work complete as you go.
          </Typography>
        </Box>
        <FormControlLabel
          control={<Switch size="small" checked={nextOnly} onChange={(e) => handleNextOnlyChange(e.target.checked)} />}
          label={<Typography variant="body2">Next step only</Typography>}
        />
        <Button variant="outlined" size="small" onClick={() => refetch()} sx={{ textTransform: 'none' }}>
          Refresh
        </Button>
      </Stack>

      {loading && !data && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Could not load your assigned operations. Please try again.
        </Alert>
      )}

      {!loading && operations.length === 0 && (
        <Alert severity="info">
          {allOperations.length > 0
            ? 'Nothing on your bench is ready to start — every operation assigned to you is waiting on earlier work, or is already complete. Turn off “Next step only” to see them all.'
            : 'You have no operations assigned to you right now. Operations are assigned from the Lab Monitor.'}
        </Alert>
      )}

      {/* Says what the filter is holding back, so an unexpectedly short bench is
          explained rather than mysterious. */}
      {nextOnly && hiddenCount > 0 && operations.length > 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {hiddenCount} other operation{hiddenCount === 1 ? '' : 's'} hidden — completed work, and steps waiting on earlier ones.
        </Typography>
      )}

      <Stack spacing={1.5}>
        {operations.map((op) => {
          const st = stateName(op.state);
          const service = op.service ?? {};
          const job = op.job ?? {};
          // protocolIds is the admin-specified execution order. Older/cached rows may
          // still only carry the deprecated single protocolId.
          const protocolIds: string[] = Array.isArray(service.protocolIds)
            ? service.protocolIds.filter((p: any) => typeof p === 'string' && p.trim())
            : typeof service.protocolId === 'string' && service.protocolId.trim()
              ? [service.protocolId]
              : [];
          const serverSteps: string[] = Array.isArray(op.completedSteps) ? op.completedSteps : [];
          const effectiveSteps = stepOverrides[op._id] ?? serverSteps;
          const names = paramNameLookup(service.parameters);
          const entries: Array<{ id: string; value: any }> = Array.isArray(op.formData) ? op.formData : [];

          return (
            <Accordion key={op._id} defaultExpanded={st === 'IN_PROGRESS'} disableGutters>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', width: '100%' }}>
                  <Typography sx={{ fontWeight: 600 }}>{op.label || service.name || 'Operation'}</Typography>
                  <Chip size="small" label={STATE_LABEL[st]} color={STATE_COLOR[st]} />
                  {protocolIds.length > 0 && (
                    <Chip
                      size="small"
                      variant="outlined"
                      color="info"
                      label={protocolIds.length === 1 ? 'Protocol linked' : `${protocolIds.length} protocols linked`}
                    />
                  )}
                  <Box sx={{ flex: 1 }} />
                  {job.id && (
                    <Typography variant="caption" color="text.secondary">
                      {job.name || 'Job'}
                      {job.jobId ? ` · #${job.jobId}` : ''}
                    </Typography>
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  {/* Actions */}
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
                    {st === 'QUEUED' && (
                      <Button size="small" variant="contained" startIcon={<PlayArrowIcon />} onClick={() => handleStateChange(op._id, 'IN_PROGRESS')} sx={{ textTransform: 'none' }}>
                        Start
                      </Button>
                    )}
                    {st === 'IN_PROGRESS' && (
                      <Button size="small" variant="contained" color="success" startIcon={<CheckCircleIcon />} onClick={() => handleStateChange(op._id, 'COMPLETE')} sx={{ textTransform: 'none' }}>
                        Mark complete
                      </Button>
                    )}
                    {st === 'COMPLETE' && (
                      <Button size="small" variant="outlined" startIcon={<ReplayIcon />} onClick={() => handleStateChange(op._id, 'IN_PROGRESS')} sx={{ textTransform: 'none' }}>
                        Reopen
                      </Button>
                    )}
                    {job.id && (
                      <Button size="small" variant="text" component={RouterLink} to={`/technician_view/${job.id}`} sx={{ textTransform: 'none' }}>
                        Open full job view
                      </Button>
                    )}
                  </Stack>

                  {/* Parameters */}
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                      Parameters
                    </Typography>
                    {entries.length === 0 ? (
                      <Typography variant="body2" color="text.secondary">No parameters for this operation.</Typography>
                    ) : (
                      <Box component="dl" sx={{ m: 0, display: 'grid', gridTemplateColumns: 'minmax(120px, max-content) 1fr', columnGap: 2, rowGap: 0.5 }}>
                        {entries.map((entry) => (
                          <Box key={entry.id} sx={{ display: 'contents' }}>
                            <Typography component="dt" variant="body2" sx={{ fontWeight: 600, color: 'text.secondary' }}>
                              {names[entry.id] || entry.id}
                            </Typography>
                            <Typography component="dd" variant="body2" sx={{ m: 0, wordBreak: 'break-word' }}>
                              {formatValue(entry.value)}
                            </Typography>
                          </Box>
                        ))}
                      </Box>
                    )}
                    {op.additionalInstructions && (
                      <Typography variant="body2" sx={{ mt: 1, fontStyle: 'italic', color: 'text.secondary' }}>
                        Instructions: {op.additionalInstructions}
                      </Typography>
                    )}
                  </Box>

                  {/* Protocols, rendered in the admin-specified execution order */}
                  {protocolIds.length > 0 ? (
                    <Stack spacing={2}>
                      {protocolIds.map((pid, index) => (
                        <Box key={`${pid}-${index}`}>
                          <Divider sx={{ mb: 1 }} />
                          <Typography variant="overline" color="text.secondary" sx={{ display: 'block' }}>
                            Protocol {index + 1} of {protocolIds.length}
                          </Typography>
                          <ProtocolViewer
                            protocolId={pid}
                            completedStepIds={effectiveSteps}
                            onToggleStep={(stepId, done) => handleToggleStep(op._id, serverSteps, stepId, done)}
                          />
                        </Box>
                      ))}
                    </Stack>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No protocol linked to this service.{' '}
                      {isStaff && <MuiLink component={RouterLink} to={`/edit/services/${service.id}`}>Add one in the service editor.</MuiLink>}
                    </Typography>
                  )}

                  {/* Notes + files (scoped to this operation) */}
                  {job.id && <CommentsSection jobId={job.id} nodeId={op._id} variant="notes" currentUser={{ email, isStaff }} />}
                </Stack>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </Stack>
    </Box>
  );
}
