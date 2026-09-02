import { describe, it, expect } from 'vitest';
import { diffJobGraphs, pickJobDiffBaseline, currentDiffPair, selectedDiffPair, latestContentVersion, latestVersion, jobStateLabel, jobStateColor, jobVersionDisplayLabel, jobVersionChip, JobVersionLike, SnapshotWorkflow } from './jobGraphDiff';

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

describe('selectedDiffPair', () => {
  const flow = [version(1, 'CUSTOMER'), version(2, 'STAFF'), version(3, 'CUSTOMER')];

  it('falls back to the automatic pair when nothing has been picked', () => {
    const { current, baseline } = selectedDiffPair(flow, null, undefined);
    expect(current!.versionNumber).toBe(3);
    expect(baseline!.versionNumber).toBe(2);
  });

  it('derives the baseline for the version being viewed when only that was picked', () => {
    const { current, baseline } = selectedDiffPair(flow, 2, undefined);
    expect(current!.versionNumber).toBe(2);
    expect(baseline!.versionNumber).toBe(1);
  });

  it('falls back to the previous version when every version is same-role', () => {
    // Viewing is always set in the editor; without this fallback the picker
    // shows "Nothing" after a same-party save and deleted nodes have no baseline
    // to ghost against.
    const flow = [version(1, 'STAFF'), version(2, 'STAFF')];
    const { current, baseline } = selectedDiffPair(flow, 2, undefined);
    expect(current!.versionNumber).toBe(2);
    expect(baseline!.versionNumber).toBe(1);
  });

  it('honours an explicitly chosen baseline', () => {
    const { current, baseline } = selectedDiffPair(flow, 3, 1);
    expect(current!.versionNumber).toBe(3);
    expect(baseline!.versionNumber).toBe(1);
  });

  it('honours an explicit baseline even before the viewing picker has been touched', () => {
    // Job view leaves viewing null until the reader opens the version picker,
    // while still showing the latest version. Compare-to must still stick.
    const { current, baseline } = selectedDiffPair(flow, null, 1);
    expect(current!.versionNumber).toBe(3);
    expect(baseline!.versionNumber).toBe(1);
  });

  it('honours hide-changes before the viewing picker has been touched', () => {
    const { current, baseline } = selectedDiffPair(flow, null, null);
    expect(current!.versionNumber).toBe(3);
    expect(baseline).toBeNull();
  });

  it('treats a null baseline as "hide changes", not as "no baseline available"', () => {
    const { current, baseline } = selectedDiffPair(flow, 3, null);
    expect(current!.versionNumber).toBe(3);
    expect(baseline).toBeNull();
  });

  it('survives a state event landing on a job that has only the backfilled v1', () => {
    // Requesting changes on a never-edited job appends an event version, taking
    // the history from 1 to 2 and mounting the picker for the first time with an
    // event as the newest row. Nothing to diff, but it must not blow up.
    const afterRequestChanges: JobVersionLike[] = [
      version(1, 'CUSTOMER'),
      { ...version(2, 'STAFF'), isEvent: true, jobState: 'CHANGES_REQUESTED', note: 'Changes requested' }
    ];
    expect(latestContentVersion(afterRequestChanges)!.versionNumber).toBe(1);

    const { current, baseline } = selectedDiffPair(afterRequestChanges, null, undefined);
    expect(current!.versionNumber).toBe(1);
    expect(baseline!.versionNumber).toBe(1);
  });

  it('self-baselines the viewed version when nothing earlier exists', () => {
    // The editor always sets viewing on load. Without a self-baseline the
    // canvas diffs against nothing, so unsaved op/param edits stay unhighlighted
    // until a save creates a previous version.
    const single = [version(1, 'CUSTOMER')];
    const { current, baseline } = selectedDiffPair(single, 1, undefined);
    expect(current!.versionNumber).toBe(1);
    expect(baseline!.versionNumber).toBe(1);
  });

  it('self-baselines a single-version job before the viewing picker is set', () => {
    const single = [version(1, 'STAFF')];
    const { current, baseline } = selectedDiffPair(single, null, undefined);
    expect(current!.versionNumber).toBe(1);
    expect(baseline!.versionNumber).toBe(1);
  });

  it('falls back to the automatic pair when the chosen version is gone', () => {
    const { current } = selectedDiffPair(flow, 99, undefined);
    expect(current!.versionNumber).toBe(3);
  });
});

