import { describe, expect, it } from 'vitest';
import {
  buildReviewInput,
  buildReviewResponseInput,
  refreshReviewSurfaces,
  retryOperationId,
  reviewResponseCopy
} from './jobReview';

describe('buildReviewInput', () => {
  it('trims identifiers and the optional message', () => {
    expect(
      buildReviewInput({
        operationId: '  review-1  ',
        jobId: '  job-1 ',
        decision: 'REQUEST_EDITS',
        message: '  Please update the sample count.  '
      })
    ).toEqual({
      operationId: 'review-1',
      jobId: 'job-1',
      decision: 'REQUEST_EDITS',
      message: 'Please update the sample count.'
    });
  });

  it('omits a blank optional message when accepting', () => {
    expect(buildReviewInput({ operationId: 'review-2', jobId: 'job-2', decision: 'ACCEPT', message: '   ' })).toEqual({
      operationId: 'review-2',
      jobId: 'job-2',
      decision: 'ACCEPT'
    });
  });

  it.each(['REQUEST_CLARIFICATION', 'REQUEST_EDITS', 'REQUEST_APPROVAL'] as const)(
    'requires a nonblank staff message for %s',
    (decision) => {
      expect(() => buildReviewInput({ operationId: 'review-3', jobId: 'job-3', decision, message: '  ' })).toThrow(/message/i);
    }
  );

  it('rejects blank identifiers and unknown decisions', () => {
    expect(() => buildReviewInput({ operationId: ' ', jobId: 'job-4', decision: 'ACCEPT' })).toThrow(/operation/i);
    expect(() => buildReviewInput({ operationId: 'review-4', jobId: ' ', decision: 'ACCEPT' })).toThrow(/job/i);
    expect(() => buildReviewInput({ operationId: 'review-4', jobId: 'job-4', decision: 'INVENTED' as any })).toThrow(/decision/i);
  });
});

describe('buildReviewResponseInput', () => {
  it('uses the explicit action to validate a reply and emits the backend input shape', () => {
    expect(
      buildReviewResponseInput({
        operationId: '  response-1 ',
        jobId: ' job-1 ',
        action: 'REPLY',
        message: '  There will be 24 samples. '
      })
    ).toEqual({
      operationId: 'response-1',
      jobId: 'job-1',
      message: 'There will be 24 samples.'
    });
  });

  it('requires a nonblank reply message', () => {
    expect(() => buildReviewResponseInput({ operationId: 'response-2', jobId: 'job-2', action: 'REPLY', message: '  ' })).toThrow(/message/i);
  });

  it.each(['EDIT_WORKFLOW', 'APPROVE_WORKFLOW'] as const)('allows an optional blank message for %s', (action) => {
    expect(buildReviewResponseInput({ operationId: 'response-3', jobId: 'job-3', action, message: '  ' })).toEqual({
      operationId: 'response-3',
      jobId: 'job-3'
    });
  });

  it('rejects blank identifiers and unknown actions', () => {
    expect(() => buildReviewResponseInput({ operationId: '', jobId: 'job-4', action: 'EDIT_WORKFLOW' })).toThrow(/operation/i);
    expect(() => buildReviewResponseInput({ operationId: 'response-4', jobId: '', action: 'EDIT_WORKFLOW' })).toThrow(/job/i);
    expect(() => buildReviewResponseInput({ operationId: 'response-4', jobId: 'job-4', action: 'INVENTED' as any })).toThrow(/action/i);
  });
});

describe('reviewResponseCopy', () => {
  it.each([
    ['REPLY', 'Reply to lab', true],
    ['EDIT_WORKFLOW', 'Submit updated workflow', false],
    ['APPROVE_WORKFLOW', 'Approve workflow', false]
  ] as const)('uses action-specific submit copy for %s', (action, submitLabel, messageRequired) => {
    expect(reviewResponseCopy(action)).toMatchObject({ submitLabel, messageRequired });
  });

  it('describes workflow edits as already saved before submission', () => {
    expect(reviewResponseCopy('EDIT_WORKFLOW').body).toMatch(/saved workflow edits/i);
  });
});

describe('retryOperationId', () => {
  it('reuses the same identity for an unchanged retry after failure', () => {
    const first = retryOperationId(null, { type: 'submit', candidate: 'operation-1' });
    const failed = retryOperationId(first, { type: 'failure' });
    const retry = retryOperationId(failed, { type: 'submit', candidate: 'operation-2' });

    expect(retry).toBe('operation-1');
  });

  it('starts a new command after an editable field changes', () => {
    const first = retryOperationId(null, { type: 'submit', candidate: 'operation-1' });
    const edited = retryOperationId(first, { type: 'edit' });
    const changedPayload = retryOperationId(edited, { type: 'submit', candidate: 'operation-2' });

    expect(edited).toBeNull();
    expect(changedPayload).toBe('operation-2');
  });

  it.each(['reopen', 'success'] as const)('clears identity on %s', (type) => {
    expect(retryOperationId('operation-1', { type })).toBeNull();
  });
});

describe('refreshReviewSurfaces', () => {
  it('starts all three refreshes and waits for editor state before resolving', async () => {
    const calls: string[] = [];
    let releaseEditorState!: () => void;
    let completed = false;

    const refresh = refreshReviewSurfaces({
      refetchJob: async () => {
        calls.push('job');
      },
      refetchSow: async () => {
        calls.push('sow');
      },
      refetchSowEditorState: () =>
        new Promise<void>((resolve) => {
          calls.push('editor-state');
          releaseEditorState = resolve;
        })
    }).then(() => {
      completed = true;
    });

    await Promise.resolve();
    expect(calls).toEqual(['job', 'sow', 'editor-state']);
    expect(completed).toBe(false);

    releaseEditorState();
    await refresh;
    expect(completed).toBe(true);
  });
});
