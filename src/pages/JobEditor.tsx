import { useState, useCallback, useRef, useEffect, useContext, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useApolloClient } from '@apollo/client';
import ReactFlow, { ReactFlowProvider, Controls, Background, addEdge, FitViewOptions,
                    applyEdgeChanges, NodeChange, EdgeChange, Connection, Panel } from 'reactflow';
import 'reactflow/dist/style.css';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Snackbar, TextField, Typography } from '@mui/material';

import { buildNodeParameters, createNodeObject } from '../controllers/ReactFlowEvents';
import { addNodesAndEdgesFromBundle, isValidConnection } from '../controllers/GraphHelpers';
import { hydrateJobGraph, hydrateVersionGraph, lockedClientIdsFromJob, buildSaveWorkflowsInput, deriveGhostNodes, deriveGhostEdges, unionGhostSources, applyJobEditorNodeChanges, restoreGhostEdges, mergeComparisonGhosts } from '../controllers/jobGraphHydration';
import { diffJobGraphs, latestContentVersion, latestVersion, selectedDiffPair, GraphDiff, EMPTY_DIFF, SnapshotWorkflow, JobVersionLike, jobVersionDisplayLabel } from '../utils/jobGraphDiff';
import { canRevertVersions, customerMayEdit, editingBlockedMessage, staffEditBlockedReason } from '../utils/jobEditing';
import { missedContentVersion, missedUnfilteredContent, pickersAfterSave, seedLoadedVersionNumber } from '../utils/jobEditorSave';
import JobVersionHistory from '../components/JobVersionHistory';
import Sidebar        from '../components/Sidebar';
import CustomDemoNode from '../components/CanvasNode';
import RightSidebar   from '../components/RightSidebar';
import { GET_JOB_BY_ID, GET_OWN_JOB_BY_ID } from '../gql/queries';
import { RESTORE_JOB_VERSION, SAVE_JOB_WORKFLOWS } from '../gql/mutations';
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
    const apolloClient = useApolloClient();
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
    /** Client-side node ids present when the current version was loaded. Deletes of these become ghosts. */
    const loadedIdsRef = useRef<Set<string>>(new Set());

    const [note, setNote] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; severity: 'success' | 'error' } | null>(null);
    /** Latest content version this tab had when it last loaded or saved. Newer than this is a concurrent edit. */
    const [loadedVersionNumber, setLoadedVersionNumber] = useState<number | null>(null);
    const [conflict, setConflict] = useState<{ version: JobVersionLike | null; hidden: boolean } | null>(null);

    const { data, loading, error, refetch } = useQuery(isStaff ? GET_JOB_BY_ID : GET_OWN_JOB_BY_ID, {
        variables: { id },
        fetchPolicy: 'network-only',
        skip: !id
    });
    const job = data?.jobById ?? data?.ownJobById ?? null;

    const [saveJobWorkflows] = useMutation(SAVE_JOB_WORKFLOWS);
    const [restoreJobVersion] = useMutation(RESTORE_JOB_VERSION);
    const [restoring, setRestoring] = useState(false);

    const versions: JobVersionLike[] = useMemo(() => job?.versions ?? [], [job]);
    // Staff skip trailing events so they do not land on a Closed copy.
    // Customers use the newest row they are allowed to see, including a
    // visible Request Changes event — otherwise View / hydrate would show
    // the original submission and a save would overwrite live workflows.
    const latest = useMemo(
        () => (isStaff ? latestContentVersion(versions) : latestVersion(versions)),
        [isStaff, versions]
    );

    /**
     * Which version is on screen, and what it is compared against. Both default
     * to the automatic choice, so leaving the pickers alone behaves exactly as
     * the editor did before they existed.
     */
    const [viewing, setViewing] = useState<number | null>(null);
    const [baseline, setBaseline] = useState<number | null | undefined>(undefined);

    // A different job is a different editor: drop the previous job's pickers,
    // conflict dialog, and "what I loaded" marker so they cannot leak across.
    useEffect(() => {
        setViewing(null);
        setBaseline(undefined);
        setLoadedVersionNumber(null);
        setConflict(null);
        setHydrated(false);
    }, [id]);

    useEffect(() => {
        // Ignore a stale cache entry for the previous job while the new query is in flight.
        if (!latest || !job || String(job.id) !== String(id)) return;
        setViewing((prev) => prev ?? latest.versionNumber);
        setLoadedVersionNumber((prev) => prev ?? seedLoadedVersionNumber(isStaff, latest.versionNumber, job.latestContentVersionNumber));
    }, [latest, job, id, isStaff]);

    /**
     * Restoring an earlier version.
     *
     * Server-side on purpose: withdrawing a job from the customer restores the
     * same way, and the gate that decides who may write lives there. Doing it in
     * the browser would duplicate the logic and sit outside that gate.
     */
    const canRevert = canRevertVersions(job, isStaff);
    const isLatestVersion = latest != null && viewing === latest.versionNumber;

    const handleRestoreVersion = async (): Promise<void> => {
        if (viewing == null || !id) return;
        const label = jobVersionDisplayLabel(viewing);
        if (!window.confirm(`Restore version ${label}? This becomes the current workflow, saved as a new version. Nothing already in the history is lost.`)) return;
        setRestoring(true);
        try {
            await restoreJobVersion({ variables: { jobId: id, versionNumber: viewing, note: `Restored version ${label}` } });
            const { data: fresh } = await refetch();
            const freshJob = fresh?.jobById ?? fresh?.ownJobById ?? null;
            const freshLatest = isStaff ? latestContentVersion(freshJob?.versions ?? []) : latestVersion(freshJob?.versions ?? []);
            if (freshLatest) {
                setViewing(freshLatest.versionNumber);
                setBaseline(undefined);
            }
            setMessage({ text: `Restored version ${label}.`, severity: 'success' });
        } catch (err: any) {
            setMessage({ text: err?.message ?? 'Could not restore that version.', severity: 'error' });
        } finally {
            setRestoring(false);
        }
    };

    /** Viewing anything but the newest version is a read-only look at history.
     *  Suppressed while a save is in flight so a refetch that lands a new latest
     *  before we snap the picker cannot flash the canvas into historic mode. */
    const isHistoric = !saving && latest != null && viewing != null && viewing !== latest.versionNumber;

    /** Not the customer's to change right now.
     *  Mirrors the server gate exactly: both CHANGES_REQUESTED and the explicit
     *  editing grant are required. A stale true flag in any other lifecycle state
     *  therefore remains read-only. */
    const lockedToLab = !isStaff && job != null && !customerMayEdit(job);
    /** Staff cannot edit a job the customer holds, or one whose spec is accepted. */
    const staffBlockedReason = isStaff && job != null ? staffEditBlockedReason(job) : null;

    /** What to show when a save is refused.
     *  A customer whose job was accepted while they had the editor open needs to
     *  be told *that*, not handed Apollo's wrapper text. The job this tab loaded
     *  cannot answer the question — it is precisely the thing that went stale —
     *  so the fresh copy decides, and only genuine failures echo the error. */
    const saveErrorText = async (err: any): Promise<string> => {
        if (!isStaff) {
            const fresh = await peekJob().catch(() => null);
            if (fresh && !customerMayEdit(fresh)) return editingBlockedMessage(fresh);
        }
        return err?.message ?? 'Could not save changes.';
    };

    /** Nothing on the canvas may be changed — either a past version is on
     *  screen, or the job is not editable by this reader right now. */
    const readOnly = isHistoric || lockedToLab || staffBlockedReason != null;

    const { baseline: baselineVersion } = useMemo(() => selectedDiffPair(versions, viewing, baseline), [versions, viewing, baseline]);

    const viewedWorkflows: SnapshotWorkflow[] | undefined = useMemo(() => {
        if (viewing == null) return undefined;
        return versions.find((v) => v.versionNumber === viewing)?.workflows;
    }, [versions, viewing]);

    /**
     * The graph to highlight against.
     *
     * Staff latest hydrates from the job's live workflows (ops state). Everyone
     * else, and any historic view, hydrates from the selected version snapshot
     * so a customer never lands on a hidden staff draft. The highlight is
     * baseline → canvas: a customer arriving from a feedback link sees the
     * technician's visible changes on open, and anyone's unsaved edits light up
     * as they work. When nothing earlier was written by the other side the
     * baseline is the latest allowed version itself, so a freshly submitted job
     * starts clean.
     */
    const baselineWorkflows: SnapshotWorkflow[] | undefined = useMemo(() => {
        if (!versions.length) return undefined;
        return baselineVersion?.workflows;
    }, [versions, baselineVersion]);

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

    /**
     * Rebuild the canvas: staff latest stays live; everyone else, and any
     * historic view, uses the selected version snapshot.
     *
     * Nodes, edges and the `hydrated` flag are set in one commit. `hydrated` is
     * only cleared when the route job id changes — never mid-edit — because a
     * frame with a populated baseline and empty nodes makes every baseline node
     * look deleted, and the whole graph renders as unclickable ghosts.
     */
    const resetToSavedJob = useCallback(() => {
        if (!job || !services?.length) return;
        if (String(job.id) !== String(id)) return;

        const selected = viewing != null
            ? versions.find((v) => v.versionNumber === viewing)
            : null;

        let nextNodes: any[];
        let nextEdges: any[];
        if (!isStaff) {
            // Never hydrate live job.workflows for a customer: that document can
            // hold a hidden staff draft. Missing selected snapshot falls back to
            // the latest allowed row, including a visible Request Changes event.
            const snapshot = selected ?? latestVersion(versions);
            // Editable unless they have paged back to an older version. Without
            // this the snapshot renders every node locked, which silently
            // removes the delete button while leaving other edits working.
            ({ nodes: nextNodes, edges: nextEdges } = snapshot
                ? hydrateVersionGraph(snapshot.workflows, services, {
                      editable: !readOnly,
                      lockedClientIds: lockedClientIdsFromJob(job)
                  })
                : { nodes: [], edges: [] });
        } else {
            const useSnapshot = isHistoric;
            const snapshotVersion = selected ?? (useSnapshot ? latest : null);
            ({ nodes: nextNodes, edges: nextEdges } =
                useSnapshot && snapshotVersion
                    ? hydrateVersionGraph(snapshotVersion.workflows, services)
                    : hydrateJobGraph(job, services));
        }

        setNodes(nextNodes);
        setEdges(nextEdges);
        loadedIdsRef.current = new Set(nextNodes.map((n: any) => n.id));
        setActiveComponentId('');
        setHydrated(true);
    }, [job, services, isStaff, isHistoric, readOnly, versions, viewing, id, latest]);

    useEffect(() => {
        resetToSavedJob();
    }, [resetToSavedJob]);

    /**
     * Comparison ghosts (a node the baseline still has that this version does
     * not) have to live in `nodes` state. Passing them only through the React
     * Flow `nodes` prop as extras is the same-id re-insert that session-delete
     * already proved does not stick. Hydration writes the live graph first and
     * sets `hydrated`; this effect then inserts, so it never runs against an
     * empty canvas.
     */
    const ghostSource = useMemo(
        () => unionGhostSources(viewedWorkflows, baselineWorkflows),
        [viewedWorkflows, baselineWorkflows]
    );

    useEffect(() => {
        if (!hydrated) return;
        setNodes((nds: any[]) => {
            const liveIds = new Set(nds.filter((n) => !n.data?.ghost).map((n) => n.id));
            const derived = deriveGhostNodes(ghostSource, liveIds, services ?? []);
            return mergeComparisonGhosts(nds, derived, loadedIdsRef.current);
        });
    }, [hydrated, ghostSource, services]);

    /** Fold the diff onto the nodes React Flow renders, so CanvasNode can decorate without knowing about versions. */
    const decoratedNodes = useMemo(() => {
        return nodes.map((node) => {
            const kind = diff.byNodeId.get(node.id)?.kind;
            const diffKind = kind === 'added' || kind === 'changed' ? kind : undefined;
            if (node.data?.diffKind === diffKind) return node;
            return { ...node, data: { ...node.data, diffKind } };
        });
    }, [nodes, diff]);

    /** Which parameters changed, per node, so the parameter panel can mark them individually. */
    const changedParamIdsByNode = useMemo(() => {
        const byNode = new Map<string, Set<string>>();
        for (const [nodeId, nodeDiff] of diff.byNodeId) {
            if (nodeDiff.paramDiffs.length) byNode.set(nodeId, new Set(nodeDiff.paramDiffs.map((p) => p.id)));
        }
        return byNode;
    }, [diff]);

    const decoratedEdges = useMemo(() => {
        const ghostIds = new Set(nodes.filter((n) => n.data?.ghost).map((n) => n.id));
        const renderable = new Set(nodes.map((n) => n.id));
        const extras = deriveGhostEdges(ghostSource, ghostIds, renderable);
        const extraIds = new Set(extras.map((e: any) => e.id));
        return [...edges.filter((e: any) => !extraIds.has(e.id)), ...extras];
    }, [edges, nodes, ghostSource]);

    // While viewing history the canvas is a picture of a past version, so every
    // mutating handler is a no-op. Selection changes still go through: a reader
    // needs to click a node to inspect its parameters.
    const onNodesChange = useCallback(
        (changes: NodeChange[]) => {
            const allowed = readOnly ? changes.filter((c) => c.type === 'select' || c.type === 'dimensions' || c.type === 'position') : changes;
            if (!allowed.length) return;
            // flatMap rather than filter+map: only the 'remove' variant of the
            // NodeChange union carries an id, and TypeScript cannot carry that
            // narrowing across two calls.
            const ghosted = new Set(allowed.flatMap((c) => (c.type === 'remove' && loadedIdsRef.current.has(c.id) ? [c.id] : [])));
            setNodes((nds: any) => applyJobEditorNodeChanges(allowed, nds, loadedIdsRef.current));
            if (ghosted.size) {
                setEdges((eds: any) => restoreGhostEdges(eds, edges, ghosted));
            }
        },
        [readOnly, edges]
    );
    const onEdgesChange = useCallback(
        (changes: EdgeChange[]) => {
            if (readOnly) return;
            setEdges((eds: any) => applyEdgeChanges(changes, eds));
        },
        [readOnly]
    );
    const onConnect = useCallback((connection: Connection) => {
        if (readOnly) return;
        const customConnection: any = connection;
        if (isValidConnection(services, nodes, customConnection.source, customConnection.target)) {
            customConnection.style = { stroke: 'green' };
        }
        setEdges((eds: any) => addEdge(customConnection, eds));
    }, [services, nodes, readOnly]);

    const onDragOver = useCallback((event: any) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    // Mirrors MainFlow.onDrop; a node added here is indistinguishable from one
    // dropped on the ordinary canvas, which is what lets the diff call it 'added'
    // purely by its absence from the baseline.
    const onDrop = useCallback((event: any) => {
        event.preventDefault();
        if (readOnly) return;
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
        const { formData, parameters } = buildNodeParameters(type, nodeId);
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
            parameters,
            additionalInstructions: '',
            formData,
            serviceId: type.id,
            paramGroups: type.paramGroups
        };
        setNodes((nds: any) => nds.concat(createNodeObject(nodeId, type.name, type.type, position, nodeData)));
    }, [reactFlowInstance, services, readOnly]);

    const peekJob = async () => {
        // no-cache so a concurrent save is visible without writing over this
        // tab's job and re-hydrating the canvas (which would wipe unsaved edits).
        const { data: peeked } = await apolloClient.query({
            query: isStaff ? GET_JOB_BY_ID : GET_OWN_JOB_BY_ID,
            variables: { id },
            fetchPolicy: 'no-cache'
        });
        return peeked?.jobById ?? peeked?.ownJobById ?? null;
    };

    const applyPickersAfterSave = (freshVersions: JobVersionLike[], missedVersionNumber: number | null) => {
        const newLatest = isStaff ? latestContentVersion(freshVersions) : latestVersion(freshVersions);
        if (!newLatest) return;
        const pickers = pickersAfterSave({
            newLatestVersionNumber: newLatest.versionNumber,
            missedVersionNumber
        });
        setViewing(pickers.viewing);
        setBaseline(pickers.baseline);
        setLoadedVersionNumber(newLatest.versionNumber);
    };

    const persistCanvas = async (missedVersionNumber: number | null) => {
        await saveJobWorkflows({
            variables: { input: { jobId: id, note: note.trim(), workflows: buildSaveWorkflowsInput(nodes, edges) } }
        });
        setNote('');
        setMessage({ text: 'Changes saved.', severity: 'success' });
        const result = await refetch();
        const freshJob = result.data?.jobById ?? result.data?.ownJobById;
        applyPickersAfterSave(freshJob?.versions ?? [], missedVersionNumber);
    };

    const handleSave = async () => {
        if (readOnly) return;
        setSaving(true);
        try {
            const peekedJob = await peekJob();

            // The lab may have taken the job back while this canvas sat open —
            // accepting closes editing. Caught here rather than left to the
            // server's rejection so the customer is told what happened to their
            // job, not that their save failed.
            if (!isStaff && !customerMayEdit(peekedJob)) {
                setMessage({ text: editingBlockedMessage(peekedJob), severity: 'error' });
                return;
            }

            const peekedVersions: JobVersionLike[] = peekedJob?.versions ?? [];
            const missed = isStaff
                ? missedContentVersion(peekedVersions, loadedVersionNumber)
                : null;
            const missedHidden = !isStaff
                ? missedUnfilteredContent(peekedJob?.latestContentVersionNumber, loadedVersionNumber)
                : null;

            if (missed) {
                setConflict({ version: missed, hidden: false });
                return;
            }
            if (missedHidden) {
                setConflict({ version: null, hidden: true });
                return;
            }
            await persistCanvas(null);
        } catch (err: any) {
            setMessage({ text: await saveErrorText(err), severity: 'error' });
        } finally {
            setSaving(false);
        }
    };

    const confirmConflictSave = async () => {
        const missedVersionNumber = conflict?.hidden ? null : (conflict?.version?.versionNumber ?? null);
        setConflict(null);
        setSaving(true);
        try {
            await persistCanvas(missedVersionNumber);
        } catch (err: any) {
            setMessage({ text: await saveErrorText(err), severity: 'error' });
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
                                    {readOnly ? 'Viewing' : 'Editing'} <strong>{job.name}</strong>{job.jobId ? ` (#${job.jobId})` : ''}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                                    <Chip size="small" label="New" sx={{ height: 18, fontSize: 10, backgroundColor: '#2e7d32', color: 'white', fontWeight: 700 }} />
                                    <Chip size="small" label="Edited" sx={{ height: 18, fontSize: 10, backgroundColor: '#ed6c02', color: 'white', fontWeight: 700 }} />
                                    <Chip size="small" label="Deleted" sx={{ height: 18, fontSize: 10, backgroundColor: '#757575', color: 'white', fontWeight: 700 }} />
                                </Box>
                            </Panel>

                            {/* Bottom-right is the only free corner: Controls and the
                                Revert button already share bottom-left. */}
                            <Panel position="bottom-right" style={{ marginRight: 8, marginBottom: 8 }}>
                                {viewing != null && (
                                    <Box sx={{ backgroundColor: 'white', p: 0.75, borderRadius: 1, boxShadow: 2 }}>
                                        <JobVersionHistory
                                            versions={versions}
                                            viewing={viewing}
                                            baseline={baselineVersion?.versionNumber ?? null}
                                            onViewingChange={(v) => {
                                                setViewing(v);
                                                // Re-derive rather than carry the old baseline forward: a
                                                // baseline newer than the version being viewed would report
                                                // every later edit as a deletion.
                                                setBaseline(undefined);
                                            }}
                                            onBaselineChange={setBaseline}
                                            dense
                                        />
                                        {/* Restoring is a contract write like any
                                            other, so it is offered only where the
                                            server would accept the save — see
                                            canRevertVersions. */}
                                        {canRevert && !isLatestVersion && (
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                disabled={restoring}
                                                onClick={handleRestoreVersion}
                                                sx={{ textTransform: 'none', mt: 0.75, width: '100%' }}
                                            >
                                                {restoring ? 'Restoring…' : 'Restore this version'}
                                            </Button>
                                        )}
                                    </Box>
                                )}
                            </Panel>

                            <Panel position="top-right" style={{ marginRight: 8, marginTop: 8, maxWidth: 300 }}>
                                {isHistoric ? (
                                    <Alert severity="info" sx={{ py: 0.25, fontSize: 12 }}>
                                        Viewing version {jobVersionDisplayLabel(viewing!)} — read only. Switch back to version {jobVersionDisplayLabel(latest!.versionNumber)} to edit.
                                    </Alert>
                                ) : staffBlockedReason ? (
                                    /* Names the withdrawal that would unblock them —
                                       "read only" on a job a technician is looking at is
                                       otherwise indistinguishable from a bug. */
                                    <Alert severity="info" sx={{ py: 0.25, fontSize: 12 }}>
                                        {staffBlockedReason}
                                    </Alert>
                                ) : lockedToLab ? (
                                    /* Deliberately not the historic message: telling a
                                       customer to switch versions is advice they cannot act
                                       on, because no version of this job is theirs to edit.
                                       Phrased for arrival by the job view's View button too,
                                       which reaches finished jobs no lab review is pending
                                       on — hence no claim about what happens next beyond the
                                       one condition that does reopen editing. */
                                    <Alert severity="info" sx={{ py: 0.25, fontSize: 12 }}>
                                        {editingBlockedMessage(job)}
                                    </Alert>
                                ) : (
                                <>
                                {/* The note describes this save, not the job, and is shown
                                    alongside the diff summary in the job view. Required: the
                                    version history is what the other party reads to understand
                                    an edit, and an unlabelled entry tells them nothing. */}
                                <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center', backgroundColor: 'white', p: 0.75, borderRadius: 1, boxShadow: 2 }}>
                                    <TextField
                                        size="small"
                                        required
                                        placeholder="What changed?"
                                        value={note}
                                        onChange={(event) => setNote(event.target.value)}
                                        disabled={saving}
                                        sx={{ width: 170, '& .MuiInputBase-input': { fontSize: 12, py: 0.75 } }}
                                    />
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={handleSave}
                                        disabled={saving || !note.trim()}
                                        title={!note.trim() ? 'Describe what you changed before saving' : undefined}
                                        sx={{ textTransform: 'none', whiteSpace: 'nowrap' }}
                                    >
                                        {saving ? 'Saving…' : 'Save changes'}
                                    </Button>
                                </Box>
                                {changeCount > 0 && (
                                    <Typography variant="caption" sx={{ display: 'block', textAlign: 'right', mt: 0.5, backgroundColor: 'white', px: 0.75, borderRadius: 1, width: 'fit-content', ml: 'auto' }}>
                                        {changeCount} node{changeCount === 1 ? '' : 's'} changed
                                    </Typography>
                                )}
                                </>
                                )}
                            </Panel>

                            {!readOnly && (
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
                                        Discard unsaved edits
                                    </Button>
                                </Panel>
                            )}
                        </ReactFlow>

                        <div style={{ minWidth: '10%', width: 850, borderLeft: 'solid 1px' }}>
                            {/* A past version's parameters are readable but not editable —
                                the same treatment CanvasPreview already uses. */}
                            <RightSidebar
                                changedParamIdsByNode={changedParamIdsByNode}
                                readOnly={readOnly}
                                customerCategory={job?.customerCategory ?? undefined}
                            />
                        </div>

                    </div>
                </ReactFlowProvider>
            </div>

            <Dialog open={!!conflict} onClose={() => !saving && setConflict(null)}>
                <DialogTitle>Someone else saved while you were editing</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {conflict?.hidden ? (
                            <>
                                The lab has saved a newer version while you were editing. Saving will keep their version in history and add yours as a new version. You will not see the lab’s unpublished draft.
                            </>
                        ) : conflict?.version ? (
                            <>
                                {conflict.version.createdByName || 'Another user'} saved version {jobVersionDisplayLabel(conflict.version.versionNumber)}
                                {conflict.version.createdAt ? ` on ${new Date(conflict.version.createdAt).toLocaleString()}` : ''}
                                {conflict.version.note?.trim() ? `: “${conflict.version.note.trim()}”` : '.'}
                                {' '}Saving will keep their version and add yours as a new version. You can then compare the two and edit a follow-up version to reconcile.
                            </>
                        ) : null}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConflict(null)} disabled={saving}>Cancel</Button>
                    <Button onClick={confirmConflictSave} variant="contained" disabled={saving} autoFocus>
                        {saving ? 'Saving…' : 'Save my version'}
                    </Button>
                </DialogActions>
            </Dialog>

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
