/**
 * Job people in the UI. The server is the authority (isJobMember in
 * damplab-backend/src/job/job-membership.ts); these only decide what to show.
 */
export const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const JOB_DESCRIPTION_MAX_LENGTH = 500;

export interface JobPeopleFields {
  sub?: string | null;
  email?: string | null;
  clientEmail?: string | null;
  primaryClientEmail?: string | null;
  memberEmails?: string[] | null;
}

export const normalizeEmail = (value?: string | null): string => value?.trim().toLowerCase() ?? '';

export function parseEmailList(text: string): { emails: string[]; invalid: string[] } {
  const emails: string[] = [];
  const invalid: string[] = [];
  for (const raw of text.split(/[\s,;]+/)) {
    const email = normalizeEmail(raw);
    if (!email) continue;
    if (!EMAIL_PATTERN.test(email)) invalid.push(raw.trim());
    else if (!emails.includes(email)) emails.push(email);
  }
  return { emails, invalid };
}

/** Staff submit: the first email is the primary client, the rest are members. */
export function splitClientEmails(emails: string[]): { clientEmail?: string; memberEmails: string[] } {
  const [clientEmail, ...memberEmails] = emails;
  return { clientEmail, memberEmails };
}

export function jobPeople(job: JobPeopleFields | null | undefined): { primary: string; members: string[] } {
  const primary = normalizeEmail(job?.primaryClientEmail) || normalizeEmail(job?.clientEmail) || normalizeEmail(job?.email);
  const members = (job?.memberEmails ?? []).map(normalizeEmail).filter((e) => e && e !== primary);
  return { primary, members };
}

export function viewerIsJobMember(job: JobPeopleFields | null | undefined, viewer: { subject?: string | null; email?: string | null }): boolean {
  if (!job) return false;
  if (job.sub && viewer.subject && job.sub === viewer.subject) return true;
  const email = normalizeEmail(viewer.email);
  if (!email) return false;
  const { primary, members } = jobPeople(job);
  return email === primary || members.includes(email);
}
