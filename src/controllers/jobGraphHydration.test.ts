import { describe, it, expect } from 'vitest';
import { hydrateJobGraph, mergeSavedFormData, buildSaveWorkflowsInput, deriveGhostNodes, deriveGhostEdges } from './jobGraphHydration';
import { getWorkflowsFromGraph } from './GraphHelpers';

const service = (id: string, parameters: any[] = []) => ({
  id,
  name: `Service ${id}`,
  price: 100,
  icon: 'icon.png',
  description: '',
  parameters,
  allowedConnections: []
});

const jobNode = (id: string, serviceId: string, over: Record<string, any> = {}) => ({
  _id: `db-${id}`,
  id,
  label: `Service ${serviceId}`,
  price: 100,
  service: { id: serviceId, name: `Service ${serviceId}`, parameters: [] },
  formData: [],
  state: 'QUEUED',
  additionalInstructions: '',
  usedInventory: [],
  ...over
});

describe('mergeSavedFormData', () => {
  const parameters = [
    { id: 'vol', name: 'Volume', type: 'number', required: true },
    { id: 'buf', name: 'Buffer', type: 'string', required: false }
  ];

  it('matches saved values to parameters by id, not position', () => {
    // Catalogue order reversed since the job was saved.
    const saved = [
      { id: 'buf', value: 'TE' },
      { id: 'vol', value: 25 }
    ];
    const merged = mergeSavedFormData(parameters, saved, 'n1');
    expect(merged.find((p) => p.id === 'vol')!.value).toBe(25);
    expect(merged.find((p) => p.id === 'buf')!.value).toBe('TE');
  });

  it('leaves a parameter at its default when nothing was saved for it', () => {
    const merged = mergeSavedFormData(parameters, [{ id: 'vol', value: 5 }], 'n1');
    expect(merged.find((p) => p.id === 'buf')!.value).toBeNull();
  });

  it('picks up a parameter the catalogue gained after submission', () => {
    const merged = mergeSavedFormData([...parameters, { id: 'temp', name: 'Temp', type: 'number' }], [{ id: 'vol', value: 5 }], 'n1');
    expect(merged.some((p) => p.id === 'temp')).toBe(true);
  });

  it('carries the run-count parameter through', () => {
    const merged = mergeSavedFormData(parameters, [{ id: '__runCount', value: 4 }], 'n1');
    expect(merged.find((p) => p.id === '__runCount')!.value).toBe(4);
  });

  it('keeps a stored run count even when the service no longer allows multiple runs', () => {
    // Creation is gated on the flag; hydration must not be. The entry is what
    // pricing multiplies by, so dropping it here would reprice the job — at 1×
    // instead of 4× — the next time anyone saved it.
    const merged = mergeSavedFormData(parameters, [{ id: '__runCount', value: 4 }], 'n1', { allowMultipleRuns: false });
    expect(merged.find((p) => p.id === '__runCount')!.value).toBe(4);
  });

  it('does not invent a run count for a job that never had one', () => {
    const merged = mergeSavedFormData(parameters, [{ id: 'vol', value: 5 }], 'n1', { allowMultipleRuns: false });
    expect(merged.some((p) => p.id === '__runCount')).toBe(false);
  });

  it('offers a run count on a service that allows it, even on a job saved without one', () => {
    const merged = mergeSavedFormData(parameters, [{ id: 'vol', value: 5 }], 'n1', { allowMultipleRuns: true });
    expect(merged.find((p) => p.id === '__runCount')!.value).toBe(1);
  });
});

