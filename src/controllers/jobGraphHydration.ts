import { generateFormDataFromParams, createNodeObject } from './ReactFlowEvents';
import { getWorkflowsFromGraph } from './GraphHelpers';
import { NodeParameter } from '../types/CanvasTypes';

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
export const mergeSavedFormData = (parameters: any[], savedFormData: any, nodeId: string): NodeParameter[] => {
    const fresh = generateFormDataFromParams(parameters ?? [], nodeId);

    const savedList = Array.isArray(savedFormData) ? savedFormData : [];
    const savedById = new Map<string, any>(
        savedList.filter((entry: any) => entry && typeof entry.id === 'string').map((entry: any) => [entry.id, entry.value])
    );

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

            const formData = mergeSavedFormData(service.parameters ?? [], node.formData, node.id);
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
                parameters: service.parameters,
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
 * Nodes the diff baseline had that the canvas no longer does, rendered as
 * ghosts so a deletion stays visible instead of silently vanishing.
 *
 * Deliberately *derived* from the canvas rather than stored in it. An earlier
 * version appended ghosts to node state from an effect, which raced with
 * hydration: on the mount commit `nodes` is still empty, so every baseline node
 * looked missing and the whole graph was ghosted — unclickable, and duplicated
 * against the real nodes. Deriving makes that unrepresentable.
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
                formData: generateFormDataFromParams(service?.parameters ?? [], snapshot.id),
                serviceId: snapshot.serviceId,
                ghost: true
            };
            const ghost: any = createNodeObject(snapshot.id, data.label, 'selectorNode', snapshot.position ?? { x: 0, y: 0 }, data as any);
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
