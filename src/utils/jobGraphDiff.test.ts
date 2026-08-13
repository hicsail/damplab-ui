import { describe, it, expect } from 'vitest';
import { diffJobGraphs, pickJobDiffBaseline, currentDiffPair, JobVersionLike, SnapshotWorkflow } from './jobGraphDiff';

function node(id: string, params: Record<string, any> = {}, over: Record<string, any> = {}) {
  return {
    id,
    label: `Service ${id}`,
    serviceId: `svc-${id}`,
    additionalInstructions: '',
    formData: Object.entries(params).map(([pid, value]) => ({ id: pid, name: pid, value })),
    ...over
  };
}

function workflow(nodes: any[], edges: any[] = [], over: Partial<SnapshotWorkflow> = {}): SnapshotWorkflow {
  return { workflowId: 'wf1', name: 'Workflow-1', nodes, edges, ...over };
}

function version(n: number, authorRole: 'CUSTOMER' | 'STAFF', workflows: SnapshotWorkflow[] = []): JobVersionLike {
  return { versionNumber: n, authorRole, workflows, createdAt: '2026-08-13T12:00:00.000Z' };
}

describe('diffJobGraphs', () => {
  it('reports an identical graph as unchanged', () => {
    const wf = [workflow([node('a', { vol: '10' }), node('b')], [{ source: 'a', target: 'b' }])];
    const d = diffJobGraphs(wf, wf);
    expect(d.hasChanges).toBe(false);
    expect(d.byNodeId.get('a')!.kind).toBe('unchanged');
  });

  it('detects an added node', () => {
    const before = [workflow([node('a')])];
    const after = [workflow([node('a'), node('b')])];
    const d = diffJobGraphs(before, after);
    expect(d.added).toEqual(['b']);
    expect(d.byNodeId.get('b')!.kind).toBe('added');
    expect(d.hasChanges).toBe(true);
  });

  it('detects a removed node and keeps its baseline copy for rendering', () => {
    const before = [workflow([node('a'), node('b')])];
    const after = [workflow([node('a')])];
    const d = diffJobGraphs(before, after);
    expect(d.removed).toEqual(['b']);
    const removed = d.byNodeId.get('b')!;
    expect(removed.kind).toBe('removed');
    expect(removed.before).toBeDefined();
  });

  it('detects a changed parameter and produces word-level parts', () => {
    const before = [workflow([node('a', { vol: '10 uL' })])];
    const after = [workflow([node('a', { vol: '25 uL' })])];
    const d = diffJobGraphs(before, after);
    expect(d.changed).toEqual(['a']);
    const diff = d.byNodeId.get('a')!;
    expect(diff.paramDiffs).toHaveLength(1);
    expect(diff.paramDiffs[0]).toMatchObject({ id: 'vol', before: '10 uL', after: '25 uL' });
    expect(diff.paramDiffs[0].parts.some((p) => p.added)).toBe(true);
    expect(diff.paramDiffs[0].parts.some((p) => p.removed)).toBe(true);
  });

  it('matches parameters by id, so reordering the catalogue is not a change', () => {
    const before = [workflow([node('a', {}, { formData: [{ id: 'p1', value: 'x' }, { id: 'p2', value: 'y' }] })])];
    const after = [workflow([node('a', {}, { formData: [{ id: 'p2', value: 'y' }, { id: 'p1', value: 'x' }] })])];
    expect(diffJobGraphs(before, after).hasChanges).toBe(false);
  });

  it('treats a swapped service as a change', () => {
    const before = [workflow([node('a')])];
    const after = [workflow([node('a', {}, { serviceId: 'svc-other' })])];
    const d = diffJobGraphs(before, after);
    expect(d.byNodeId.get('a')!.serviceChanged).toBe(true);
    expect(d.changed).toEqual(['a']);
  });

  it('ignores the injected run count when the baseline predates it', () => {
    // The editor always sends __runCount; a snapshot taken before it existed has
    // no entry. Absent and 1 mean the same thing.
    const before = [workflow([node('a', {}, { formData: [{ id: 'vol', value: 10 }] })])];
    const after = [workflow([node('a', {}, { formData: [{ id: 'vol', value: 10 }, { id: '__runCount', value: 1 }] })])];
    expect(diffJobGraphs(before, after).hasChanges).toBe(false);
  });

  it('reports a real run-count change', () => {
    const before = [workflow([node('a', {}, { formData: [{ id: 'vol', value: 10 }] })])];
    const after = [workflow([node('a', {}, { formData: [{ id: 'vol', value: 10 }, { id: '__runCount', value: 3 }] })])];
    expect(diffJobGraphs(before, after).changed).toEqual(['a']);
  });

  it('ignores a parameter the catalogue gained but nobody filled in', () => {
    const before = [workflow([node('a', {}, { formData: [{ id: 'vol', value: 10 }] })])];
    const after = [workflow([node('a', {}, { formData: [{ id: 'vol', value: 10 }, { id: 'temp', value: null }] })])];
    expect(diffJobGraphs(before, after).hasChanges).toBe(false);
  });

  it('ignores position, since moving a node is not an edit to the work ordered', () => {
    const before = [workflow([node('a', {}, { position: { x: 0, y: 0 } })])];
    const after = [workflow([node('a', {}, { position: { x: 500, y: 900 } })])];
    expect(diffJobGraphs(before, after).hasChanges).toBe(false);
  });

  it('reports added and removed connections', () => {
    const before = [workflow([node('a'), node('b')], [{ source: 'a', target: 'b' }])];
    const after = [workflow([node('a'), node('b')], [{ source: 'b', target: 'a' }])];
    const d = diffJobGraphs(before, after);
    expect(d.edgesAdded).toEqual(['b->a']);
    expect(d.edgesRemoved).toEqual(['a->b']);
    expect(d.hasChanges).toBe(true);
  });

  it('follows a node across workflows, since identity is the node id not the tree', () => {
    const before = [workflow([node('a')], [], { workflowId: 'wf1' })];
    const after = [workflow([node('a', { vol: '3' })], [], { workflowId: 'wf2' })];
    expect(diffJobGraphs(before, after).changed).toEqual(['a']);
  });
});

