/**
 * Client mirror of the backend's job-editing gate (see job-editing.ts there).
 *
 * Kept in sync by hand, and deliberately conservative in the same direction:
 * a job whose flag has not been read yet, or was never written, is treated as
 * locked. The server is the enforcement; this only decides what to offer, and
 * offering an editor that the save will reject is the worse failure.
 */
export interface JobEditingFacts {
    state?: string | null;
    customerEditingEnabled?: boolean | null;
}

/** Whether the job's owner may currently change its workflow graph. */
export function customerMayEdit(job: JobEditingFacts | null | undefined): boolean {
    return job?.customerEditingEnabled === true;
}

/** Whether the job is sitting with the customer rather than the lab. */
export function jobIsWithCustomer(job: JobEditingFacts | null | undefined): boolean {
    return job?.state === 'CHANGES_REQUESTED';
}

/**
 * The customer is being asked to sign off on the lab's edits, rather than to
 * make edits of their own: the job is theirs to act on but not to change.
 */
export function awaitingCustomerApproval(job: JobEditingFacts | null | undefined): boolean {
    return jobIsWithCustomer(job) && !customerMayEdit(job);
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
            return `Editing is not enabled for this job — the lab has asked you to approve it rather than change it. ${seeComments}`;
        case 'CLOSED':
            return `This job is closed and can no longer be edited. ${seeComments}`;
        default:
            return `This job is no longer open for edits. ${seeComments}`;
    }
}
