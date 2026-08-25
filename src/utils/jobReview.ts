export type JobReviewDecision = 'ACCEPT' | 'REQUEST_CLARIFICATION' | 'REQUEST_EDITS' | 'REQUEST_APPROVAL';
export type CustomerActionRequired = 'REPLY' | 'EDIT_WORKFLOW' | 'APPROVE_WORKFLOW';
export type JobReviewCustomerAction = CustomerActionRequired;

export interface ReviewInput {
  operationId: string;
  jobId: string;
  decision: JobReviewDecision;
  message?: string;
}

export interface ReviewResponseInput {
  operationId: string;
  jobId: string;
  message?: string;
}

export type RetryOperationEvent =
  | { type: 'submit'; candidate: string }
  | { type: 'failure' }
  | { type: 'edit' | 'reopen' | 'success' };

/**
 * The operation id a retry should carry.
 *
 * A submit reuses the id it already holds so the server treats a second attempt
 * as the same command; a failure keeps it, so retrying resumes rather than
 * duplicating. Editing the form, reopening the dialog, or succeeding all clear
 * it — those are different commands and must not resume the previous one.
 *
 * Overloaded because a submit always yields an id, and the call sites pass the
 * result straight into a builder that requires one.
 */
export function retryOperationId(current: string | null, event: { type: 'submit'; candidate: string }): string;
export function retryOperationId(current: string | null, event: RetryOperationEvent): string | null;
export function retryOperationId(current: string | null, event: RetryOperationEvent): string | null {
  if (event.type === 'submit') return current ?? event.candidate;
  if (event.type === 'failure') return current;
  return null;
}

export async function refreshReviewSurfaces(input: {
  refetchJob: () => Promise<unknown>;
  refetchSow: () => Promise<unknown>;
  refetchSowEditorState: () => Promise<unknown>;
}): Promise<void> {
  await Promise.all([input.refetchJob(), input.refetchSow(), input.refetchSowEditorState()]);
}

interface BuildReviewInputArgs {
  operationId: string;
  jobId: string;
  decision: JobReviewDecision;
  message?: string | null;
}

interface BuildReviewResponseInputArgs {
  operationId: string;
  jobId: string;
  action: CustomerActionRequired;
  message?: string | null;
}

const REVIEW_DECISIONS: readonly JobReviewDecision[] = ['ACCEPT', 'REQUEST_CLARIFICATION', 'REQUEST_EDITS', 'REQUEST_APPROVAL'];
const CUSTOMER_ACTIONS: readonly CustomerActionRequired[] = ['REPLY', 'EDIT_WORKFLOW', 'APPROVE_WORKFLOW'];

export interface ReviewResponseCopy {
  title: string;
  body: string;
  fieldLabel: string;
  submitLabel: string;
  pendingLabel: string;
  failure: string;
  messageRequired: boolean;
}

const RESPONSE_COPY: Record<CustomerActionRequired, ReviewResponseCopy> = {
  REPLY: {
    title: 'Reply to the lab',
    body: 'Answer the lab’s question and send your response.',
    fieldLabel: 'Response to the lab',
    submitLabel: 'Reply to lab',
    pendingLabel: 'Replying…',
    failure: 'Could not send your reply.',
    messageRequired: true
  },
  EDIT_WORKFLOW: {
    title: 'Submit updated workflow',
    body: 'Submit your saved workflow edits to the DAMP Lab for review. You may add a note describing the changes.',
    fieldLabel: 'Note to the lab (optional)',
    submitLabel: 'Submit updated workflow',
    pendingLabel: 'Submitting…',
    failure: 'Could not submit the updated workflow.',
    messageRequired: false
  },
  APPROVE_WORKFLOW: {
    title: 'Approve workflow',
    body: 'Confirm that the workflow is ready for the DAMP Lab. You may add an optional note.',
    fieldLabel: 'Note to the lab (optional)',
    submitLabel: 'Approve workflow',
    pendingLabel: 'Approving…',
    failure: 'Could not approve the workflow.',
    messageRequired: false
  }
};

export function reviewResponseCopy(action: CustomerActionRequired): ReviewResponseCopy {
  const copy = RESPONSE_COPY[action];
  if (!copy) throw new Error('A valid customer action is required.');
  return copy;
}

function requiredId(value: string, label: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
}

function optionalMessage(message?: string | null): string | undefined {
  const normalized = message?.trim();
  return normalized || undefined;
}

export function buildReviewInput(args: BuildReviewInputArgs): ReviewInput {
  if (!REVIEW_DECISIONS.includes(args.decision)) throw new Error('A valid review decision is required.');

  const message = optionalMessage(args.message);
  if (args.decision !== 'ACCEPT' && !message) throw new Error('A message is required for this review decision.');

  return {
    operationId: requiredId(args.operationId, 'Operation ID'),
    jobId: requiredId(args.jobId, 'Job ID'),
    decision: args.decision,
    ...(message ? { message } : {})
  };
}

export function buildReviewResponseInput(args: BuildReviewResponseInputArgs): ReviewResponseInput {
  if (!CUSTOMER_ACTIONS.includes(args.action)) throw new Error('A valid customer action is required.');

  const message = optionalMessage(args.message);
  if (args.action === 'REPLY' && !message) throw new Error('A message is required when replying.');

  // The action is explicit at this boundary so validation cannot infer it from
  // the editing flag. The backend input intentionally derives the authoritative
  // action from the job and accepts only operationId, jobId, and message.
  return {
    operationId: requiredId(args.operationId, 'Operation ID'),
    jobId: requiredId(args.jobId, 'Job ID'),
    ...(message ? { message } : {})
  };
}
