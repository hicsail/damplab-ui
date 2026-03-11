import React from 'react';
import { useParams, Navigate } from 'react-router';
import { useQuery } from '@apollo/client';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { GET_WORKFLOWS_FOR_LAB_MONITOR, GET_WORKFLOWS_FOR_DOMINOS } from '../gql/queries';

type WorkflowState = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETE';

interface Workflow {
  id: string;
  name: string;
  state: WorkflowState;
  job?: { id: string; name: string; submitted?: string } | null;
}

interface WorkflowsResponse {
  getWorkflowByState: Workflow[];
}

const COLORS = {
  pending: { main: '#6b7280', border: '#e5e7eb' },
  running: { main: '#dc2626', border: '#dc2626' },
  completed: { main: '#16a34a', border: '#16a34a' },
} as const;

function useWorkflows(state: WorkflowState) {
  const withJob = useQuery<WorkflowsResponse>(GET_WORKFLOWS_FOR_LAB_MONITOR, {
    variables: { state },
    pollInterval: 15000,
  });
  const fallback = useQuery<WorkflowsResponse>(GET_WORKFLOWS_FOR_DOMINOS, {
    variables: { state },
    pollInterval: 15000,
    skip: !withJob.error && withJob.data?.getWorkflowByState != null,
  });

  const raw =
    withJob.data?.getWorkflowByState ??
    fallback.data?.getWorkflowByState ??
    [];
  const items = React.useMemo(() => {
    return [...raw].sort((a, b) => {
      const aSub = a.job?.submitted ? new Date(a.job.submitted).getTime() : 0;
      const bSub = b.job?.submitted ? new Date(b.job.submitted).getTime() : 0;
      return bSub - aSub;
    });
  }, [raw]);

  return {
    items,
    loading: withJob.loading || (!!withJob.error && fallback.loading),
    error: withJob.error && !fallback.data?.getWorkflowByState ? withJob.error : undefined,
  };
}

function useClock() {
  const [now, setNow] = React.useState<Date>(() => new Date());

  React.useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return { time, date };
}

interface ColumnProps {
  title: string;
  variant: 'pending' | 'running' | 'completed';
  items: Workflow[];
  loading: boolean;
}

function StatusColumn({ title, variant, items, loading }: ColumnProps) {
  const { main, border } = COLORS[variant];
  const isRunning = variant === 'running';
  const isCompleted = variant === 'completed';

  const HeaderIcon =
    variant === 'pending'
      ? InfoOutlinedIcon
      : variant === 'running'
      ? GraphicEqIcon
      : CheckCircleOutlineIcon;

  return (
    <Card
      variant="outlined"
      sx={{
        width: '100%',
        minWidth: 0,
        height: '100%',
        borderRadius: 3,
        borderWidth: isRunning ? 2 : 1,
        borderColor: border,
        backgroundColor: '#ffffff',
        boxShadow: 'none',
      }}
    >
      <CardContent
        sx={{
          p: 2.5,
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          '&:last-child': { pb: 2.5 },
        }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
            pb: 1.5,
            borderBottom: '1px solid',
            borderColor: '#e5e7eb',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <HeaderIcon sx={{ fontSize: 20, color: main }} />
            <Typography
              variant="subtitle1"
              sx={{
                fontWeight: 700,
                letterSpacing: 0.5,
                textTransform: 'uppercase',
                color: '#374151',
              }}
            >
              {title}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: main }}>
              {items.length}
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.25 }}>
              {[1, 2, 3, 4].map((i) => (
                <Box
                  key={i}
                  sx={{
                    width: 4,
                    height: 4,
                    borderRadius: '50%',
                    backgroundColor: main,
                    opacity: 0.7,
                  }}
                />
              ))}
            </Box>
          </Box>
        </Box>
        <Box sx={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={28} sx={{ color: main }} />
            </Box>
          )}
          {!loading && items.length === 0 && (
            <Typography variant="body2" sx={{ color: '#9ca3af', py: 2 }}>
              No operations in this state.
            </Typography>
          )}
          {!loading &&
            items.map((wf) => (
              <Card
                key={wf.id}
                variant="outlined"
                sx={{
                  borderRadius: 2,
                  borderColor: '#e5e7eb',
                  backgroundColor: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                }}
              >
                <CardContent sx={{ p: 2, textAlign: 'left', '&:last-child': { pb: 2 } }}>
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
                    <Box
                      sx={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        backgroundColor: main,
                        flexShrink: 0,
                        mt: 0.75,
                      }}
                    />
                    <Box sx={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          fontWeight: 600,
                          color: '#6b7280',
                          letterSpacing: 0.5,
                          mb: 0.25,
                        }}
                      >
                        {wf.id}
                      </Typography>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#111827' }}>
                        {wf.name || 'Untitled workflow'}
                      </Typography>
                      {wf.job?.name && (
                        <Typography variant="caption" sx={{ display: 'block', color: '#6b7280', mt: 0.5 }}>
                          Job: {wf.job.name}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mt: 1.5,
                      pt: 1,
                      borderTop: '1px solid',
                      borderColor: '#f3f4f6',
                      textAlign: 'left',
                    }}
                  >
                    <Box>
                      <Typography variant="caption" sx={{ color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        Assignee
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#374151' }}>—</Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" sx={{ color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        EST. TIME
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#374151' }}>—</Typography>
                    </Box>
                  </Box>
                  {isRunning && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        mt: 1,
                        color: COLORS.running.main,
                      }}
                    >
                      <GraphicEqIcon sx={{ fontSize: 16 }} />
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        In progress
                      </Typography>
                    </Box>
                  )}
                  {isCompleted && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.5,
                        mt: 1,
                        color: COLORS.completed.main,
                      }}
                    >
                      <CheckCircleOutlineIcon sx={{ fontSize: 16 }} />
                      <Typography variant="caption" sx={{ fontWeight: 500 }}>
                        Completed
                      </Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            ))}
        </Box>
      </CardContent>
    </Card>
  );
}

