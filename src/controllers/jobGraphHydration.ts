import { generateFormDataFromParams, createNodeObject, serviceAllowsMultipleRuns, withRunCountParam } from './ReactFlowEvents';
import { getWorkflowsFromGraph } from './GraphHelpers';
import { NodeParameter } from '../types/CanvasTypes';
import { RUN_COUNT_PARAM_ID } from '../utils/servicePricing';
import { applyNodeChanges, NodeChange } from 'reactflow';

/**
 * Rebuilding a submitted job as an editable canvas.
 *
 * Two rules make the rest of the feature work:
 *
 *  1. **Node ids are carried through verbatim.** The React Flow node id is the
 *     stored `WorkflowNode.id`. Every diff is keyed on it, so minting a fresh id
 *     here — as the old ResubmissionHelpers did — would make every node read as
 *     deleted-and-re-added and the diff would be worthless.
 *  2. **Positions come from what was saved.** `reactNode` has held the whole
 *     React Flow node, position included, since submission; the frontend simply
 *     never asked for it back. Reusing it means the graph reopens exactly as its
 *     author drew it, so a highlight reads as a change rather than a reshuffle.
 */

const NODE_SPACING_Y = 150;
const WORKFLOW_SPACING_X = 400;

export interface HydratedGraph {
    nodes: any[];
    edges: any[];
}

/**
 * Merge saved parameter values onto the catalogue's current parameter list.
 *
 * Matched by parameter id, not position: the catalogue's parameter order can be
 * edited after a workflow is saved, and positional matching would silently move
 * values into the wrong slots. The positional path survives only as a fallback
 * for values saved before parameters carried ids.
 */
export const mergeSavedFormData = (parameters: any[], savedFormData: any, nodeId: string, service?: any): NodeParameter[] => {
    const savedList = Array.isArray(savedFormData) ? savedFormData : [];
    const savedById = new Map<string, any>(
        savedList.filter((entry: any) => entry && typeof entry.id === 'string').map((entry: any) => [entry.id, entry.value])
    );

    // Creation is gated on the service's flag; hydration is not. A job saved
    // while the service offered multiple runs keeps its count even if the
    // catalogue has since stopped offering them — the entry is what pricing
    // multiplies by, so dropping it here would quietly reprice the job the next
    // time it was saved.
    const includeRunCount = serviceAllowsMultipleRuns(service) || savedById.has(RUN_COUNT_PARAM_ID);
    const fresh = generateFormDataFromParams(parameters ?? [], nodeId, { includeRunCount });

    return fresh.map((param, index) => {
        const matched = savedById.has(param.id) ? savedById.get(param.id) : savedList[index]?.value;
        if (matched === undefined || matched === null) return param;
        return { ...param, value: matched };
    });
};

/**
 * Positions for a workflow whose nodes were saved without any.
 *
 * Depth from the tree's roots gives the vertical rank, siblings fan out
 * horizontally, and each workflow gets its own column band. Enough to make a
 * legacy job legible; a node that *does* have a stored position always wins.
 */
