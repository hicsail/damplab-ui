import React from 'react';
import { useQuery } from '@apollo/client';
import { Box, Card, CardContent, CircularProgress, Divider, List, ListItem, ListItemText, Typography } from '@mui/material';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';

import { ACTIVITY_EVENTS, GET_LAB_MONITOR_NODES } from '../gql/queries';
import { isRecentIso } from '../utils/time';

type WorkflowNodeState = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETE';

interface LabMonitorNode {
  _id: string;
  label?: string;
  startedAt?: string | null;
  assigneeDisplayName?: string | null;
  service?: { name: string } | null;
  workflow?: { id: string; job?: { id: string; name: string; submitted?: string } | null } | null;
}

interface GetLabMonitorNodesResponse {
  getLabMonitorNodes: LabMonitorNode[];
}

interface ActivityEvent {
  id: string;
  createdAt: string;
  type: string;
  message: string;
  actorDisplayName?: string | null;
  jobId?: string | null;
  workflowId?: string | null;
  workflowNodeId?: string | null;
  serviceName?: string | null;
}

interface ActivityEventsResponse {
  activityEvents: ActivityEvent[];
}

function elapsedMinutes(startedAt: string | null | undefined): number | null {
  if (!startedAt) return null;
  const start = new Date(startedAt).getTime();
  return Number.isFinite(start) ? Math.floor((Date.now() - start) / 60000) : null;
}

function useClockTick(ms: number) {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => {
    const id = setInterval(force, ms);
    return () => clearInterval(id);
  }, [ms]);
}

