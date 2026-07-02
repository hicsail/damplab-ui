import { generateFormDataFromParams, createNodeObject } from './ReactFlowEvents';

/**
 * Lean workflow spec the n8n agent returns. Node entries reference a catalog
 * serviceId and a parameters map (paramId -> value); edges use 0-based indices
 * into the nodes array. We hydrate against the live service catalog so the
 * agent never supplies node visuals/pricing/parameter schemas — only choices.
 */
export interface AgentWorkflowSpec {
  nodes: Array<{ serviceId: string; serviceName?: string; parameters?: Record<string, any> }>;
  edges: Array<{ from: number; to: number }>;
}

export interface HydratedWorkflow {
  nodes: any[];
  edges: any[];
  /** serviceIds the agent referenced that aren't in the catalog (skipped). */
  missingServiceIds: string[];
}

/**
 * Turn an agent workflow spec into React Flow nodes + edges, mirroring the
 * node-build path used by the drag-and-drop and resubmission flows. Positions
 * are a simple vertical stack (fitView frames them). Edges only connect nodes
 * that were actually created.
 */
export function hydrateAgentWorkflow(spec: AgentWorkflowSpec, services: any[]): HydratedWorkflow {
  const specNodes = Array.isArray(spec?.nodes) ? spec.nodes : [];
  const specEdges = Array.isArray(spec?.edges) ? spec.edges : [];
  const byId = new Map(services.map((s: any) => [String(s.id), s]));
  // Name fallback: the agent now reads services from Mongo and returns the _id
  // as serviceId. If an id ever doesn't line up (format drift), fall back to a
  // case-insensitive name match so the workflow still renders.
  const byName = new Map(services.map((s: any) => [String(s.name || '').trim().toLowerCase(), s]));

  const createdIds: Array<string | null> = [];
  const nodes: any[] = [];
  const missingServiceIds: string[] = [];

  specNodes.forEach((sn, index) => {
    const service =
      byId.get(String(sn.serviceId)) ||
      (sn.serviceName ? byName.get(String(sn.serviceName).trim().toLowerCase()) : undefined);
    if (!service) {
      createdIds.push(null); // keep index alignment for edges
      if (sn.serviceId || sn.serviceName) missingServiceIds.push(String(sn.serviceName || sn.serviceId));
      return;
    }
    const nodeId = Math.random().toString(36).substring(2, 9);
    const formData = generateFormDataFromParams(service.parameters || [], nodeId);

    // Overlay the agent-provided parameter values (matched by parameter id).
    const provided = sn.parameters || {};
    formData.forEach((fd: any) => {
      if (Object.prototype.hasOwnProperty.call(provided, fd.id)) {
        const v = provided[fd.id];
        fd.value = fd.allowMultipleValues && !Array.isArray(v) ? [v] : v;
      }
    });

    const data = {
      id: nodeId,
      label: service.name,
      price: service.price ?? null,
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
      additionalInstructions: '',
      formData,
      serviceId: String(service.id),
      paramGroups: service.paramGroups
    };

    const position = { x: 400, y: 60 + index * 170 };
    nodes.push(createNodeObject(nodeId, service.name, 'selectorNode', position, data));
    createdIds.push(nodeId);
  });

  const mkEdge = (sourceId: string, targetId: string) => ({
    id: Math.random().toString(36).substring(2, 9),
    source: sourceId,
    target: targetId,
    animated: true,
    arrowHeadType: 'arrowclosed',
    labelStyle: { fill: '#f6ab6c', fontWeight: 700 },
    style: { stroke: 'green' }
  });

  const edges: any[] = [];
  const seen = new Set<string>();
  specEdges.forEach((e) => {
    const sourceId = createdIds[e?.from];
    const targetId = createdIds[e?.to];
    if (!sourceId || !targetId || sourceId === targetId) return;
    const key = `${sourceId}->${targetId}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push(mkEdge(sourceId, targetId));
  });

  // Fallback: if the agent produced 2+ nodes but no usable edges, wire them
  // into a linear pipeline in the order given. The user describes sequential
  // steps ("X then Y then Z"), so a connected chain is the expected result
  // even when the catalog's allowedConnections wouldn't permit the link.
  if (edges.length === 0) {
    const ordered = createdIds.filter((id): id is string => !!id);
    for (let i = 0; i < ordered.length - 1; i++) {
      edges.push(mkEdge(ordered[i], ordered[i + 1]));
    }
  }

  return { nodes, edges, missingServiceIds };
}
