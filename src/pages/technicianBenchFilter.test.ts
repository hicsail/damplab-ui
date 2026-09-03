import { describe, it, expect } from 'vitest';
import { nextOperationsPerWorkflow } from './TechnicianBench';

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
