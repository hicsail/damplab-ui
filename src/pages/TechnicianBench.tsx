import { useContext, useMemo, useState } from 'react';
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
  Link as MuiLink,
  Stack,
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
import { UserContext, UserContextProps } from '../contexts/UserContext';
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
  const userContext = useContext(UserContext) as UserContextProps;
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

  const operations: any[] = useMemo(() => {
    const ops = Array.isArray(data?.assignedOperations) ? [...data.assignedOperations] : [];
    ops.sort((a, b) => STATE_SORT[stateName(a.state)] - STATE_SORT[stateName(b.state)]);
    return ops;
  }, [data]);

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
          You have no operations assigned to you right now. Operations are assigned from the Lab Monitor.
        </Alert>
      )}

      <Stack spacing={1.5}>
        {operations.map((op) => {
          const st = stateName(op.state);
          const service = op.service ?? {};
          const job = op.job ?? {};
          const protocolId: string | undefined = service.protocolId || undefined;
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
                  {protocolId && <Chip size="small" variant="outlined" label="Protocol linked" color="info" />}
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

                  {/* Protocol */}
                  {protocolId ? (
                    <Box>
                      <Divider sx={{ mb: 1 }} />
                      <ProtocolViewer
                        protocolId={protocolId}
                        completedStepIds={effectiveSteps}
                        onToggleStep={(stepId, done) => handleToggleStep(op._id, serverSteps, stepId, done)}
                      />
                    </Box>
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