const computeFallbackPositions = (nodes: any[], edges: any[], workflowIndex: number): Map<string, { x: number; y: number }> => {
    const childrenOf = new Map<string, string[]>();
    const hasParent = new Set<string>();
    for (const edge of edges) {
        if (!childrenOf.has(edge.source)) childrenOf.set(edge.source, []);
        childrenOf.get(edge.source)!.push(edge.target);
        hasParent.add(edge.target);
    }

    const roots = nodes.map((n) => n.id).filter((id) => !hasParent.has(id));
    const depth = new Map<string, number>();
    const queue: string[] = [...(roots.length ? roots : nodes.slice(0, 1).map((n) => n.id))];
    for (const id of queue) depth.set(id, 0);

    while (queue.length) {
        const id = queue.shift()!;
        for (const child of childrenOf.get(id) ?? []) {
            if (depth.has(child)) continue;
            depth.set(child, (depth.get(id) ?? 0) + 1);
            queue.push(child);
        }
    }

    // Anything the walk never reached (a node with no edges at all) stacks below.
    let orphanRow = Math.max(0, ...[...depth.values()]) + 1;
    for (const node of nodes) {
        if (!depth.has(node.id)) depth.set(node.id, orphanRow++);
    }

    const seenAtDepth = new Map<number, number>();
    const positions = new Map<string, { x: number; y: number }>();
    for (const node of nodes) {
        const d = depth.get(node.id) ?? 0;
        const column = seenAtDepth.get(d) ?? 0;
        seenAtDepth.set(d, column + 1);
        positions.set(node.id, {
            x: workflowIndex * WORKFLOW_SPACING_X + column * 300,
            y: d * NODE_SPACING_Y
        });
    }
    return positions;
};

const nodeIsLocked = (node: any): boolean => {
    const state = node?.state;
    const inFlight = state !== undefined && state !== null && state !== 'QUEUED';
    const holdsInventory = Array.isArray(node?.usedInventory) && node.usedInventory.length > 0;
    return inFlight || holdsInventory;
};

/**
 * Client-side ids of the job's live nodes that the lab has started or that hold
 * inventory. Read straight off the live workflows, so a snapshot-hydrated canvas
 * can still show real locks — the snapshot itself records no node state.
 */
export const lockedClientIdsFromJob = (job: any): Set<string> => {
    const locked = new Set<string>();
    for (const workflow of job?.workflows ?? []) {
        for (const node of workflow?.nodes ?? []) {
            if (node?.id && nodeIsLocked(node)) locked.add(node.id);
        }
    }
    return locked;
};

/**
 * Turn a job (as returned by GET_JOB_BY_ID / GET_OWN_JOB_BY_ID) into React Flow
 * nodes and edges. Each workflow is a disconnected tree on one shared canvas.
 */
export const hydrateJobGraph = (job: any, services: any[]): HydratedGraph => {
    const allNodes: any[] = [];
    const allEdges: any[] = [];

    (job?.workflows ?? []).forEach((workflow: any, workflowIndex: number) => {
        const workflowNodes = workflow?.nodes ?? [];

        const edges = (workflow?.edges ?? [])
            .map((edge: any) => {
                const source = edge?.source?.id;
                const target = edge?.target?.id;
                if (!source || !target) return null;
                return {
                    id: edge?.reactEdge?.id ?? `${source}->${target}`,
                    source,
                    target,
                    animated: true,
                    style: { stroke: 'green' }
                };
            })
            .filter(Boolean);

        const fallback = computeFallbackPositions(workflowNodes, edges, workflowIndex);

        for (const node of workflowNodes) {
            // The catalogue entry is the source of truth for the parameter
            // *schema*; the saved node supplies the values. A service deleted from
            // the catalogue since submission falls back to what the node stored,
            // so the job still opens rather than losing the node.
            const service = services.find((s: any) => s.id === node?.service?.id) ?? node?.service;
            if (!service) continue;

            const formData = mergeSavedFormData(service.parameters ?? [], node.formData, node.id, service);
            // Keep the sidebar's parameter list in step with what formData
            // actually holds, so a run count that survived hydration is still
            // pinned to the top rather than buried under the service's own fields.
            const parameters = withRunCountParam(service.parameters ?? [], formData.some((p) => p.id === RUN_COUNT_PARAM_ID));
            const stored = node?.reactNode?.position;
            const position =
                stored && typeof stored.x === 'number' && typeof stored.y === 'number' ? { x: stored.x, y: stored.y } : fallback.get(node.id) ?? { x: 0, y: 0 };

            const data = {
                id: node.id,
                label: service.name ?? node.label,
                price: node.price ?? service.price,
                internalPrice: service.internalPrice,
                externalPrice: service.externalPrice,
                externalAcademicPrice: service.externalAcademicPrice,
                externalMarketPrice: service.externalMarketPrice,
                externalNoSalaryPrice: service.externalNoSalaryPrice,
                pricing: service.pricing,
                pricingMode: service.pricingMode,
                description: service.description,
                allowedConnections: service.allowedConnections,
                icon: service.icon,
                parameters,
                additionalInstructions: node.additionalInstructions ?? '',
                formData,
                serviceId: service.id,
                paramGroups: service.paramGroups,
                // Editor-only. Stripped before anything is sent to the server.
                workflowId: workflow.id,
                nodeState: node.state,
                locked: nodeIsLocked(node)
            };

            const reactNode: any = createNodeObject(node.id, data.label, 'selectorNode', position, data as any);
            if (data.locked) reactNode.draggable = false;
            allNodes.push(reactNode);
        }

        allEdges.push(...edges);
    });

    return { nodes: allNodes, edges: allEdges };
};

