import type { CustomerActionRequired } from './jobReview';

/**
 * Client mirror of the backend's job-editing gate (see job-editing.ts there).
 *
 * Kept in sync by hand, and deliberately conservative in the same direction:
 * a job whose flag has not been read yet, or was never written, is treated as
 * locked. The server is the enforcement; this only decides what to offer, and
 * offering an editor that the save will reject is the worse failure.
 */
export type { CustomerActionRequired } from './jobReview';

export interface JobEditingFacts {
    state?: string | null;
    customerActionRequired?: CustomerActionRequired | null;
}

/** Whether the job's owner may currently change its workflow graph. */
export function customerMayEdit(job: JobEditingFacts | null | undefined): boolean {
    return needsWorkflowEdit(job);
}

/** Whether the job is sitting with the customer rather than the lab. */
export function jobIsWithCustomer(job: JobEditingFacts | null | undefined): boolean {
    return job?.state === 'CHANGES_REQUESTED';
}

function needsAction(job: JobEditingFacts | null | undefined, action: CustomerActionRequired): boolean {
    return jobIsWithCustomer(job) && job?.customerActionRequired === action;
}

export function needsReply(job: JobEditingFacts | null | undefined): boolean {
    return needsAction(job, 'REPLY');
}

export function needsWorkflowEdit(job: JobEditingFacts | null | undefined): boolean {
    return needsAction(job, 'EDIT_WORKFLOW');
}

export function needsWorkflowApproval(job: JobEditingFacts | null | undefined): boolean {
    return needsAction(job, 'APPROVE_WORKFLOW');
}

/**
 * The customer is being asked to sign off on the lab's edits, rather than to
 * make edits of their own: the job is theirs to act on but not to change.
 */
export function awaitingCustomerApproval(job: JobEditingFacts | null | undefined): boolean {
    return needsWorkflowApproval(job);
}

export function technicianCustomerActionCopy(job: JobEditingFacts | null | undefined): string {
    if (needsReply(job)) return 'Waiting for the customer to reply to the lab.';
    if (needsWorkflowEdit(job)) return 'The customer can edit the workflow and resubmit it.';
    if (needsWorkflowApproval(job)) return 'Waiting for the customer’s workflow approval.';
    return 'The requested customer action is unavailable. Review this legacy job before continuing.';
}

/**
 * Why the customer cannot save right now, in their words.
 *
 * Derived from the job's own state rather than from the server's error string:
 * Apollo wraps GraphQL errors, so what reaches a catch block is not reliably the
 * ForbiddenException text, and this message is the one place the customer is
 * told what happened to a job they still had open.
 */
export function editingBlockedMessage(job: JobEditingFacts | null | undefined): string {
    const seeComments = 'See the comments section on this job for details.';
    switch (job?.state) {
        case 'ACCEPTED':
            return `This job has been accepted by the DAMP Lab and can no longer be edited. ${seeComments}`;
        case 'CHANGES_REQUESTED':
            if (needsReply(job)) return `Editing is not enabled for this job — the lab is waiting for your reply. ${seeComments}`;
            if (needsWorkflowApproval(job)) return `Editing is not enabled for this job — the lab has asked you to approve it rather than change it. ${seeComments}`;
            if (needsWorkflowEdit(job)) return `The lab asked you to edit this job, but editing is not currently enabled. Reload the job or contact the lab. ${seeComments}`;
            return `Editing is not enabled for this job. ${seeComments}`;
        case 'CLOSED':
            return `This job is closed and can no longer be edited. ${seeComments}`;
        case 'CANCELLED':
            return `You cancelled this job, so it can no longer be edited. ${seeComments}`;
        default:
            return `This job is no longer open for edits. ${seeComments}`;
    }
}

/**
 * States in which the lab holds the job and has not committed to its spec.
 * Mirrors STAFF_EDITABLE_STATES in the backend's job-editing.ts.
 */
const STAFF_EDITABLE_STATES = ['CREATING', 'SUBMITTED', 'QUEUED', 'IN_PROGRESS', 'COMPLETE'];

/** Whether staff may currently change this job's contract. */
export function staffMayEdit(job: JobEditingFacts | null | undefined): boolean {
    return !!job?.state && STAFF_EDITABLE_STATES.includes(job.state);
}

/**
 * Why staff cannot edit, phrased as the action that would unblock them.
 * Null when nothing is in the way.
 */
export function staffEditBlockedReason(job: JobEditingFacts | null | undefined): string | null {
    if (staffMayEdit(job)) return null;
    switch (job?.state) {
        case 'CHANGES_REQUESTED':
            return 'This job is with the customer. Withdraw it from them before editing — that restores the workflow to the version they were sent.';
        case 'ACCEPTED':
            return 'This job has been accepted and its Statement of Work is priced against that spec. Withdraw the acceptance before editing.';
        case 'CLOSED':
            return 'This job is closed and can no longer be edited.';
        case 'CANCELLED':
            return 'This job was cancelled by the client and can no longer be edited.';
        case 'REJECTED':
            return 'This job was not accepted and can no longer be edited.';
        default:
            return 'This job cannot be edited in its current state.';
    }
}

/**
 * Whether to offer Revert at all.
 *
 * Revert is a contract write, so it is offered only to whoever the server would
 * actually let save — and never once the lab has started work, where
 * assertWorkInFlightUntouched would refuse to re-service a started node.
 */
export function canRevertVersions(job: JobEditingFacts | null | undefined, isStaff: boolean): boolean {
    const started = ['QUEUED', 'IN_PROGRESS', 'COMPLETE', 'CLOSED', 'REJECTED', 'CANCELLED'];
    if (!job?.state || started.includes(job.state)) return false;
    return isStaff ? staffMayEdit(job) : customerMayEdit(job);
}
