import { describe, it, expect } from 'vitest';
import { ALL_JOBS, benchParameterEntries, formatValue, jobOptionsFromOperations, nextOperationsPerWorkflow, operationsForJob, optionLabelLookup } from './TechnicianBench';

/**
 * "Next step only" on My Bench.
 *
 * The point is that a technician assigned eight operations across three jobs
 * mostly cannot start seven of them, and a list of all eight buries the one
 * they can. Readiness itself is decided server-side (`isReadyToStart`), because
 * a blocking predecessor is routinely assigned to somebody else and so never
 * appears in this list at all.
 *
 * Input is assumed already sorted in-progress-first, as the page sorts it.
 */

const op = (over: Record<string, unknown> = {}): any => ({
  _id: 'n1',
  state: 'QUEUED',
  workflowId: 'w1',
  isReadyToStart: true,
  ...over
});

const ids = (rows: any[]): string[] => rows.map((r) => r._id);

describe('nextOperationsPerWorkflow', () => {
  it('keeps one ready operation per workflow', () => {
    const rows = [op({ _id: 'a', workflowId: 'w1' }), op({ _id: 'b', workflowId: 'w1' }), op({ _id: 'c', workflowId: 'w2' })];

    expect(ids(nextOperationsPerWorkflow(rows))).toEqual(['a', 'c']);
  });

  it('takes the in-progress one, because the page sorts those first', () => {
    const rows = [op({ _id: 'running', state: 'IN_PROGRESS' }), op({ _id: 'queued' })];

    expect(ids(nextOperationsPerWorkflow(rows))).toEqual(['running']);
  });

  it('drops operations the server says are blocked', () => {
    const rows = [op({ _id: 'blocked', isReadyToStart: false }), op({ _id: 'ready' })];

    expect(ids(nextOperationsPerWorkflow(rows))).toEqual(['ready']);
  });

  it('drops completed work', () => {
    const rows = [op({ _id: 'done', state: 'COMPLETE' }), op({ _id: 'todo' })];

    expect(ids(nextOperationsPerWorkflow(rows))).toEqual(['todo']);
  });

  it('does not let one workflow suppress another', () => {
    const rows = [op({ _id: 'a', workflowId: 'w1' }), op({ _id: 'b', workflowId: 'w2' }), op({ _id: 'c', workflowId: 'w3' })];

    expect(ids(nextOperationsPerWorkflow(rows))).toEqual(['a', 'b', 'c']);
  });

  it('keeps everything the server could not answer for, rather than hiding it', () => {
    // An older backend, or a node with no parent workflow. Showing too much is a
    // nuisance; silently hiding someone's assigned work is not.
    const rows = [op({ _id: 'a', workflowId: null, isReadyToStart: null }), op({ _id: 'b', workflowId: null, isReadyToStart: null })];

    expect(ids(nextOperationsPerWorkflow(rows))).toEqual(['a', 'b']);
  });

  it('still hides completed work when readiness is unknown', () => {
    const rows = [op({ _id: 'done', state: 'COMPLETE', workflowId: null, isReadyToStart: null })];

    expect(nextOperationsPerWorkflow(rows)).toEqual([]);
  });

  it('handles a numeric state, which is how the enum arrives on older rows', () => {
    // 2 is COMPLETE in WorkflowNodeState's declaration order.
    const rows = [op({ _id: 'done', state: 2 }), op({ _id: 'todo', state: 0, workflowId: 'w2' })];

    expect(ids(nextOperationsPerWorkflow(rows))).toEqual(['todo']);
  });
});

describe('job filter', () => {
  const rows = [
    op({ _id: 'a', job: { id: 'j1', name: 'Gibson', jobId: '101' } }),
    op({ _id: 'b', job: { id: 'j2', name: 'Miniprep' } }),
    op({ _id: 'c', job: { id: 'j1', name: 'Gibson', jobId: '101' } }),
    op({ _id: 'd', job: null })
  ];

  it('lists each job once, in first-seen order, with its operation count', () => {
    expect(jobOptionsFromOperations(rows)).toEqual([
      { id: 'j1', label: 'Gibson · #101', count: 2 },
      { id: 'j2', label: 'Miniprep', count: 1 }
    ]);
  });

  it('keeps only the chosen job, and everything for "All jobs"', () => {
    expect(ids(operationsForJob(rows, 'j1'))).toEqual(['a', 'c']);
    expect(ids(operationsForJob(rows, ALL_JOBS))).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('parameter display', () => {
  const params = [{ id: 'ladder', options: [{ id: '1-kb-plus-ladder', name: '1 kb plus ladder' }] }];

  it('shows a dropdown option by its name rather than its stored id', () => {
    const labels = optionLabelLookup(params);
    expect(formatValue('1-kb-plus-ladder', labels.ladder)).toBe('1 kb plus ladder');
    expect(formatValue(['1-kb-plus-ladder'], labels.ladder)).toBe('1 kb plus ladder');
    expect(formatValue('free text', labels.ladder)).toBe('free text');
  });
});

describe('hidden parameters on the bench (show-only-if rule 21)', () => {
  const parameters = [
    { id: 'sample', name: 'Sample Type', type: 'dropdown', options: [{ id: 'bact', name: 'Bacteria' }, { id: 'yeast', name: 'Yeast' }] },
    { id: 'lysis', name: 'Lysis', type: 'dropdown', showIf: { parameterId: 'sample', op: 'eq', optionIds: ['bact'] }, options: [{ id: 'oth', name: 'Other' }] }
  ];
  const stored = (sample: string) => [{ id: 'sample', value: sample }, { id: 'lysis', value: 'oth' }, { id: 'lysis__otherText', value: 'Beads' }, { id: '__runCount', value: 2 }];

  it('lists a conditional answer while its condition holds, without the "Other" text entry', () => {
    expect(benchParameterEntries(parameters, stored('bact')).map((e) => e.id)).toEqual(['sample', 'lysis', '__runCount']);
  });

  it('omits the answer of a hidden parameter that is still stored (a step in flight keeps it)', () => {
    expect(benchParameterEntries(parameters, stored('yeast')).map((e) => e.id)).toEqual(['sample', '__runCount']);
  });

  it('is empty for an operation with no stored answers', () => {
    expect(benchParameterEntries(parameters, undefined)).toEqual([]);
  });
});
