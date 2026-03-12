import React from 'react';
import { useParams, Navigate } from 'react-router';
import { useQuery, useMutation } from '@apollo/client';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  InputAdornment,
  TextField,
} from '@mui/material';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import GraphicEqIcon from '@mui/icons-material/GraphicEq';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { GET_LAB_MONITOR_OPERATIONS, GET_LAB_MONITOR_NODES, GET_LAB_MONITOR_STAFF_LIST, GET_WORKFLOWS_FOR_LAB_MONITOR, GET_WORKFLOWS_FOR_DOMINOS } from '../gql/queries';
import { MUTATE_NODE_STATUS, UPDATE_WORKFLOW_NODE_ASSIGNEE, UPDATE_WORKFLOW_NODE_ESTIMATED_TIME } from '../gql/mutations';

type WorkflowState = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETE';
type WorkflowNodeState = 'QUEUED' | 'IN_PROGRESS' | 'COMPLETE';

/** One card on the lab monitor: a single service (node) in an approved-job workflow. */
export interface LabMonitorItem {
  id: string;
  /** When from node-based API, this is the workflow node _id for mutations and drag. */
  nodeId?: string;
  serviceName: string;
  jobName?: string;
  workflowId: string;
  jobSubmitted?: string;
  assigneeId?: string | null;
  assigneeDisplayName?: string | null;
  estimatedMinutes?: number | null;
  startedAt?: string | null;
}

export interface LabMonitorStaffMember {
  id: string;
  displayName: string;
}

interface WorkflowWithNodes {
  id: string;
  state: WorkflowState;
  job?: { id: string; name: string; submitted?: string } | null;
  nodes?: Array<{
    _id: string;
    id: string;
    label?: string;
    state: string;
    assigneeId?: string | null;
    assigneeDisplayName?: string | null;
    estimatedMinutes?: number | null;
    startedAt?: string | null;
    service?: { name: string } | null;
  }> | null;
}

interface WorkflowBasic {
  id: string;
  name: string;
  state: WorkflowState;
  job?: { id: string; name: string; submitted?: string } | null;
}

interface LabMonitorOpsResponse {
  getWorkflowsByStateForLabMonitor: WorkflowWithNodes[];
}

interface WorkflowsResponse {
  getWorkflowByState: WorkflowBasic[];
}

const COLORS = {
  pending: { main: '#6b7280', border: '#e5e7eb' },
  running: { main: '#dc2626', border: '#dc2626' },
  completed: { main: '#16a34a', border: '#16a34a' },
} as const;

function flattenToItems(workflows: WorkflowWithNodes[]): LabMonitorItem[] {
  const list: LabMonitorItem[] = [];
  const sorted = [...workflows].sort((a, b) => {
    const aSub = a.job?.submitted ? new Date(a.job.submitted).getTime() : 0;
    const bSub = b.job?.submitted ? new Date(b.job.submitted).getTime() : 0;
    return bSub - aSub;
  });
  for (const wf of sorted) {
    const jobName = wf.job?.name;
    const jobSubmitted = wf.job?.submitted;
    const nodes = wf.nodes ?? [];
    if (nodes.length === 0) {
      list.push({
        id: wf.id,
        serviceName: 'Workflow',
        jobName,
        workflowId: wf.id,
        jobSubmitted,
      });
    } else {
      for (const node of nodes) {
        const serviceName = node.label?.trim() || node.service?.name || 'Service';
        list.push({
          id: `${wf.id}-${node._id}`,
          nodeId: node._id,
          serviceName,
          jobName,
          workflowId: wf.id,
          jobSubmitted,
          assigneeId: node.assigneeId ?? undefined,
          assigneeDisplayName: node.assigneeDisplayName ?? undefined,
          estimatedMinutes: node.estimatedMinutes ?? undefined,
          startedAt: node.startedAt ?? undefined,
        });
      }
    }
  }
  return list;
}

function fallbackToItems(workflows: WorkflowBasic[]): LabMonitorItem[] {
  const sorted = [...workflows].sort((a, b) => {
    const aSub = a.job?.submitted ? new Date(a.job.submitted).getTime() : 0;
    const bSub = b.job?.submitted ? new Date(b.job.submitted).getTime() : 0;
    return bSub - aSub;
  });
  return sorted.map((wf) => ({
    id: wf.id,
    serviceName: wf.name || 'Workflow',
    jobName: wf.job?.name,
    workflowId: wf.id,
    jobSubmitted: wf.job?.submitted,
  }));
}

