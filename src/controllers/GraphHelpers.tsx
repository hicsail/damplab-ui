import { createNodeObject, buildNodeParameters } from './ReactFlowEvents';

import { services as legacyServices } from '../data/services';


export const getServiceFromId = (services: any, id: string) => {
    return services.find((service: any) => service.id === id);
}

const getServiceFromLegacyId = (services: any[], legacyId: string) => {
    const legacyService = legacyServices.find((service: any) => service.id === legacyId);
    if (!legacyService) return undefined;
    return services.find((service: any) => service.name === legacyService.name);
};

const resolveServiceRef = (services: any[], ref: any) => {
    if (!ref) return undefined;
    if (typeof ref === 'object') {
        if (ref.id && getServiceFromId(services, ref.id)) return getServiceFromId(services, ref.id);
        if (ref.name) return services.find((service: any) => service.name === ref.name);
        return undefined;
    }
    if (typeof ref !== 'string') return undefined;
    return getServiceFromId(services, ref) ?? getServiceFromLegacyId(services, ref);
};

export const isValidConnection = (services: any, nodes: any, sourceId: any, targetId: any) => {

    // loop over nodes to find source and target
    const sourceNode = nodes.find((node: any) => node.data.id === sourceId);
    const targetNode = nodes.find((node: any) => node.data.id === targetId);

    // get service data from source and target
    const sourceService = getServiceFromId(services, sourceNode?.data.serviceId);
    const targetService = getServiceFromId(services, targetNode?.data.serviceId);
    
    // check if target is in source.allowedConnections when source.allowedConnections contains a list of objects with id and name of services
    if (sourceService?.allowedConnections) {
        const allowed = sourceService.allowedConnections.find((connection: any) => connection.id === targetService?.id);
        if (allowed) {
            return true;
        }
    }
    
    return false;   
}

export const addNodeToCanvasWithEdge = (services: any[], sourceId: string, service: any, setNodes: any, setEdges: any, sourcePosition: any, setActiveComponentId: any) => {
    if (!service) {
        console.warn('Skipping undefined service while adding node to canvas');
        return sourceId;
    }
    
    const position = { x: sourcePosition?.x ?? 0, y: (sourcePosition?.y ?? 0) + 150 };
    const nodeId = Math.random().toString(36).substring(2, 9);  // Sufficient variance?
    const { formData, parameters } = buildNodeParameters(service, nodeId);

    const nodeData = {
        id                    : nodeId,
        label                 : service.name,
        price                 : service.price,
        internalPrice         : service.internalPrice,
        externalPrice         : service.externalPrice,
        externalAcademicPrice : service.externalAcademicPrice,
        externalMarketPrice   : service.externalMarketPrice,
        externalNoSalaryPrice : service.externalNoSalaryPrice,
        pricing               : service.pricing,
        pricingMode           : service.pricingMode,
        description           : service.description,
        allowedConnections    : service.allowedConnections,
        icon                  : service.icon,
        parameters            : parameters,
        additionalInstructions: "",
        formData              : formData,
        serviceId             : service.id,
        paramGroups           : service.paramGroups,
    }
    
    const newNode = createNodeObject(nodeId, service.name, 'selectorNode', position, nodeData);
    
    // create new edge
    if (sourceId !== 'source'){
        const newEdge = {
            id           : Math.random().toString(36).substring(2, 9),
            source       : sourceId,
            target       : nodeId,
            animated     : true,
            arrowHeadType: 'arrowclosed',
            labelStyle   : { fill: '#f6ab6c', fontWeight: 700 },
            style        : { stroke: 'green' },
            //label: 'added w click',
            //type: 'smoothstep',
        };
        setEdges((eds: any) => eds.concat(newEdge));
    }

    setNodes((nds: any) => nds.concat(newNode));
    if (setActiveComponentId) setActiveComponentId(nodeId);

    return nodeId;
}

/**
 * Split the canvas into workflows — one per connected group of nodes.
 *
 * Connectivity is treated as undirected, so a branch, a merge and a diamond
 * each stay a single workflow. (The previous implementation walked forward from
 * every node with an outgoing edge that nobody pointed at, which meant a node
 * with two children was emitted as a root twice and each walk followed only one
 * branch — a branching canvas came out as duplicated, truncated workflows.)
 *
 * Each group is returned root-first: callers name a workflow after element 0
 * (`canvasJobSubmission.ts`) and list nodes in array order, both of which assume
 * the first element is where the tree starts.
 */