/**
 * A stored version snapshot in the shape JobWorkflowCards renders.
 *
 * The cards were written against live workflow documents, which carry
 * `node.service.parameters` (for naming parameters and resolving dropdown
 * options) and `node.state` (for the status icon). A snapshot carries neither —
 * it holds a serviceId and raw form values — so the catalogue is re-attached
 * here and state is left undefined, which the icon helper already tolerates.
 *
 * Node order is the snapshot's own, which is the flow order the graph was saved
 * with.
 */
export const versionWorkflowsAsCards = (versionWorkflows: any[] | undefined, services: any[]): any[] =>
    (versionWorkflows ?? []).map((workflow: any, index: number) => ({
        id: workflow?.workflowId ?? `version-workflow-${index}`,
        name: workflow?.name,
        nodes: (workflow?.nodes ?? []).map((snapshot: any) => {
            const service = services.find((s: any) => s.id === snapshot?.serviceId);
            return {
                id: snapshot?.id,
                label: snapshot?.label ?? snapshot?.serviceName ?? 'Removed service',
                formData: snapshot?.formData ?? [],
                price: snapshot?.price,
                // Named `service` to match the live shape the cards destructure.
                service: service ?? { id: snapshot?.serviceId, name: snapshot?.serviceName, parameters: [] }
            };
        })
    }));

/**
 * Rebuild a stored version snapshot as a canvas.
 *
 * Distinct from hydrateJobGraph, which reads the job's *live* workflow documents
 * and carries operational state (node state, locks, workflow ids) that only
 * applies to the present. A snapshot has none of that — it is content only.
 *
 * Read-only by default, which is what viewing an older version wants: the nodes
 * are marked `historic` and made undraggable so a past version cannot be edited
 * or saved.
 *
 * `editable` exists for the customer's editor, which must hydrate from a
 * snapshot rather than the live documents (those can hold a staff draft the
 * customer is not meant to see) while still being a working editor. Because the
 * snapshot carries no node state, in-flight locking cannot be derived from it —
 * pass `lockedClientIds`, built from the live workflows, or every node comes
 * back unlocked. The backend re-checks regardless; this is the affordance, not
 * the guarantee.
 */
interface VersionGraphOptions {
    editable?: boolean;
    /** Client-side ids of nodes the lab has started or that hold inventory. */
    lockedClientIds?: Set<string>;
}

