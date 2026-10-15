import { describe, expect, it } from 'vitest';
import { addNodeToCanvasWithEdge } from './GraphHelpers';

/** The sidebar's "Suggested before" buttons add the operation above the selected node, linked into it. */
describe('addNodeToCanvasWithEdge — placing a node before another', () => {
  const service = { id: 'svc-pcr', name: 'PCR', parameters: [], allowedConnections: [] };
  const run = (placeBefore?: boolean) => {
    let nodes: any[] = [];
    let edges: any[] = [];
    const setNodes = (f: (n: any[]) => any[]) => (nodes = f(nodes));
    const setEdges = (f: (e: any[]) => any[]) => (edges = f(edges));
    const id = addNodeToCanvasWithEdge([], 'gel-node', service, setNodes, setEdges, { x: 10, y: 300 }, null, placeBefore);
    return { id, node: nodes[0], edge: edges[0] };
  };

  it('after (the default): below the node, with an edge from it', () => {
    const { id, node, edge } = run();
    expect(node.position).toEqual({ x: 10, y: 450 });
    expect(edge).toMatchObject({ source: 'gel-node', target: id });
  });

  it('before: above the node, with an edge into it', () => {
    const { id, node, edge } = run(true);
    expect(node.position).toEqual({ x: 10, y: 150 });
    expect(edge).toMatchObject({ source: id, target: 'gel-node' });
  });
});