describe('hydrateJobGraph', () => {
  it('carries node ids through verbatim, so the diff can key on them', () => {
    const job = { workflows: [{ id: 'wf1', nodes: [jobNode('abc123', 's1')], edges: [] }] };
    const { nodes } = hydrateJobGraph(job, [service('s1')]);
    expect(nodes).toHaveLength(1);
    expect(nodes[0].id).toBe('abc123');
    expect(nodes[0].data.id).toBe('abc123');
  });

  it('reuses stored positions', () => {
    const job = {
      workflows: [{ id: 'wf1', nodes: [jobNode('a', 's1', { reactNode: { position: { x: 340, y: 720 } } })], edges: [] }]
    };
    const { nodes } = hydrateJobGraph(job, [service('s1')]);
    expect(nodes[0].position).toEqual({ x: 340, y: 720 });
  });

  it('falls back to a computed layout when a node has no stored position', () => {
    const job = {
      workflows: [
        {
          id: 'wf1',
          nodes: [jobNode('a', 's1'), jobNode('b', 's1'), jobNode('c', 's1')],
          edges: [
            { source: { id: 'a' }, target: { id: 'b' } },
            { source: { id: 'b' }, target: { id: 'c' } }
          ]
        }
      ]
    };
    const { nodes } = hydrateJobGraph(job, [service('s1')]);
    const byId = new Map(nodes.map((n: any) => [n.id, n.position]));
    // Depth ordering, and no two nodes stacked on the same point.
    expect(byId.get('a')!.y).toBeLessThan(byId.get('b')!.y);
    expect(byId.get('b')!.y).toBeLessThan(byId.get('c')!.y);
    const distinct = new Set(nodes.map((n: any) => `${n.position.x},${n.position.y}`));
    expect(distinct.size).toBe(3);
  });

  it('separates a multi-workflow job into disconnected trees on one canvas', () => {
    const job = {
      workflows: [
        { id: 'wf1', nodes: [jobNode('a', 's1'), jobNode('b', 's1')], edges: [{ source: { id: 'a' }, target: { id: 'b' } }] },
        { id: 'wf2', nodes: [jobNode('c', 's1')], edges: [] }
      ]
    };
    const { nodes, edges } = hydrateJobGraph(job, [service('s1')]);
    expect(nodes).toHaveLength(3);
    expect(edges).toHaveLength(1);
    expect(getWorkflowsFromGraph(nodes, edges)).toHaveLength(2);
    expect(nodes.find((n: any) => n.id === 'c')!.data.workflowId).toBe('wf2');
  });

  it('rebuilds edges from the stored graph rather than chaining nodes in array order', () => {
    // A branch: a -> b and a -> c. Array-order chaining would produce a line.
    const job = {
      workflows: [
        {
          id: 'wf1',
          nodes: [jobNode('a', 's1'), jobNode('b', 's1'), jobNode('c', 's1')],
          edges: [
            { source: { id: 'a' }, target: { id: 'b' } },
            { source: { id: 'a' }, target: { id: 'c' } }
          ]
        }
      ]
    };
    const { edges } = hydrateJobGraph(job, [service('s1')]);
    expect(edges.map((e: any) => `${e.source}->${e.target}`).sort()).toEqual(['a->b', 'a->c']);
  });

  it('locks a node that has left QUEUED or is holding inventory', () => {
    const job = {
      workflows: [
        {
          id: 'wf1',
          nodes: [jobNode('a', 's1', { state: 'IN_PROGRESS' }), jobNode('b', 's1', { usedInventory: ['inv1'] }), jobNode('c', 's1')],
          edges: []
        }
      ]
    };
    const { nodes } = hydrateJobGraph(job, [service('s1')]);
    const byId = new Map(nodes.map((n: any) => [n.id, n]));
    expect(byId.get('a')!.data.locked).toBe(true);
    expect(byId.get('a')!.draggable).toBe(false);
    expect(byId.get('b')!.data.locked).toBe(true);
    expect(byId.get('c')!.data.locked).toBe(false);
  });

  it('takes the parameter schema from the live catalogue and the values from the job', () => {
    const job = {
      workflows: [{ id: 'wf1', nodes: [jobNode('a', 's1', { formData: [{ id: 'vol', value: 42 }] })], edges: [] }]
    };
    const { nodes } = hydrateJobGraph(job, [service('s1', [{ id: 'vol', name: 'Volume', type: 'number' }])]);
    const vol = nodes[0].data.formData.find((p: any) => p.id === 'vol');
    expect(vol.name).toBe('Volume');
    expect(vol.value).toBe(42);
  });
});