export const hydrateVersionGraph = (versionWorkflows: any[] | undefined, services: any[], options: VersionGraphOptions = {}): HydratedGraph => {
    const editable = options.editable === true;
    const allNodes: any[] = [];
    const allEdges: any[] = [];

    (versionWorkflows ?? []).forEach((workflow: any, workflowIndex: number) => {
        const snapshotNodes = workflow?.nodes ?? [];
        const edges = (workflow?.edges ?? []).map((edge: any) => ({
            id: edge.id ?? `${edge.source}->${edge.target}`,
            source: edge.source,
            target: edge.target,
            animated: true,
            style: { stroke: 'green' }
        }));

        const fallback = computeFallbackPositions(snapshotNodes, edges, workflowIndex);

        for (const snapshot of snapshotNodes) {
            if (!snapshot?.id) continue;
            // A service deleted from the catalogue since is still nameable from
            // the snapshot itself, so an old version stays readable.
            const service = services.find((s: any) => s.id === snapshot.serviceId);
            const position =
                snapshot.position && typeof snapshot.position.x === 'number' ? { x: snapshot.position.x, y: snapshot.position.y } : fallback.get(snapshot.id) ?? { x: 0, y: 0 };

            const formData = mergeSavedFormData(service?.parameters ?? [], snapshot.formData, snapshot.id, service);

            const data = {
                id: snapshot.id,
                label: snapshot.label ?? snapshot.serviceName ?? 'Removed service',
                price: snapshot.price ?? service?.price ?? 0,
                description: service?.description ?? '',
                allowedConnections: service?.allowedConnections ?? [],
                icon: service?.icon ?? '',
                parameters: withRunCountParam(service?.parameters ?? [], formData.some((p) => p.id === RUN_COUNT_PARAM_ID)),
                additionalInstructions: snapshot.additionalInstructions ?? '',
                formData,
                serviceId: snapshot.serviceId,
                pricing: service?.pricing,
                pricingMode: service?.pricingMode,
                historic: !editable,
                // Reuses CanvasNode's existing suppression path, so a past
                // version does not render a live delete button it would ignore.
                // When editable, only genuinely in-flight nodes lock.
                locked: editable ? options.lockedClientIds?.has(snapshot.id) === true : true
            };

            const node: any = createNodeObject(snapshot.id, data.label, 'selectorNode', position, data as any);
            node.draggable = editable ? !data.locked : false;
            node.deletable = editable ? !data.locked : false;
            allNodes.push(node);
        }

        allEdges.push(...edges);
    });

    return { nodes: allNodes, edges: allEdges };
};

/**
 * Graphs whose missing nodes should render as ghosts: the version currently
 * being edited (so an unsaved delete stays on the canvas) unioned with the
 * highlight baseline (so an already-saved deletion still shows when comparing).
 *
 * Viewed nodes win on id collision — a ghost should sit where the editor just
 * removed it, not where an older snapshot had it.
 */
export const unionGhostSources = (viewed: any[] | undefined, baseline: any[] | undefined): any[] | undefined => {
    if (!viewed?.length && !baseline?.length) return undefined;

    const nodesById = new Map<string, any>();
    const edges: any[] = [];
    const seenEdges = new Set<string>();

    for (const source of [viewed, baseline]) {
        if (!source?.length) continue;
        for (const workflow of source) {
            for (const node of workflow?.nodes ?? []) {
                if (node?.id && !nodesById.has(node.id)) nodesById.set(node.id, node);
            }
            for (const edge of workflow?.edges ?? []) {
                const key = `${edge?.source}->${edge?.target}`;
                if (seenEdges.has(key)) continue;
                seenEdges.add(key);
                edges.push(edge);
            }
        }
    }

    return [{ nodes: [...nodesById.values()], edges }];
};

const GHOST_EDGE_STYLE = { stroke: '#9e9e9e', strokeDasharray: '6 4' };

/** Mark a live React Flow node as a deletion ghost without changing its id or position. */
export const markNodeGhost = (node: any): any => ({
    ...node,
    draggable: false,
    deletable: false,
    selectable: false,
    data: { ...node.data, ghost: true }
});

/**
 * Apply React Flow node changes in the job editor.
 *
 * A `remove` of a node that was on the job when the editor opened is converted
 * into a ghost rather than dropped: React Flow's delete path actually removes
 * the node, and putting a same-id ghost back on the next render never sticks.
 * Nodes added in this session are still removed for real.
 */