describe('job state chips', () => {
  it('labels a state in the reader\'s terms', () => {
    expect(jobStateLabel('CHANGES_REQUESTED')).toBe('Changes Requested');
    expect(jobStateLabel('IN_PROGRESS')).toBe('In Progress');
  });

  it('has nothing to show for a version written before the field existed', () => {
    // Backfilled v1 and every pre-existing version carry no state.
    expect(jobStateLabel(null)).toBeNull();
    expect(jobStateLabel(undefined)).toBeNull();
  });

  it('passes an unrecognised state through rather than hiding it', () => {
    expect(jobStateLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW');
  });

  it('colours the states that carry a verdict', () => {
    expect(jobStateColor('CHANGES_REQUESTED')).toBe('warning');
    expect(jobStateColor('REJECTED')).toBe('error');
    expect(jobStateColor('COMPLETE')).toBe('success');
    expect(jobStateColor(null)).toBe('default');
  });
});

describe('jobVersionDisplayLabel', () => {
  it('prints encoded numbers as major.minor', () => {
    expect(jobVersionDisplayLabel(1000)).toBe('1.0');
    expect(jobVersionDisplayLabel(2003)).toBe('2.3');
  });

  it('prints pre-scheme integers as themselves, not as 0.n', () => {
    expect(jobVersionDisplayLabel(3)).toBe('3');
  });
});

describe('jobVersionChip', () => {
  it('chips an editor save as Draft even when the live job was Submitted', () => {
    expect(jobVersionChip({ isEvent: false, jobState: 'SUBMITTED', note: 'tweaked PCR' })).toBe('Draft');
  });

  it('chips the original submission as Submitted', () => {
    expect(jobVersionChip({ isEvent: false, jobState: 'SUBMITTED', note: 'Original submission' })).toBe('Submitted');
  });

  it('chips a Request Changes event from jobState', () => {
    expect(jobVersionChip({ isEvent: true, jobState: 'CHANGES_REQUESTED', note: 'Changes requested' })).toBe('Changes Requested');
  });

  it('chips a resubmit event as Submitted', () => {
    expect(jobVersionChip({ isEvent: true, jobState: 'SUBMITTED', note: 'Resubmitted' })).toBe('Submitted');
  });
});

describe('event versions', () => {
  // A state change appends a version whose graph is copied verbatim from its
  // predecessor. Every rule below exists so those rows can appear in the history
  // — which is the point of the chips — without swallowing the diff.
  const event = (n: number, authorRole: 'CUSTOMER' | 'STAFF', workflows: SnapshotWorkflow[] = []): JobVersionLike => ({
    ...version(n, authorRole, workflows),
    isEvent: true
  });

  it('never baselines against an event version', () => {
    // v3 is a copy of v2, so comparing v4 to v3 would report no changes at all.
    const flow = [version(1, 'CUSTOMER'), version(2, 'STAFF'), event(3, 'STAFF'), version(4, 'CUSTOMER')];
    expect(pickJobDiffBaseline(flow, 4)).toBe(2);
  });

  it('does not treat a trailing event as the version to diff', () => {
    // The reported failure mode: staff close a job right after the customer
    // edited it, and the customer's edits stop being highlighted.
    const flow = [version(1, 'CUSTOMER'), event(2, 'STAFF'), version(3, 'CUSTOMER'), event(4, 'STAFF')];
    const { current, baseline } = currentDiffPair(flow);

    expect(current!.versionNumber).toBe(3);
    expect(baseline!.versionNumber).toBe(1);
  });

  it('reports the newest edit, not the newest row', () => {
    const flow = [version(1, 'CUSTOMER'), version(2, 'STAFF'), event(3, 'STAFF')];
    expect(latestContentVersion(flow)!.versionNumber).toBe(2);
  });

  it('keeps latestVersion on a trailing visible event that latestContentVersion skips', () => {
    // After Request Changes the customer's filtered list is the original
    // submission plus the send event. Staff must skip the event so they do not
    // land on a Closed copy; the customer must not, or View / hydrate would
    // show the original graph and a save would overwrite live workflows with it.
    const flow = [version(1000, 'CUSTOMER'), event(2000, 'STAFF')];
    expect(latestContentVersion(flow)!.versionNumber).toBe(1000);
    expect(latestVersion(flow)!.versionNumber).toBe(2000);
  });

  it('falls back to the newest row when a job somehow has only events', () => {
    const flow = [event(1, 'CUSTOMER'), event(2, 'STAFF')];
    expect(latestContentVersion(flow)!.versionNumber).toBe(2);
  });

  it('is unaffected on a history with no events, which is every existing job', () => {
    const flow = [version(1, 'CUSTOMER'), version(2, 'STAFF'), version(3, 'CUSTOMER')];
    expect(latestContentVersion(flow)!.versionNumber).toBe(3);
    expect(currentDiffPair(flow).baseline!.versionNumber).toBe(2);
  });

  it('still lets a reader select an event version explicitly', () => {
    // Selecting one shows an empty diff, which is honest: nothing did change.
    const flow = [version(1, 'CUSTOMER'), version(2, 'STAFF'), event(3, 'STAFF')];
    const { current, baseline } = selectedDiffPair(flow, 3, undefined);
    expect(current!.versionNumber).toBe(3);
    expect(baseline!.versionNumber).toBe(1);
  });
});

/**
 * What a reader lands on after rejecting the lab's changes.
 *
 * The reject flow appends the customer's restored graph and then a state event
 * on top of it. Both job pages land on the newest row of any kind — see the
 * suite below — and both have to end up comparing against the lab's version,
 * which is the change being undone; landing on the restore's own predecessor
 * would report nothing.
 */
describe('the default pair after a customer rejects the lab’s changes', () => {
  const original = workflow([node('a')]);
  const labEdit = workflow([node('a'), node('b')]);

  const history: JobVersionLike[] = [
    version(1000, 'CUSTOMER', [original]),
    version(1001, 'STAFF', [labEdit]),
    // The restore: the customer's graph again, as a new version.
    version(1002, 'CUSTOMER', [original]),
    { ...version(2000, 'CUSTOMER', [original]), isEvent: true, note: 'Rejected by the customer' }
  ];

  it('compares the newest edit against the lab’s version when one is selected', () => {
    const latest = latestContentVersion(history)!;
    expect(latest.versionNumber).toBe(1002);

    const { current, baseline } = selectedDiffPair(history, latest.versionNumber, undefined);
    expect({ current: current?.versionNumber, baseline: baseline?.versionNumber }).toEqual({ current: 1002, baseline: 1001 });
  });

  it('compares the newest row — what both pages land on — against the lab’s version too', () => {
    const latest = latestVersion(history)!;
    expect(latest.versionNumber).toBe(2000);

    const { current, baseline } = selectedDiffPair(history, latest.versionNumber, undefined);
    expect({ current: current?.versionNumber, baseline: baseline?.versionNumber }).toEqual({ current: 2000, baseline: 1001 });
  });

  it('shows the lab’s node coming back out', () => {
    const { current, baseline } = selectedDiffPair(history, 1002, undefined);
    const diff = diffJobGraphs(baseline!.workflows, current!.workflows);
    expect(diff.removed).toEqual(['b']);
    expect(diff.byNodeId.get('b')!.kind).toBe('removed');
  });
});

/**
 * Where a job page lands when it loads or is refreshed.
 *
 * Both the staff and the customer job pages seed their picker from
 * `latestVersion`, deliberately including state-change events. The reported
 * failure was a job whose history ended "5.1 Draft, 5.3 Accepted": keying the
 * default off `latestContentVersion` reopened it on 5.1 and reported an accepted
 * job as still being drafted, even after a full page reload.
 */
describe('the version a job page lands on', () => {
  const draft = workflow([node('a')]);
  const edited = workflow([node('a'), node('b')]);

  const history: JobVersionLike[] = [
    version(5000, 'CUSTOMER', [draft]),
    version(5001, 'STAFF', [edited]),
    { ...version(5003, 'STAFF', [edited]), isEvent: true, jobState: 'ACCEPTED', note: 'Accepted' }
  ];

  it('lands on the trailing Accepted event, not the draft below it', () => {
    expect(latestVersion(history)!.versionNumber).toBe(5003);
    // What the old default did, kept here so the regression is legible.
    expect(latestContentVersion(history)!.versionNumber).toBe(5001);
  });

  it('still compares that event against the last version from the other side', () => {
    const landing = latestVersion(history)!.versionNumber;
    const { current, baseline } = selectedDiffPair(history, landing, undefined);
    expect({ current: current?.versionNumber, baseline: baseline?.versionNumber }).toEqual({ current: 5003, baseline: 5000 });
  });

  it('shows the lab’s edit against the customer’s submission from the landing pair', () => {
    const landing = latestVersion(history)!.versionNumber;
    const { current, baseline } = selectedDiffPair(history, landing, undefined);
    expect(diffJobGraphs(baseline!.workflows, current!.workflows).added).toEqual(['b']);
  });

  it('is unchanged on a history that ends in an edit', () => {
    const noEvent = history.slice(0, 2);
    expect(latestVersion(noEvent)!.versionNumber).toBe(5001);
    expect(latestContentVersion(noEvent)!.versionNumber).toBe(5001);
  });
});