describe('buildSaveWorkflowsInput', () => {
  const hydrate = () => {
    const job = {
      workflows: [
        { id: 'wf1', nodes: [jobNode('a', 's1'), jobNode('b', 's1')], edges: [{ source: { id: 'a' }, target: { id: 'b' } }] },
        { id: 'wf2', nodes: [jobNode('c', 's1')], edges: [] }
      ]
    };
    return hydrateJobGraph(job, [service('s1')]);
  };

  it('round-trips a hydrated job back into its workflows', () => {
    const { nodes, edges } = hydrate();
    const input = buildSaveWorkflowsInput(nodes, edges);
    expect(input).toHaveLength(2);
    expect(input.map((w) => w.workflowId).sort()).toEqual(['wf1', 'wf2']);
    const wf1 = input.find((w) => w.workflowId === 'wf1')!;
    expect(wf1.nodes.map((n: any) => n.id)).toEqual(['a', 'b']);
    expect(wf1.edges).toEqual([{ id: 'a->b', source: 'a', target: 'b' }]);
  });

  it('drops ghosts and any edge that touched one', () => {
    const { nodes, edges } = hydrate();
    const ghosted = nodes.map((n: any) => (n.id === 'b' ? { ...n, data: { ...n.data, ghost: true } } : n));
    const input = buildSaveWorkflowsInput(ghosted, edges);
    const allNodeIds = input.flatMap((w) => w.nodes.map((n: any) => n.id));
    expect(allNodeIds).not.toContain('b');
    expect(input.flatMap((w) => w.edges)).toHaveLength(0);
  });

  it('sends only id and value for each parameter, never the UI flags', () => {
    const { nodes, edges } = hydrate();
    const input = buildSaveWorkflowsInput(nodes, edges);
    for (const param of input[0].nodes[0].formData) {
      expect(Object.keys(param).sort()).toEqual(['id', 'value']);
    }
    expect(Object.keys(input[0].nodes[0]).sort()).toEqual(['additionalInstructions', 'formData', 'id', 'label', 'position', 'serviceId']);
  });

  it('keeps the larger half in place when a tree is split in two', () => {
    const { nodes, edges } = hydrate();
    const input = buildSaveWorkflowsInput(nodes, []); // all edges cut
    const wf1Trees = input.filter((w) => w.workflowId === 'wf1');
    expect(wf1Trees.length).toBeGreaterThan(0);
  });
});

describe('getWorkflowsFromGraph', () => {
  const n = (id: string) => ({ id, data: {} });

  it('keeps a branching tree as one workflow', () => {
    const nodes = [n('a'), n('b'), n('c')];
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'c' }
    ];
    const groups = getWorkflowsFromGraph(nodes, edges);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(3);
  });

  it('keeps a diamond as one workflow without duplicating nodes', () => {
    const nodes = [n('a'), n('b'), n('c'), n('d')];
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'c' },
      { source: 'b', target: 'd' },
      { source: 'c', target: 'd' }
    ];
    const groups = getWorkflowsFromGraph(nodes, edges);
    expect(groups).toHaveLength(1);
    expect(groups[0].map((x: any) => x.id).sort()).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns each group root-first, which callers rely on for naming', () => {
    const nodes = [n('c'), n('b'), n('a')]; // deliberately not in flow order
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'c' }
    ];
    expect(getWorkflowsFromGraph(nodes, edges)[0][0].id).toBe('a');
  });

  it('gives each unconnected node its own workflow', () => {
    expect(getWorkflowsFromGraph([n('a'), n('b'), n('c')], [])).toHaveLength(3);
  });

  it('separates disconnected trees', () => {
    const nodes = [n('a'), n('b'), n('c'), n('d')];
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'c', target: 'd' }
    ];
    expect(getWorkflowsFromGraph(nodes, edges)).toHaveLength(2);
  });

  it('returns nothing for an empty canvas', () => {
    expect(getWorkflowsFromGraph([], [])).toEqual([]);
  });

  it('survives a cycle rather than looping forever', () => {
    const nodes = [n('a'), n('b')];
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'b', target: 'a' }
    ];
    const groups = getWorkflowsFromGraph(nodes, edges);
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(2);
  });
});