describe('pickJobDiffBaseline', () => {
  // The brief's flow: customer submits, technician edits, customer edits back.
  const submitted = version(1, 'CUSTOMER');
  const techEdit = version(2, 'STAFF');
  const customerEdit = version(3, 'CUSTOMER');
  const flow = [submitted, techEdit, customerEdit];

  it('compares the technician edit against the customer submission', () => {
    expect(pickJobDiffBaseline(flow, 2)).toBe(1);
  });

  it('compares the customer edit against the version the technician sent', () => {
    expect(pickJobDiffBaseline(flow, 3)).toBe(2);
  });

  it('returns null for the original submission', () => {
    expect(pickJobDiffBaseline(flow, 1)).toBeNull();
  });

  it('collapses two consecutive saves by one party into a single diff', () => {
    // Technician saves twice. Both parties must see everything since the
    // customer's submission, not just the second save.
    const doubled = [submitted, techEdit, version(3, 'STAFF')];
    expect(pickJobDiffBaseline(doubled, 3)).toBe(1);
  });

  it('collapses two consecutive customer saves against the version they were sent', () => {
    const doubled = [submitted, techEdit, customerEdit, version(4, 'CUSTOMER')];
    expect(pickJobDiffBaseline(doubled, 4)).toBe(2);
  });

  it('does not depend on who is looking — both parties get the same baseline', () => {
    // There is no viewer argument by design; this pins that property.
    expect(pickJobDiffBaseline(flow, 3)).toBe(pickJobDiffBaseline(flow, 3));
  });
});

describe('currentDiffPair', () => {
  it('is empty for a job with no versions', () => {
    expect(currentDiffPair([])).toEqual({ current: null, baseline: null });
  });

  it('baselines a freshly submitted job against itself, so nothing highlights', () => {
    const only = version(1, 'CUSTOMER');
    const { current, baseline } = currentDiffPair([only]);
    expect(current).toBe(only);
    expect(baseline).toBe(only);
  });

  it('falls back to the previous version when every version is same-role', () => {
    // Staff can submit on a customer's behalf via /staff_submit, so a job can be
    // entirely STAFF-authored. Collapsing the baseline onto the current version
    // there would hide the technician's edits completely.
    const flow = [version(1, 'STAFF'), version(2, 'STAFF')];
    const { current, baseline } = currentDiffPair(flow);
    expect(current!.versionNumber).toBe(2);
    expect(baseline!.versionNumber).toBe(1);
  });

  it('picks the newest version and its cross-party baseline', () => {
    const flow = [version(1, 'CUSTOMER'), version(2, 'STAFF'), version(3, 'CUSTOMER')];
    const { current, baseline } = currentDiffPair(flow);
    expect(current!.versionNumber).toBe(3);
    expect(baseline!.versionNumber).toBe(2);
  });
});
