/**
 * Who to name in a job's header.
 *
 * On a new staff-submitted job, `username`/`email` are the client's (B28) and the
 * staff member is `submittedBy`. Only legacy, unmigrated jobs still carry the
 * technician in `username`/`email`; for those `clientDisplayName`/`clientEmail`
 * are the client. Naming the wrong pair under
 * "User" credits the work to whoever typed it in; naming only the client hides
 * that a staff member acted on their behalf, which is exactly what a reader
 * checking a submission needs to know.
 *
 * `clientEmail` is the signal, not `clientDisplayName`: the customer checkout
 * sends a display name too (it is the customer's own), so only the email
 * distinguishes a job submitted for someone from one submitted by them.
 */
export interface JobSubmitterFields {
  username?: string | null;
  email?: string | null;
  clientDisplayName?: string | null;
  clientEmail?: string | null;
  institute?: string | null;
  primaryClientEmail?: string | null;
  submittedBy?: { sub?: string | null; email?: string | null; name?: string | null } | null;
}

export interface JobSubmitterSummary {
  /** The person the job is for. */
  user: string;
  /** Who entered it on their behalf, or null when they entered it themselves. */
  onBehalfOf: string | null;
  /** The client's organization — `institute` is theirs on both kinds of job. */
  organization: string;
}

const clean = (value: string | null | undefined): string => value?.trim() ?? '';

/** "Name (email)", degrading to whichever half exists rather than printing "()" . */
function nameWithEmail(name: string, email: string): string {
  if (name && email) return `${name} (${email})`;
  return name || email;
}

export function summarizeJobSubmitter(job: JobSubmitterFields): JobSubmitterSummary {
  const clientEmail = clean(job.clientEmail);
  const clientName = clean(job.clientDisplayName);
  const submitterName = clean(job.username);
  const submitterEmail = clean(job.email);
  const organization = clean(job.institute);

  // B28/B30: a staff-submitted job is the client's. Its owner fields are the
  // client's; the staff member is only ever named from submittedBy.
  if (job.submittedBy) {
    const primary = clean(job.primaryClientEmail) || clean(job.clientEmail) || clean(job.email);
    return {
      user: nameWithEmail(clean(job.clientDisplayName) || clean(job.username), primary),
      onBehalfOf: `Submitted on their behalf by ${nameWithEmail(clean(job.submittedBy.name), clean(job.submittedBy.email))}`,
      organization
    };
  }

  if (clientEmail) {
    return {
      user: nameWithEmail(clientName, clientEmail),
      onBehalfOf: `Submitted on their behalf by ${nameWithEmail(submitterName, submitterEmail)}`,
      organization
    };
  }

  return {
    user: nameWithEmail(clientName || submitterName, submitterEmail),
    onBehalfOf: null,
    organization
  };
}