const LAB_SCREENS = ['north', 'south'] as const;
type LabScreen = (typeof LAB_SCREENS)[number];

function isLabScreen(s: string | undefined): s is LabScreen {
  return s === 'north' || s === 'south';
}

export default function LabMonitor() {
  const { screen } = useParams<{ screen: string }>();
  const { time, date } = useClock();

  if (!isLabScreen(screen)) {
    return <Navigate to="/lab-monitor/north" replace />;
  }

  const subtitle = screen === 'north' ? 'North Monitor Lab' : 'South Monitor Lab';

  const queued = useWorkflows('QUEUED');
  const running = useWorkflows('IN_PROGRESS');
  const completed = useWorkflows('COMPLETE');

  const total =
    queued.items.length +
    running.items.length +
    completed.items.length;

  const anyError = queued.error || running.error || completed.error;

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#f9fafb',
        color: '#111827',
        display: 'flex',
        flexDirection: 'column',
        p: 2,
        width: '100%',
      }}
    >
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 4,
          pb: 2,
          borderBottom: '1px solid #e5e7eb',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, color: '#374151', letterSpacing: 0.5 }}
          >
            DAMPlab
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <GraphicEqIcon sx={{ color: '#dc2626', fontSize: 28 }} />
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: '#111827',
              }}
            >
              {subtitle}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#6b7280' }}>
          <AccessTimeIcon sx={{ fontSize: 20 }} />
          <Typography variant="body2" sx={{ fontWeight: 500 }}>
            {time}
          </Typography>
          <Typography variant="body2" sx={{ ml: 0.5 }}>
            {date}
          </Typography>
        </Box>
      </Box>

      <Box
        sx={{
          display: 'flex',
          gap: 2,
          flex: 1,
          minHeight: 0,
          width: '100%',
        }}
      >
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex' }}>
          <StatusColumn title="Pending" variant="pending" {...queued} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex' }}>
          <StatusColumn title="Running" variant="running" {...running} />
        </Box>
        <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex' }}>
          <StatusColumn title="Completed" variant="completed" {...completed} />
        </Box>
      </Box>

      <Box
        sx={{
          mt: 3,
          pt: 2,
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 1,
        }}
      >
        <Typography variant="body2" sx={{ color: '#6b7280' }}>
          Last updated: live • Auto-refresh enabled • {total} total operation{total !== 1 ? 's' : ''}
        </Typography>
        {anyError && (
          <Typography variant="body2" sx={{ color: '#dc2626' }}>
            Some data failed to load.
          </Typography>
        )}
      </Box>
    </Box>
  );
}