interface LabMonitorNode {
  _id: string;
  id: string;
  label?: string;
  state: WorkflowNodeState;
  assigneeId?: string | null;
  assigneeDisplayName?: string | null;
  estimatedMinutes?: number | null;
  startedAt?: string | null;
  service?: { name: string } | null;
  workflow?: { id: string; job?: { id: string; name: string; submitted?: string } | null } | null;
}

interface GetLabMonitorNodesResponse {
  getLabMonitorNodes: LabMonitorNode[];
}

interface GetLabMonitorStaffListResponse {
  getLabMonitorStaffList: LabMonitorStaffMember[];
}

function nodesToItems(nodes: LabMonitorNode[]): LabMonitorItem[] {
  const sorted = [...nodes].sort((a, b) => {
    const aSub = a.workflow?.job?.submitted ? new Date(a.workflow.job.submitted).getTime() : 0;
    const bSub = b.workflow?.job?.submitted ? new Date(b.workflow.job.submitted).getTime() : 0;
    return bSub - aSub;
  });
  return sorted.map((node) => ({
    id: node._id,
    nodeId: node._id,
    serviceName: node.label?.trim() || node.service?.name || 'Service',
    jobName: node.workflow?.job?.name,
    workflowId: node.workflow?.id ?? '',
    jobSubmitted: node.workflow?.job?.submitted,
    assigneeId: node.assigneeId ?? undefined,
    assigneeDisplayName: node.assigneeDisplayName ?? undefined,
    estimatedMinutes: node.estimatedMinutes ?? undefined,
    startedAt: node.startedAt ?? undefined,
  }));
}

function useLabMonitorNodes(nodeState: WorkflowNodeState) {
  const { data, loading, error } = useQuery<GetLabMonitorNodesResponse>(GET_LAB_MONITOR_NODES, {
    variables: { nodeState },
    pollInterval: 15000,
  });
  const items = React.useMemo(
    () => (data?.getLabMonitorNodes ? nodesToItems(data.getLabMonitorNodes) : []),
    [data?.getLabMonitorNodes],
  );
  return { items, loading, error };
}

function useLabMonitorStaffList() {
  const { data } = useQuery<GetLabMonitorStaffListResponse>(GET_LAB_MONITOR_STAFF_LIST, {
    pollInterval: 60000,
  });
  return data?.getLabMonitorStaffList ?? [];
}

function useWorkflows(state: WorkflowState) {
  const ops = useQuery<LabMonitorOpsResponse>(GET_LAB_MONITOR_OPERATIONS, {
    variables: { state },
    pollInterval: 15000,
  });
  const withJob = useQuery<WorkflowsResponse>(GET_WORKFLOWS_FOR_LAB_MONITOR, {
    variables: { state },
    pollInterval: 15000,
    skip: !ops.error,
  });
  const dominos = useQuery<WorkflowsResponse>(GET_WORKFLOWS_FOR_DOMINOS, {
    variables: { state },
    pollInterval: 15000,
    skip: !ops.error || withJob.data?.getWorkflowByState != null,
  });

  const items = React.useMemo(() => {
    if (ops.data?.getWorkflowsByStateForLabMonitor != null) {
      return flattenToItems(ops.data.getWorkflowsByStateForLabMonitor);
    }
    if (withJob.data?.getWorkflowByState != null) {
      return fallbackToItems(withJob.data.getWorkflowByState);
    }
    if (dominos.data?.getWorkflowByState != null) {
      return fallbackToItems(dominos.data.getWorkflowByState);
    }
    return [];
  }, [ops.data?.getWorkflowsByStateForLabMonitor, withJob.data?.getWorkflowByState, dominos.data?.getWorkflowByState]);

  const loading = ops.loading || (!!ops.error && withJob.loading) || (!!ops.error && !!withJob.error && dominos.loading);
  const error = ops.error && !withJob.data?.getWorkflowByState && !dominos.data?.getWorkflowByState ? ops.error : undefined;

  return { items, loading, error };
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
  columnState: WorkflowNodeState;
  items: LabMonitorItem[];
  loading: boolean;
  staffList?: LabMonitorStaffMember[];
  onUpdateAssignee?: (nodeId: string, assigneeId: string | null, assigneeDisplayName: string | null) => void;
  onUpdateEstimatedTime?: (nodeId: string, estimatedMinutes: number | null) => void;
}

function elapsedMinutes(startedAt: string | null | undefined): number | null {
  if (!startedAt) return null;
  const start = new Date(startedAt).getTime();
  return Math.floor((Date.now() - start) / 60000);
}