export const applyJobEditorNodeChanges = (changes: NodeChange[], nodes: any[], loadedIds: Set<string>): any[] => {
    const removes = changes.filter((c) => c.type === 'remove');
    const rest = changes.filter((c) => c.type !== 'remove');
    let next = rest.length ? applyNodeChanges(rest, nodes) : nodes;

    for (const rem of removes) {
        const id = rem.id;
        const existing = next.find((n: any) => n.id === id);
        // Comparison ghosts are not in loadedIds. If React Flow sends a remove
        // for one, keep it — dropping it here and re-inserting in an effect loops.
        if (existing?.data?.ghost) continue;
        if (!loadedIds.has(id)) {
            next = next.filter((n: any) => n.id !== id);
            continue;
        }
        next = next.map((n: any) => (n.id === id ? markNodeGhost(n) : n));
    }

    return next;
};

/**
 * After React Flow strips edges connected to a node it thinks it deleted, put
 * those edges back (dashed) so a ghost is not left floating. Edges that do not
 * touch a ghosted node are left as the caller passed them — a user deleting a
 * connection between two live nodes is not undone.
 */
export const restoreGhostEdges = (current: any[], previous: any[], ghostedIds: Set<string>): any[] => {
    if (!ghostedIds.size) return current;

    const byId = new Map<string, any>((current ?? []).map((e: any) => [e.id, e]));
    for (const edge of previous ?? []) {
        if (!ghostedIds.has(edge.source) && !ghostedIds.has(edge.target)) continue;
        byId.set(edge.id, { ...edge, animated: false, style: GHOST_EDGE_STYLE });
    }
    return [...byId.values()];
};

/**
 * Fold comparison ghosts into the editor's node state. Session-deleted ghosts
 * (ids that were on the job when it loaded) stay even if the baseline moves;
 * ghosts that only exist to show a saved deletion are added and removed with
 * the baseline. Returns the same array when nothing changed so a useEffect
 * can call this without looping.
 */
export const mergeComparisonGhosts = (nodes: any[], derived: any[], loadedIds: Set<string>): any[] => {
    const derivedIds = new Set(derived.map((g: any) => g.id));
    let changed = false;
    const result: any[] = [];
    const seen = new Set<string>();

    for (const n of nodes) {
        if (!n?.data?.ghost) {
            result.push(n);
            seen.add(n.id);
            continue;
        }
        if (loadedIds.has(n.id) || derivedIds.has(n.id)) {
            result.push(n);
            seen.add(n.id);
            continue;
        }
        changed = true;
    }

    for (const g of derived) {
        if (seen.has(g.id)) continue;
        result.push(g);
        seen.add(g.id);
        changed = true;
    }

    return changed ? result : nodes;
};

/**
 * Nodes the diff baseline had that the canvas no longer does. Built as real
 * React Flow nodes (same id, ghost flag) so the job editor can insert them
 * into node state — passing them only as extras on the `nodes` prop does not
 * stick, which is the same failure session-delete had.
 */
export const deriveGhostNodes = (baselineWorkflows: any[] | undefined, presentNodeIds: Set<string>, services: any[]): any[] => {
    if (!baselineWorkflows?.length) return [];

    return (baselineWorkflows ?? [])
        .flatMap((workflow: any) => workflow?.nodes ?? [])
        .filter((snapshot: any) => snapshot?.id && !presentNodeIds.has(snapshot.id))
        .map((snapshot: any) => {
            const service = services.find((s: any) => s.id === snapshot.serviceId);
            const data = {
                id: snapshot.id,
                label: snapshot.label ?? snapshot.serviceName ?? 'Removed service',
                price: snapshot.price ?? 0,
                description: service?.description ?? '',
                allowedConnections: service?.allowedConnections ?? [],
                icon: service?.icon ?? '',
                parameters: service?.parameters ?? [],
                additionalInstructions: snapshot.additionalInstructions ?? '',
                // The snapshot's own values, not a blank set: a ghost is a record
                // of what was deleted, so it should be able to say what the node
                // was configured with. Ghosts are unselectable today, which is the
                // only reason blanks were survivable.
                formData: mergeSavedFormData(service?.parameters ?? [], snapshot.formData, snapshot.id, service),
                serviceId: snapshot.serviceId,
                ghost: true
            };
            const raw = snapshot.position;
            const position =
                raw && typeof raw.x === 'number' && typeof raw.y === 'number' ? { x: raw.x, y: raw.y } : { x: 0, y: 0 };
            const ghost: any = createNodeObject(snapshot.id, data.label, 'selectorNode', position, data as any);
            ghost.draggable = false;
            ghost.deletable = false;
            ghost.selectable = false;
            return ghost;
        });
};

