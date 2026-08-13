import { useState, useCallback, useRef, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation } from '@apollo/client';
import ReactFlow, { ReactFlowProvider, Controls, Background, addEdge, FitViewOptions,
                    applyNodeChanges, applyEdgeChanges, NodeChange, EdgeChange, Connection, Panel } from 'reactflow';
import 'reactflow/dist/style.css';
import { Alert, Box, Button, Chip, CircularProgress, Snackbar, TextField, Typography } from '@mui/material';

import { generateFormDataFromParams, createNodeObject } from '../controllers/ReactFlowEvents';
import { addNodesAndEdgesFromBundle, isValidConnection } from '../controllers/GraphHelpers';
import { hydrateJobGraph, buildSaveWorkflowsInput, deriveGhostNodes, deriveGhostEdges } from '../controllers/jobGraphHydration';
import { diffJobGraphs, currentDiffPair, GraphDiff, EMPTY_DIFF, SnapshotWorkflow } from '../utils/jobGraphDiff';
import Sidebar        from '../components/Sidebar';
import CustomDemoNode from '../components/CanvasNode';
import RightSidebar   from '../components/RightSidebar';
import { GET_JOB_BY_ID, GET_OWN_JOB_BY_ID } from '../gql/queries';
import { SAVE_JOB_WORKFLOWS } from '../gql/mutations';
import { AppContext }    from '../contexts/App';
import { CanvasContext } from '../contexts/Canvas';
import { UserContext }   from '../contexts/UserContext';
import { NodeData, NodeParameter } from '../types/CanvasTypes';
import '../styles/sidebar.css';

const nodeTypes = { selectorNode: CustomDemoNode };
const fitViewOptions: FitViewOptions = { padding: 0.2 };

/**
 * Editing a submitted job.
 *
 * Deliberately a separate page from MainFlow rather than a mode on it, for one
 * structural reason: this page supplies its **own** CanvasContext, holding node
 * and edge state locally. Sidebar, RightSidebar, Params and CanvasNode all read
 * the canvas through that context, so they work here untouched — and because the
 * root's 300 ms `canvas:autosave` effect watches only root-level state, editing a
 * job never touches the user's personal canvas draft, in either direction.
 */