export const getWorkflowsFromGraph = (nodes: any, edges: any) => {

    if (!nodes || nodes.length === 0) return [];

    const nodeById = new Map<string, any>(nodes.map((node: any) => [node.id, node]));
    const realEdges = (edges ?? []).filter((edge: any) => nodeById.has(edge.source) && nodeById.has(edge.target));

    // Union-find over the undirected graph.
    const parent = new Map<string, string>(nodes.map((node: any) => [node.id, node.id]));
    const find = (id: string): string => {
        let root = id;
        while (parent.get(root) !== root) root = parent.get(root)!;
        // Path compression, so repeated lookups stay cheap on long chains.
        let cursor = id;
        while (parent.get(cursor) !== root) {
            const next = parent.get(cursor)!;
            parent.set(cursor, root);
            cursor = next;
        }
        return root;
    };
    realEdges.forEach((edge: any) => {
        const a = find(edge.source);
        const b = find(edge.target);
        if (a !== b) parent.set(a, b);
    });

    const groups = new Map<string, any[]>();
    nodes.forEach((node: any) => {
        const root = find(node.id);
        if (!groups.has(root)) groups.set(root, []);
        groups.get(root)!.push(node);
    });

    const childrenOf = new Map<string, string[]>();
    const hasParent = new Set<string>();
    realEdges.forEach((edge: any) => {
        if (!childrenOf.has(edge.source)) childrenOf.set(edge.source, []);
        childrenOf.get(edge.source)!.push(edge.target);
        hasParent.add(edge.target);
    });

    // Breadth-first from the group's roots, so element 0 is a start node and the
    // rest follow in flow order. A cycle (no in-degree-zero node) falls back to
    // the group's first member so it still comes out whole.
    return [...groups.values()].map((group) => {
        const memberIds = new Set(group.map((node: any) => node.id));
        const roots = group.filter((node: any) => !hasParent.has(node.id)).map((node: any) => node.id);
        const queue = roots.length ? [...roots] : [group[0].id];

        const seen = new Set<string>(queue);
        const ordered: any[] = [];
        while (queue.length) {
            const id = queue.shift()!;
            ordered.push(nodeById.get(id));
            for (const child of childrenOf.get(id) ?? []) {
                if (!memberIds.has(child) || seen.has(child)) continue;
                seen.add(child);
                queue.push(child);
            }
        }
        // Anything unreachable from a root (only possible inside a cycle).
        for (const node of group) {
            if (!seen.has(node.id)) ordered.push(node);
        }
        return ordered;
    });
}

export const transformNodesToGQL = (nodes: any) => {

    let gqlNodes: any = [];

    nodes.forEach((node: any) => {
        let gqlNode: any  = {};
        gqlNode           = { ...node.data };
        gqlNode.reactNode = node;
        gqlNode.serviceId = node.data.serviceId  // random value for now 
        // remove fields that are not part of backend's workflownode schema
        delete gqlNode.allowedConnections;
        delete gqlNode.icon;
        delete gqlNode.parameters;
        delete gqlNode.description;
        delete gqlNode.paramGroups;
        delete gqlNode.pricingMode;
        // Backend `AddNodeInput` does not accept pricing breakdown fields on nodes.
        // It computes final node pricing server-side, with optional `price` as a fallback.
        // Editor-only flags set by the job editor (jobGraphHydration / JobEditor).
        // The backend's saveJobWorkflows writes named fields only, so these can
        // never persist — but checkout spreads node.data wholesale, so they are
        // dropped here too rather than being sent and ignored.
        delete gqlNode.workflowId;
        delete gqlNode.nodeState;
        delete gqlNode.locked;
        delete gqlNode.ghost;
        delete gqlNode.diffKind;
        delete gqlNode.internalPrice;
        delete gqlNode.externalPrice;
        delete gqlNode.externalAcademicPrice;
        delete gqlNode.externalMarketPrice;
        delete gqlNode.externalNoSalaryPrice;
        delete gqlNode.pricing;

        gqlNodes.push(gqlNode);
    });

    return gqlNodes;
}

export const transformEdgesToGQL = (edges: any) => {

    let gqlEdges: any = [];

    edges.forEach((edge: any) => {
        let gqlEdge: any  = {};
        gqlEdge.source    = edge.source;
        gqlEdge.target    = edge.target;
        gqlEdge.reactEdge = edge;
        gqlEdge.id        = "hello world" + Math.random() // random value for now 
        gqlEdges.push(gqlEdge);
    });

    return gqlEdges;
}