export default function LabStatusTV() {
  useClockTick(1000);

  const running = useQuery<GetLabMonitorNodesResponse>(GET_LAB_MONITOR_NODES, {
    variables: { nodeState: 'IN_PROGRESS' as WorkflowNodeState },
    pollInterval: 15000,
    fetchPolicy: 'network-only',
  });

  const events = useQuery<ActivityEventsResponse>(ACTIVITY_EVENTS, {
    variables: { limit: 50 },
    pollInterval: 15000,
    fetchPolicy: 'network-only',
  });

  const runningItems = React.useMemo(() => {
    const nodes = running.data?.getLabMonitorNodes ?? [];
    const sorted = [...nodes].sort((a, b) => {
      const aSub = a.workflow?.job?.submitted ? new Date(a.workflow.job.submitted).getTime() : 0;
      const bSub = b.workflow?.job?.submitted ? new Date(b.workflow.job.submitted).getTime() : 0;
      return bSub - aSub;
    });
    return sorted.map((n) => ({
      id: n._id,
      serviceName: n.label?.trim() || n.service?.name || 'Service',
      jobName: n.workflow?.job?.name ?? undefined,
      assignee: n.assigneeDisplayName ?? undefined,
      startedAt: n.startedAt ?? undefined,
    }));
  }, [running.data?.getLabMonitorNodes]);

  const activityItems = React.useMemo(() => {
    const list = events.data?.activityEvents ?? [];
    return [...list].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [events.data?.activityEvents]);

  const nowTime = new Date().toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const nowDate = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <Box
      sx={{
        minHeight: '100vh',
        backgroundColor: '#05070b',
        color: '#f9fafb',
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <GraphicEqIcon sx={{ color: '#ef4444', fontSize: 30 }} />
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: 1 }}>
              DAMPlab — Live Status
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'rgba(249,250,251,0.72)', fontWeight: 600 }}>
              Running services + latest activity
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'rgba(249,250,251,0.72)' }}>
          <AccessTimeIcon sx={{ fontSize: 20 }} />
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {nowTime}
          </Typography>
          <Typography variant="body2">{nowDate}</Typography>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 2, flex: 1, minHeight: 0 }}>
        <Card
          variant="outlined"
          sx={{
            flex: 1.15,
            minWidth: 0,
            minHeight: 0,
            borderRadius: 3,
            borderColor: 'rgba(148,163,184,0.25)',
            background: 'linear-gradient(180deg, rgba(15,23,42,0.7), rgba(2,6,23,0.85))',
          }}
        >
          <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#f9fafb' }}>
                Running
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(249,250,251,0.65)', fontWeight: 600 }}>
                Auto-refresh • {runningItems.length} service{runningItems.length !== 1 ? 's' : ''}
              </Typography>
            </Box>
            <Divider sx={{ borderColor: 'rgba(148,163,184,0.18)' }} />

            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              {running.loading && runningItems.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress size={28} sx={{ color: '#ef4444' }} />
                </Box>
              ) : runningItems.length === 0 ? (
                <Typography sx={{ color: 'rgba(249,250,251,0.65)', mt: 2 }}>
                  No running services.
                </Typography>
              ) : (
                <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {runningItems.map((item) => {
                    const elapsed = elapsedMinutes(item.startedAt);
                    return (
                      <ListItem
                        key={item.id}
                        sx={{
                          px: 2,
                          py: 1.5,
                          borderRadius: 2,
                          border: '1px solid rgba(239,68,68,0.25)',
                          backgroundColor: 'rgba(239,68,68,0.06)',
                        }}
                      >
                        <ListItemText
                          sx={{
                            m: 0,
                            '& .MuiListItemText-primary': { color: '#f9fafb' },
                            '& .MuiListItemText-secondary': { color: 'rgba(249,250,251,0.72)' },
                          }}
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                              <Typography sx={{ fontWeight: 900, letterSpacing: 0.3, color: '#f9fafb' }}>
                                {item.serviceName}
                              </Typography>
                              <Typography sx={{ fontWeight: 900, color: '#ef4444' }}>
                                {elapsed != null ? `${elapsed}m` : '—'}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 0.5 }}>
                              <Typography variant="body2" sx={{ color: 'rgba(249,250,251,0.7)' }}>
                                {item.jobName ? `Job: ${item.jobName}` : 'Job: —'}
                              </Typography>
                              <Typography variant="body2" sx={{ color: 'rgba(249,250,251,0.7)', fontWeight: 700 }}>
                                {item.assignee ? `Assignee: ${item.assignee}` : 'Assignee: —'}
                              </Typography>
                            </Box>
                          }
                          secondaryTypographyProps={{ component: 'div' }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Box>
          </CardContent>
        </Card>

        <Card
          variant="outlined"
          sx={{
            flex: 0.85,
            minWidth: 360,
            minHeight: 0,
            borderRadius: 3,
            borderColor: 'rgba(148,163,184,0.25)',
            background: 'linear-gradient(180deg, rgba(2,6,23,0.9), rgba(15,23,42,0.6))',
          }}
        >
          <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 2 }}>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#f9fafb' }}>
                Activity
              </Typography>
              <Typography variant="body2" sx={{ color: 'rgba(249,250,251,0.65)', fontWeight: 600 }}>
                New items highlighted for 5 minutes
              </Typography>
            </Box>
            <Divider sx={{ borderColor: 'rgba(148,163,184,0.18)' }} />

            <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
              {events.loading && activityItems.length === 0 ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                  <CircularProgress size={28} sx={{ color: '#38bdf8' }} />
                </Box>
              ) : activityItems.length === 0 ? (
                <Typography sx={{ color: 'rgba(249,250,251,0.65)', mt: 2 }}>
                  No recent activity.
                </Typography>
              ) : (
                <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {activityItems.map((ev) => {
                    const recent = isRecentIso(ev.createdAt, 5 * 60 * 1000);
                    const time = new Date(ev.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
                    return (
                      <ListItem
                        key={ev.id}
                        sx={{
                          px: 2,
                          py: 1.25,
                          borderRadius: 2,
                          border: recent ? '1px solid rgba(56,189,248,0.55)' : '1px solid rgba(148,163,184,0.20)',
                          backgroundColor: recent ? 'rgba(56,189,248,0.10)' : 'rgba(148,163,184,0.06)',
                          boxShadow: recent ? '0 0 0 1px rgba(56,189,248,0.20) inset' : 'none',
                        }}
                      >
                        <ListItemText
                          sx={{
                            m: 0,
                            '& .MuiListItemText-primary': { color: '#f9fafb' },
                            '& .MuiListItemText-secondary': { color: 'rgba(249,250,251,0.72)' },
                          }}
                          primary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                              <Typography sx={{ fontWeight: recent ? 900 : 800, color: '#f9fafb' }}>
                                {ev.message}
                              </Typography>
                              <Typography sx={{ color: 'rgba(249,250,251,0.65)', fontWeight: 800 }}>
                                {time}
                              </Typography>
                            </Box>
                          }
                          secondary={
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mt: 0.5 }}>
                              <Typography variant="caption" sx={{ color: 'rgba(249,250,251,0.6)' }}>
                                {ev.actorDisplayName ? `By ${ev.actorDisplayName}` : ev.type}
                              </Typography>
                              <Typography variant="caption" sx={{ color: 'rgba(249,250,251,0.6)' }}>
                                {recent ? 'NEW' : ''}
                              </Typography>
                            </Box>
                          }
                          secondaryTypographyProps={{ component: 'div' }}
                        />
                      </ListItem>
                    );
                  })}
                </List>
              )}
            </Box>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, color: 'rgba(249,250,251,0.55)' }}>
        <Typography variant="caption">
          Running services refresh every 15s • Activity refresh every 15s
        </Typography>
        {(running.error || events.error) && (
          <Typography variant="caption" sx={{ color: '#fca5a5', fontWeight: 700 }}>
            Some data failed to load.
          </Typography>
        )}
      </Box>
    </Box>
  );
}