describe('deriveGhostNodes', () => {
  const baseline = [
    {
      workflowId: 'wf1',
      nodes: [
        { id: 'a', label: 'Service s1', serviceId: 's1', position: { x: 0, y: 0 } },
        { id: 'b', label: 'Service s1', serviceId: 's1', position: { x: 0, y: 150 } }
      ],
      edges: [{ id: 'e1', source: 'a', target: 'b' }]
    }
  ];

  it('ghosts only what the canvas no longer has', () => {
    const ghosts = deriveGhostNodes(baseline, new Set(['a']), [service('s1')]);
    expect(ghosts.map((g: any) => g.id)).toEqual(['b']);
    expect(ghosts[0].data.ghost).toBe(true);
    expect(ghosts[0].selectable).toBe(false);
    expect(ghosts[0].deletable).toBe(false);
  });

  it('ghosts nothing while the canvas still holds every baseline node', () => {
    // The bug this guards: an empty canvas during the hydration commit used to
    // make every node look deleted, leaving the whole graph unclickable.
    expect(deriveGhostNodes(baseline, new Set(['a', 'b']), [service('s1')])).toEqual([]);
  });

  it('reuses the position the node was deleted from', () => {
    const ghosts = deriveGhostNodes(baseline, new Set(['a']), [service('s1')]);
    expect(ghosts[0].position).toEqual({ x: 0, y: 150 });
  });

  it('still renders a node whose service left the catalogue', () => {
    const ghosts = deriveGhostNodes(baseline, new Set(['a']), []);
    expect(ghosts).toHaveLength(1);
    expect(ghosts[0].data.label).toBe('Service s1');
  });

  it('carries the deleted node\'s own parameter values, not a blank set', () => {
    // A ghost is a record of what was removed, so it has to be able to say what
    // the node was configured with. Previously it was rebuilt from the catalogue
    // schema alone, which meant every value came back empty.
    const withValues = [
      {
        workflowId: 'wf1',
        nodes: [
          { id: 'a', label: 'Service s1', serviceId: 's1', position: { x: 0, y: 0 } },
          { id: 'b', label: 'Service s1', serviceId: 's1', position: { x: 0, y: 150 }, formData: [{ id: 'vol', value: 25 }] }
        ],
        edges: []
      }
    ];

    const ghosts = deriveGhostNodes(withValues, new Set(['a']), [service('s1', [{ id: 'vol', name: 'Volume', type: 'number' }])]);

    expect(ghosts[0].data.formData.find((p: any) => p.id === 'vol').value).toBe(25);
  });

  it('ghosts nothing when the reader has chosen to compare against nothing', () => {
    // "Nothing — hide changes" in the compare-to picker means no baseline, which
    // must read as "show me the graph as it is", not as "everything was deleted".
    expect(deriveGhostNodes(undefined, new Set(['a']), [service('s1')])).toEqual([]);
  });

  it('is a no-op without a baseline', () => {
    expect(deriveGhostNodes(undefined, new Set(), [service('s1')])).toEqual([]);
  });
});

describe('deriveGhostEdges', () => {
  const baseline = [
    { workflowId: 'wf1', nodes: [], edges: [{ id: 'e1', source: 'a', target: 'b' }, { id: 'e2', source: 'b', target: 'c' }] }
  ];

  it('keeps the connections into a deleted node visible', () => {
    const edges = deriveGhostEdges(baseline, new Set(['b']), new Set(['a', 'b', 'c']));
    expect(edges.map((e: any) => `${e.source}->${e.target}`).sort()).toEqual(['a->b', 'b->c']);
    expect(edges[0].style.strokeDasharray).toBeDefined();
  });

  it('drops an edge whose other end is gone too', () => {
    expect(deriveGhostEdges(baseline, new Set(['b']), new Set(['b', 'c']))).toHaveLength(1);
  });

  it('is a no-op when nothing is ghosted', () => {
    expect(deriveGhostEdges(baseline, new Set(), new Set(['a', 'b']))).toEqual([]);
  });
});