export const addNodesAndEdgesFromServiceIds = (
    services: any[],
    serviceRefs: any[] | undefined,
    setNodes: any,
    setEdges: any,
    dropPosition?: { x: number; y: number }
) => {
    const inputServiceRefs = serviceRefs ?? [];
    const validServices = inputServiceRefs.map((ref) => {
        const service = resolveServiceRef(services, ref);
        if (!service) {
            const refLabel = typeof ref === 'string' ? ref : ref?.id ?? ref?.name ?? '[unknown]';
            console.warn(`Skipping unknown service id in bundle drop: ${refLabel}`);
        }
        return service;
    }).filter((service): service is any => Boolean(service));

    if (validServices.length === 0) {
        console.warn('No valid services found for bundle/service insertion');
        return;
    }

    // Deliberately not de-duplicated by service id.
    //
    // Repeats used to be collapsed here, so a bundle that ran an operation at two
    // points in its sequence dropped one of them — silently, and after the
    // sequence had already been authored. A bundle is an ordered list of steps
    // now, and two steps naming the same operation mean two nodes.
    let previousNodeId : any = null;
    let baseX = dropPosition?.x ?? 0;
    let baseY = dropPosition?.y ?? 0;

    validServices.forEach((service: any, index: number) => {
        // if index === 0, add node to canvas with edge
        if (index === 0) {
            // calculate random position on canvas
            if (!dropPosition) {
                baseX = Math.floor(Math.random() * 1000);
                baseY = Math.floor(Math.random() * 1);
            }
            const sourcePosition = { x: baseX, y: baseY};
            previousNodeId = addNodeToCanvasWithEdge(services, 'source', service, setNodes, setEdges, sourcePosition, null);
        } else {
            // else, add node to canvas
            const sourcePosition = { x: baseX, y: baseY + (index * 150) };
            previousNodeId = addNodeToCanvasWithEdge(services, previousNodeId, service, setNodes, setEdges, sourcePosition, null);
        }
    });
}

/**
 * Drop a whole bundle onto the canvas as a chain of nodes.
 *
 * Order comes from the stored array, which the backend resolves one entry at a
 * time (`DampLabServices.findByIds`) and therefore keeps in order and with
 * repeats intact. The static `bundles.tsx` list is no longer consulted for it.
 */
export const addNodesAndEdgesFromBundle = (
    bundle: any,
    services: any,
    setNodes: any,
    setEdges: any,
    dropPosition?: { x: number; y: number }
) => {
    if (!Array.isArray(bundle.services) || bundle.services.length === 0) {
        console.warn(`Unable to resolve service ids for bundle "${bundle?.label ?? bundle?.id ?? 'unknown'}"`);
        return;
    }

    addNodesAndEdgesFromServiceIds(services, bundle.services, setNodes, setEdges, dropPosition);
}

export const paramsFilledOnNode = (node: any) : Boolean => {
    // loop over node.formData
    let allFilled = true;
    node.data.formData.forEach((param: any) => {
        if (param.value === null) {
            allFilled = false;
        }
    });

    return allFilled;
}

export const searchForEndService : any = (serviceId : string, endServiceId: string, visited: any[]) => {
    
    const service: any | undefined = legacyServices.find((s: any) => s.id === serviceId);
   
    if (!service) {
        return null;
    }
    if (visited.includes(service)) {
        return null;
    }
    visited.push(service);
  
    if (service.id === endServiceId) {
      return service;
    }
    if (service.allowedConnections) {
        for (const connection of service.allowedConnections) {
        const connectedService = legacyServices.find((s: any) => s.id === connection);
        const result = searchForEndService(connectedService, endServiceId, visited);
        if (result) {
            return result;
        }
        }
    }
  
    return null;
  };

export const transformGQLforDominos = (workflow: any) => {
    let nodes = workflow.nodes.map((node: any) => {
        return {
            id      : node.service.id,
            globalId: node._id,
            name    : node.label,
            state   : node.state,
            // technicianFirst: node.technicianFirst,
            // technicianLast:  node.technicianLast,
            icon: node.service.icon,
        };
    });

    const val: any = {
        id   : workflow.id,
        name : workflow.name,
        state: workflow.state,
        nodes: nodes,
    };

    return val;
};

export const transformGQLToWorkflow = (workflow: any) => {
    
    let nodes = workflow.nodes.map((node: any) => {
        return {
            id         : node._id,
            name       : node.service.name,
            price      : node.price,
            state      : node.state,
            description: node.description,
            data: {
                icon    : node.service.icon,
                formData: node.formData
            },

        }
    });

    let edges = workflow.edges.map((edge: any) => {
        return {
            source: edge.source.id,
            target: edge.target.id
        }
    });

    const val = {
        id   : workflow.id,
        state: workflow.state,
        name : workflow.name,
        nodes: nodes,
        edges: edges
    }

    return val;
}