export default function JobEditor() {
    const { id } = useParams();
    const navigate = useNavigate();
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
    const { services } = useContext(AppContext);
    const { userProps } = useContext(UserContext);
    const isStaff = Boolean(userProps?.isDamplabStaff);

    // Canvas state, local to this page. See the note above.
    const [nodes, setNodes] = useState<any[]>([]);
    const [edges, setEdges] = useState<any[]>([]);
    const [activeComponentId, setActiveComponentId] = useState('');
    // False until the job has been hydrated onto the canvas, so ghosts (which are
    // derived from "what the baseline had that the canvas does not") cannot fire
    // against an empty canvas.
    const [hydrated, setHydrated] = useState(false);
    const [nodeParams, setNodeParams] = useState<any>([]);

    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);

    const { data, loading, error, refetch } = useQuery(isStaff ? GET_JOB_BY_ID : GET_OWN_JOB_BY_ID, {
        variables: { id },
        fetchPolicy: 'network-only',
        skip: !id
    });
    const job = data?.jobById ?? data?.ownJobById ?? null;

    const [saveJobWorkflows] = useMutation(SAVE_JOB_WORKFLOWS);

    /**
     * The graph to highlight against.
     *
     * The canvas is hydrated from the job's *live* workflows — the user edits
     * current reality — while the baseline comes from the version history. The
     * highlight is baseline → canvas, which covers both cases in one
     * computation: a customer arriving from a feedback link sees the
     * technician's changes on open, and anyone's unsaved edits light up as they
     * work. When nothing earlier was written by the other side the baseline is
     * the latest version itself, so a freshly submitted job starts clean.
     */
    const baselineWorkflows: SnapshotWorkflow[] | undefined = useMemo(() => {
        const versions = job?.versions ?? [];
        if (!versions.length) return undefined;
        return currentDiffPair(versions).baseline?.workflows;
    }, [job]);

    /** The canvas, in the snapshot shape the differ speaks. */
    const canvasSnapshot: SnapshotWorkflow[] = useMemo(
        () => [
            {
                nodes: nodes
                    .filter((n) => !n.data?.ghost)
                    .map((n) => ({
                        id: n.id,
                        label: n.data?.label,
                        serviceId: n.data?.serviceId,
                        additionalInstructions: n.data?.additionalInstructions ?? '',
                        formData: (n.data?.formData ?? []).map((p: any) => ({ id: p.id, name: p.name, value: p.value }))
                    })),
                edges: edges.map((e) => ({ id: e.id, source: e.source, target: e.target }))
            }
        ],
        [nodes, edges]
    );

    const diff: GraphDiff = useMemo(
        () => (baselineWorkflows ? diffJobGraphs(baselineWorkflows, canvasSnapshot) : EMPTY_DIFF),
        [baselineWorkflows, canvasSnapshot]
    );

    /** Rebuild the canvas from the job as last saved. */
    const resetToSavedJob = useCallback(() => {
        if (!job || !services?.length) return;
        const { nodes: hydrated, edges: hydratedEdges } = hydrateJobGraph(job, services);
        setNodes(hydrated);
        setEdges(hydratedEdges);
        setActiveComponentId('');
        setHydrated(true);
    }, [job, services]);

    useEffect(() => {
        resetToSavedJob();
    }, [resetToSavedJob]);

    /**
     * Ghosts are derived, never stored.
     *
     * Storing them meant reading node state to decide what to add to node state,
     * which raced with hydration: on the mount commit `nodes` is still empty, so
     * every baseline node looked deleted and the entire graph rendered as
     * unclickable ghosts. `hydrated` also keeps them from flashing up in the one
     * commit before hydration lands.
     */
    const ghostNodes = useMemo(
        () => (hydrated ? deriveGhostNodes(baselineWorkflows, new Set(nodes.map((n) => n.id)), services ?? []) : []),
        [hydrated, baselineWorkflows, nodes, services]
    );

    /** Fold the diff onto the nodes React Flow renders, so CanvasNode can decorate without knowing about versions. */
    const decoratedNodes = useMemo(() => {
        const live = nodes.map((node) => {
            const kind = diff.byNodeId.get(node.id)?.kind;
            const diffKind = kind === 'added' || kind === 'changed' ? kind : undefined;
            if (node.data?.diffKind === diffKind) return node;
            return { ...node, data: { ...node.data, diffKind } };
        });
        return [...live, ...ghostNodes];
    }, [nodes, diff, ghostNodes]);

    /** Which parameters changed, per node, so the parameter panel can mark them individually. */
    const changedParamIdsByNode = useMemo(() => {
        const byNode = new Map<string, Set<string>>();
        for (const [nodeId, nodeDiff] of diff.byNodeId) {
            if (nodeDiff.paramDiffs.length) byNode.set(nodeId, new Set(nodeDiff.paramDiffs.map((p) => p.id)));
        }
        return byNode;
    }, [diff]);

    const decoratedEdges = useMemo(() => {
        const ghostIds = new Set(ghostNodes.map((n) => n.id));
        const renderable = new Set([...nodes.map((n) => n.id), ...ghostIds]);
        return [...edges, ...deriveGhostEdges(baselineWorkflows, ghostIds, renderable)];
    }, [edges, nodes, ghostNodes, baselineWorkflows]);

    const onNodesChange = useCallback(
        (changes: NodeChange[]) => setNodes((nds: any) => applyNodeChanges(changes, nds)),
        []
    );
    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => setEdges((eds: any) => applyEdgeChanges(changes, eds)),
        []
    );
    const onConnect = useCallback((connection: Connection) => {
        const customConnection: any = connection;
        if (isValidConnection(services, nodes, customConnection.source, customConnection.target)) {
            customConnection.style = { stroke: 'green' };
        }
        setEdges((eds: any) => addEdge(customConnection, eds));
    }, [services, nodes]);

    const onDragOver = useCallback((event: any) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    // Mirrors MainFlow.onDrop; a node added here is indistinguishable from one
    // dropped on the ordinary canvas, which is what lets the diff call it 'added'
    // purely by its absence from the baseline.
    const onDrop = useCallback((event: any) => {
        event.preventDefault();
        const rawType = event.dataTransfer.getData('application/reactflow');
        if (!rawType) return;

        let parsed: any;
        try {
            parsed = JSON.parse(rawType);
        } catch {
            return;
        }
        const isWrapped = parsed && typeof parsed === 'object' && 'itemType' in parsed && 'payload' in parsed;
        const itemType = isWrapped ? parsed.itemType : 'service';
        const type = isWrapped ? parsed.payload : parsed;
        if (!type) return;

        const position = reactFlowInstance.screenToFlowPosition({ x: event.clientX, y: event.clientY });

        if (itemType === 'bundle') {
            addNodesAndEdgesFromBundle(type, services, setNodes, setEdges, position);
            return;
        }

        const nodeId = Math.random().toString(36).substring(2, 9);
        setActiveComponentId(nodeId);
        const formData: NodeParameter[] = generateFormDataFromParams(type.parameters, nodeId);
        const nodeData: NodeData = {
            id: nodeId,
            label: type.name,
            price: type.price,
            internalPrice: type.internalPrice,
            externalPrice: type.externalPrice,
            externalAcademicPrice: type.externalAcademicPrice,
            externalMarketPrice: type.externalMarketPrice,
            externalNoSalaryPrice: type.externalNoSalaryPrice,
            pricing: type.pricing,
            pricingMode: type.pricingMode,
            description: type.description,
            allowedConnections: type.allowedConnections,
            icon: type.icon,
            parameters: type.parameters,
            additionalInstructions: '',
            formData,
            serviceId: type.id,
            paramGroups: type.paramGroups
        };
        setNodes((nds: any) => nds.concat(createNodeObject(nodeId, type.name, type.type, position, nodeData)));
    }, [reactFlowInstance, services]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await saveJobWorkflows({
                variables: { input: { jobId: id, note: note.trim() || undefined, workflows: buildSaveWorkflowsInput(nodes, edges) } }
            });
            setNote('');
            setMessage({ text: 'Changes saved.', severity: 'success' });
            await refetch();
        } catch (err: any) {
            setMessage({ text: err?.message ?? 'Could not save changes.', severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const backToJob = () => navigate(isStaff ? `/technician_view/${id}` : `/client_view/${id}`);

    if (loading) {
        return <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}><CircularProgress /></Box>;
    }
    if (error || !job) {
        return (
            <Box sx={{ p: 4 }}>
                <Alert severity="error">
                    Job not found, or you do not have access to it.
                    {/* Same dev-only detail ClientView shows: without it a failing
                        nested field is indistinguishable from a permissions problem. */}
                    {import.meta.env.DEV && error?.message && (
                        <Box component="span" sx={{ display: 'block', mt: 1, fontSize: 12, color: 'text.secondary' }}>{error.message}</Box>
                    )}
                </Alert>
            </Box>
        );
    }

    const changeCount = diff.added.length + diff.changed.length + diff.removed.length;

    return (
        <CanvasContext value={{ nodes, edges, setNodes, setEdges, activeComponentId, setActiveComponentId, nodeParams, setNodeParams }}>
            <div style={{ height: '100vh' }}>
                <ReactFlowProvider>
                    <div className="reactflow-wrapper" style={{ height: '85vh', display: 'flex' }} ref={reactFlowWrapper}>

                        <div style={{ maxWidth: '15%', textAlign: 'center', minWidth: 250, borderRight: 'solid 1px' }}>
                            <Sidebar />
                        </div>

                        <ReactFlow
                            nodes          = {decoratedNodes}
                            edges          = {decoratedEdges}
                            onNodesChange  = {onNodesChange}
                            onEdgesChange  = {onEdgesChange}
                            onConnect      = {onConnect}
                            onInit         = {setReactFlowInstance}
                            onDrop         = {onDrop}
                            snapGrid       = {[25, 25]}
                            nodeTypes      = {nodeTypes}
                            onDragOver     = {onDragOver}
                            fitView
                            fitViewOptions = {fitViewOptions}
                            style          = {{ width: '70%', height: '100%' }}
                        >
                            <Background />
                            <Controls />

                            {/* The canvas is narrow (both sidebars are fixed-width), so the
                                two panels are kept tight and capped: at full width they
                                overlapped in the middle and hid the job name. */}
                            <Panel position="top-left" style={{ marginLeft: 8, marginTop: 8, maxWidth: 230 }}>
                                <Button variant="contained" size="small" onClick={backToJob}
                                    sx={{ textTransform: 'none', backgroundColor: 'white', color: 'primary.main', '&:hover': { backgroundColor: '#f0f0f0' } }}>
                                    Back to job
                                </Button>
                                <Typography variant="caption" sx={{ display: 'block', mt: 0.5, backgroundColor: 'white', px: 0.75, borderRadius: 1, width: 'fit-content' }}>
                                    Editing <strong>{job.name}</strong>{job.jobId ? ` (#${job.jobId})` : ''}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                                    <Chip size="small" label="New" sx={{ height: 18, fontSize: 10, backgroundColor: '#2e7d32', color: 'white', fontWeight: 700 }} />
                                    <Chip size="small" label="Edited" sx={{ height: 18, fontSize: 10, backgroundColor: '#ed6c02', color: 'white', fontWeight: 700 }} />
                                    <Chip size="small" label="Deleted" sx={{ height: 18, fontSize: 10, backgroundColor: '#757575', color: 'white', fontWeight: 700 }} />
                                    <Chip size="small" label="🔒 Locked" sx={{ height: 18, fontSize: 10, backgroundColor: 'white' }} />
                                </Box>
                            </Panel>

                            <Panel position="top-right" style={{ marginRight: 8, marginTop: 8, maxWidth: 300 }}>
                                {/* The note is optional and describes this save, not the job — it
                                    is shown alongside the diff summary in the job view. */}
                                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', backgroundColor: 'white', p: 0.75, borderRadius: 1, boxShadow: 2 }}>
                                    <TextField
                                        size="small"
                                        placeholder="Note (optional)"
                                        value={note}
                                        onChange={(event) => setNote(event.target.value)}
                                        disabled={saving}
                                        sx={{ width: 170, '& .MuiInputBase-input': { fontSize: 12, py: 0.75 } }}
                                    />
                                    <Button variant="contained" size="small" onClick={handleSave} disabled={saving} sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}>
                                        {saving ? 'Saving…' : 'Save changes'}
                                    </Button>
                                </Box>
                                {changeCount > 0 && (
                                    <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5, backgroundColor: 'white', px: 0.75, borderRadius: 1, width: 'fit-content', ml: 'auto' }}>
                                        {changeCount} node{changeCount === 1 ? '' : 's'} changed
                                    </Typography>
                                )}
                            </Panel>

                            <Panel position="bottom-left" style={{ marginLeft: 8, marginBottom: 8 }}>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    size="small"
                                    onClick={() => {
                                        if (window.confirm('Discard your unsaved edits and return to the job as last saved?')) resetToSavedJob();
                                    }}
                                    sx={{ textTransform: 'none', backgroundColor: 'white' }}
                                >
                                    Revert to saved job
                                </Button>
                            </Panel>
                        </ReactFlow>

                        <div style={{ minWidth: '10%', width: 850, borderLeft: 'solid 1px' }}>
                            <RightSidebar changedParamIdsByNode={changedParamIdsByNode} />
                        </div>

                    </div>
                </ReactFlowProvider>
            </div>

            <Snackbar
                open={!!message}
                autoHideDuration={5000}
                onClose={() => setMessage(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity={message?.severity ?? 'success'} onClose={() => setMessage(null)}>{message?.text}</Alert>
            </Snackbar>
        </CanvasContext>
    );
}