/** Baseline connections that touched a ghost, so a deleted node is not left floating. */
export const deriveGhostEdges = (baselineWorkflows: any[] | undefined, ghostIds: Set<string>, renderableIds: Set<string>): any[] => {
    if (!ghostIds.size) return [];

    return (baselineWorkflows ?? [])
        .flatMap((workflow: any) => workflow?.edges ?? [])
        .filter((edge: any) => (ghostIds.has(edge?.source) || ghostIds.has(edge?.target)) && renderableIds.has(edge?.source) && renderableIds.has(edge?.target))
        .map((edge: any) => ({
            id: `ghost-${edge.source}->${edge.target}`,
            source: edge.source,
            target: edge.target,
            animated: false,
            style: { stroke: '#9e9e9e', strokeDasharray: '6 4' }
        }));
};

/**
 * Turn the editor's canvas back into `SaveJobWorkflowsInput`.
 *
 * Ghosts — nodes kept on screen to show what was deleted — are dropped here,
 * along with any edge that touched one. Node ids are passed through untouched so
 * the server can reconcile against the live documents rather than rebuild them.
 *
 * A tree is matched to an existing Workflow by the `workflowId` its nodes were
 * hydrated with; the most common one wins, so splitting a tree in two leaves the
 * larger half in place and creates a workflow for the other.
 */
export const buildSaveWorkflowsInput = (nodes: any[], edges: any[]): any[] => {
    const liveNodes = nodes.filter((node) => !node?.data?.ghost);
    const liveIds = new Set(liveNodes.map((node) => node.id));
    const liveEdges = (edges ?? []).filter((edge) => liveIds.has(edge.source) && liveIds.has(edge.target));

    const groups = getWorkflowsFromGraph(liveNodes, liveEdges);

    return groups.map((group: any[]) => {
        const groupIds = new Set(group.map((node) => node.id));

        const counts = new Map<string, number>();
        for (const node of group) {
            const id = node?.data?.workflowId;
            if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
        }
        let workflowId: string | undefined;
        let best = 0;
        for (const [id, count] of counts) {
            if (count > best) {
                best = count;
                workflowId = id;
            }
        }

        return {
            workflowId,
            // Only name a tree we are creating. An existing workflow keeps the
            // name it was submitted with; deriving one from the root node would
            // rename it every time an edit changes which node comes first.
            name: workflowId ? undefined : `Workflow-${group[0]?.id ?? ''}`,
            nodes: group.map((node) => ({
                id: node.id,
                label: node.data?.label ?? '',
                serviceId: node.data?.serviceId,
                formData: (node.data?.formData ?? []).map((param: any) => ({ id: param.id, value: param.value })),
                additionalInstructions: node.data?.additionalInstructions ?? '',
                position: { x: Math.round(node.position?.x ?? 0), y: Math.round(node.position?.y ?? 0) }
            })),
            edges: liveEdges
                .filter((edge: any) => groupIds.has(edge.source) && groupIds.has(edge.target))
                .map((edge: any) => ({ id: String(edge.id), source: edge.source, target: edge.target }))
        };
    });
};