function OperationCard({
  item,
  variant,
  mainColor,
  isRunning,
  isCompleted,
  staffList,
  onUpdateAssignee,
  onUpdateEstimatedTime,
  isDragging,
}: {
  item: LabMonitorItem;
  variant: 'pending' | 'running' | 'completed';
  mainColor: string;
  isRunning: boolean;
  isCompleted: boolean;
  staffList?: LabMonitorStaffMember[];
  onUpdateAssignee?: (nodeId: string, assigneeId: string | null, assigneeDisplayName: string | null) => void;
  onUpdateEstimatedTime?: (nodeId: string, estimatedMinutes: number | null) => void;
  isDragging?: boolean;
}) {
  const nodeId = item.nodeId;
  const canEdit = Boolean(nodeId && (onUpdateAssignee || onUpdateEstimatedTime));
  const [estInput, setEstInput] = React.useState<string>(item.estimatedMinutes != null ? String(item.estimatedMinutes) : '');
  React.useEffect(() => {
    setEstInput(item.estimatedMinutes != null ? String(item.estimatedMinutes) : '');
  }, [item.estimatedMinutes]);
  const elapsed = isRunning ? elapsedMinutes(item.startedAt) : null;

  const handleEstBlur = () => {
    if (!nodeId || !onUpdateEstimatedTime) return;
    const n = parseFloat(estInput);
    onUpdateEstimatedTime(nodeId, Number.isFinite(n) ? n : null);
  };

  return (
    <Card
      variant="outlined"
      sx={{
        borderRadius: 2,
        borderColor: isDragging ? mainColor : '#e5e7eb',
        backgroundColor: '#ffffff',
        boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : '0 1px 3px rgba(0,0,0,0.06)',
        opacity: isDragging ? 0.9 : 1,
      }}
    >
      <CardContent sx={{ p: 2, textAlign: 'left', '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, mb: 1 }}>
          <Box
            sx={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              backgroundColor: mainColor,
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
              {item.workflowId}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#111827' }}>
              {item.serviceName}
            </Typography>
            {item.jobName && (
              <Typography variant="caption" sx={{ display: 'block', color: '#6b7280', mt: 0.5 }}>
                Job: {item.jobName}
              </Typography>
            )}
          </Box>
        </Box>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 1.5,
            mt: 1.5,
            pt: 1,
            borderTop: '1px solid',
            borderColor: '#f3f4f6',
            textAlign: 'left',
          }}
        >
          <Box sx={{ minWidth: 120 }}>
            <Typography variant="caption" sx={{ color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Assignee
            </Typography>
            {canEdit && staffList && onUpdateAssignee && nodeId ? (
              <FormControl size="small" fullWidth sx={{ mt: 0.25 }}>
                <Select
                  value={item.assigneeId ?? ''}
                  displayEmpty
                  onChange={(e) => {
                    const id = e.target.value as string;
                    const member = staffList.find((m) => m.id === id);
                    onUpdateAssignee(nodeId, id || null, member?.displayName ?? null);
                  }}
                  renderValue={(v) => v ? (staffList.find((m) => m.id === v)?.displayName ?? item.assigneeDisplayName ?? '—') : '—'}
                >
                  <MenuItem value="">—</MenuItem>
                  {staffList.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.displayName}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <Typography variant="body2" sx={{ color: '#374151' }}>
                {item.assigneeDisplayName ?? '—'}
              </Typography>
            )}
          </Box>
          <Box sx={{ minWidth: 80 }}>
            <Typography variant="caption" sx={{ color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              EST. TIME
            </Typography>
            {canEdit && onUpdateEstimatedTime && nodeId ? (
              <TextField
                size="small"
                type="number"
                value={estInput}
                onChange={(e) => setEstInput(e.target.value)}
                onBlur={handleEstBlur}
                inputProps={{ min: 0, step: 5 }}
                InputProps={{
                  endAdornment: <InputAdornment position="end">min</InputAdornment>,
                }}
                sx={{ mt: 0.25, width: 100 }}
              />
            ) : (
              <Typography variant="body2" sx={{ color: '#374151' }}>
                {item.estimatedMinutes != null ? `${item.estimatedMinutes} min` : '—'}
              </Typography>
            )}
          </Box>
          {elapsed != null && (
            <Box>
              <Typography variant="caption" sx={{ color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Elapsed
              </Typography>
              <Typography variant="body2" sx={{ color: COLORS.running.main, fontWeight: 500 }}>
                {elapsed}m
              </Typography>
            </Box>
          )}
        </Box>
        {isRunning && !elapsed && (
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
  );
}

function DraggableCard({
  item,
  variant,
  columnState,
  staffList,
  onUpdateAssignee,
  onUpdateEstimatedTime,
}: {
  item: LabMonitorItem;
  variant: 'pending' | 'running' | 'completed';
  columnState: WorkflowNodeState;
  staffList?: LabMonitorStaffMember[];
  onUpdateAssignee?: (nodeId: string, assigneeId: string | null, assigneeDisplayName: string | null) => void;
  onUpdateEstimatedTime?: (nodeId: string, estimatedMinutes: number | null) => void;
}) {
  const id = item.nodeId ?? item.id;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id, data: { item, columnState } });
  const { main } = COLORS[variant];
  const isRunning = variant === 'running';
  const isCompleted = variant === 'completed';

  return (
    <Box ref={setNodeRef} {...listeners} {...attributes} sx={{ cursor: item.nodeId ? 'grab' : 'default' }}>
      <OperationCard
        item={item}
        variant={variant}
        mainColor={main}
        isRunning={isRunning}
        isCompleted={isCompleted}
        staffList={staffList}
        onUpdateAssignee={onUpdateAssignee}
        onUpdateEstimatedTime={onUpdateEstimatedTime}
        isDragging={isDragging}
      />
    </Box>
  );
}

function StatusColumn({
  title,
  variant,
  columnState,
  items,
  loading,
  staffList,
  onUpdateAssignee,
  onUpdateEstimatedTime,
}: ColumnProps) {
  const { main, border } = COLORS[variant];
  const isRunning = variant === 'running';
  const isCompleted = variant === 'completed';

  const { setNodeRef, isOver } = useDroppable({ id: columnState });

  const HeaderIcon =
    variant === 'pending'
      ? InfoOutlinedIcon
      : variant === 'running'
      ? GraphicEqIcon
      : CheckCircleOutlineIcon;

  return (
    <Card
      variant="outlined"
      ref={setNodeRef}
      sx={{
        width: '100%',
        minWidth: 0,
        height: '100%',
        borderRadius: 3,
        borderWidth: isRunning ? 2 : 1,
        borderColor: isOver ? main : border,
        backgroundColor: isOver ? `${main}08` : '#ffffff',
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
            items.map((item) =>
              item.nodeId && onUpdateAssignee != null ? (
                <DraggableCard
                  key={item.id}
                  item={item}
                  variant={variant}
                  columnState={columnState}
                  staffList={staffList}
                  onUpdateAssignee={onUpdateAssignee}
                  onUpdateEstimatedTime={onUpdateEstimatedTime}
                />
              ) : (
                <OperationCard
                  key={item.id}
                  item={item}
                  variant={variant}
                  mainColor={main}
                  isRunning={isRunning}
                  isCompleted={isCompleted}
                  staffList={staffList}
                  onUpdateAssignee={onUpdateAssignee}
                  onUpdateEstimatedTime={onUpdateEstimatedTime}
                />
              ),
            )}
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

const NODE_STATES: WorkflowNodeState[] = ['QUEUED', 'IN_PROGRESS', 'COMPLETE'];

export default function LabMonitor() {
  const { screen } = useParams<{ screen: string }>();
  const { time, date } = useClock();
  const [activeDragItem, setActiveDragItem] = React.useState<LabMonitorItem | null>(null);
  const [activeVariant, setActiveVariant] = React.useState<'pending' | 'running' | 'completed'>('pending');

  const nodeQueued = useLabMonitorNodes('QUEUED');
  const nodeRunning = useLabMonitorNodes('IN_PROGRESS');
  const nodeCompleted = useLabMonitorNodes('COMPLETE');
  const useNodeBased =
    !nodeQueued.error && !nodeRunning.error && !nodeCompleted.error;

  const fallbackQueued = useWorkflows('QUEUED');
  const fallbackRunning = useWorkflows('IN_PROGRESS');
  const fallbackCompleted = useWorkflows('COMPLETE');

  const queued = useNodeBased
    ? { items: nodeQueued.items, loading: nodeQueued.loading, error: nodeQueued.error }
    : fallbackQueued;
  const running = useNodeBased
    ? { items: nodeRunning.items, loading: nodeRunning.loading, error: nodeRunning.error }
    : fallbackRunning;
  const completed = useNodeBased
    ? { items: nodeCompleted.items, loading: nodeCompleted.loading, error: nodeCompleted.error }
    : fallbackCompleted;

  const staffList = useLabMonitorStaffList();

  const [changeNodeState] = useMutation(MUTATE_NODE_STATUS, {
    refetchQueries: [
      { query: GET_LAB_MONITOR_NODES, variables: { nodeState: 'QUEUED' } },
      { query: GET_LAB_MONITOR_NODES, variables: { nodeState: 'IN_PROGRESS' } },
      { query: GET_LAB_MONITOR_NODES, variables: { nodeState: 'COMPLETE' } },
    ],
  });
  const [updateAssignee] = useMutation(UPDATE_WORKFLOW_NODE_ASSIGNEE, {
    refetchQueries: [
      { query: GET_LAB_MONITOR_NODES, variables: { nodeState: 'QUEUED' } },
      { query: GET_LAB_MONITOR_NODES, variables: { nodeState: 'IN_PROGRESS' } },
      { query: GET_LAB_MONITOR_NODES, variables: { nodeState: 'COMPLETE' } },
    ],
  });
  const [updateEstimatedTime] = useMutation(UPDATE_WORKFLOW_NODE_ESTIMATED_TIME, {
    refetchQueries: [
      { query: GET_LAB_MONITOR_NODES, variables: { nodeState: 'QUEUED' } },
      { query: GET_LAB_MONITOR_NODES, variables: { nodeState: 'IN_PROGRESS' } },
      { query: GET_LAB_MONITOR_NODES, variables: { nodeState: 'COMPLETE' } },
    ],
  });

  const handleUpdateAssignee = React.useCallback(
    (nodeId: string, assigneeId: string | null, assigneeDisplayName: string | null) => {
      updateAssignee({
        variables: {
          workflowNode: nodeId,
          assigneeId: assigneeId ?? undefined,
          assigneeDisplayName: assigneeDisplayName ?? undefined,
        },
      }).catch(() => {});
    },
    [updateAssignee],
  );

  const handleUpdateEstimatedTime = React.useCallback(
    (nodeId: string, estimatedMinutes: number | null) => {
      updateEstimatedTime({
        variables: { workflowNode: nodeId, estimatedMinutes: estimatedMinutes ?? undefined },
      }).catch(() => {});
    },
    [updateEstimatedTime],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as { item?: LabMonitorItem; columnState?: WorkflowNodeState } | undefined;
    if (data?.item) setActiveDragItem(data.item);
    const state = data?.columnState;
    if (state === 'QUEUED') setActiveVariant('pending');
    else if (state === 'IN_PROGRESS') setActiveVariant('running');
    else setActiveVariant('completed');
  };

  const handleDragEnd = (e: DragEndEvent) => {
    setActiveDragItem(null);
    const overId = e.over?.id;
    const activeData = e.active.data.current as { item?: LabMonitorItem; columnState?: string } | undefined;
    const item = activeData?.item;
    const sourceState = activeData?.columnState;
    if (!item?.nodeId || typeof overId !== 'string' || !NODE_STATES.includes(overId as WorkflowNodeState)) return;
    if (sourceState === overId) return; // same column, no-op
    changeNodeState({ variables: { _ID: item.nodeId, State: overId as WorkflowNodeState } }).catch(() => {});
  };

  if (!isLabScreen(screen)) {
    return <Navigate to="/lab-monitor/north" replace />;
  }

  const subtitle = screen === 'north' ? 'North Monitor Lab' : 'South Monitor Lab';

  const total =
    queued.items.length +
    running.items.length +
    completed.items.length;

  const anyError = queued.error || running.error || completed.error;

  const columnProps = useNodeBased
    ? {
        staffList,
        onUpdateAssignee: handleUpdateAssignee,
        onUpdateEstimatedTime: handleUpdateEstimatedTime,
      }
    : {};

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
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
            <StatusColumn
              title="Pending"
              variant="pending"
              columnState="QUEUED"
              {...queued}
              {...columnProps}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex' }}>
            <StatusColumn
              title="Running"
              variant="running"
              columnState="IN_PROGRESS"
              {...running}
              {...columnProps}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 0, minHeight: 0, display: 'flex' }}>
            <StatusColumn
              title="Completed"
              variant="completed"
              columnState="COMPLETE"
              {...completed}
              {...columnProps}
            />
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

      <DragOverlay>
        {activeDragItem ? (
          <Box sx={{ width: 320, cursor: 'grabbing' }}>
            <OperationCard
              item={activeDragItem}
              variant={activeVariant}
              mainColor={COLORS[activeVariant].main}
              isRunning={activeVariant === 'running'}
              isCompleted={activeVariant === 'completed'}
            />
          </Box>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

