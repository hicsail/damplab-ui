import { describe, expect, it } from 'vitest';
import { jobPeople, parseEmailList, splitClientEmails, viewerIsJobMember } from './jobMembers';

describe('parseEmailList', () => {
  it('splits on commas, semicolons, spaces and newlines, normalizes and dedupes', () => {
    expect(parseEmailList(' A@x.org, b@y.org;\nA@X.org  c@z.org ')).toEqual({ emails: ['a@x.org', 'b@y.org', 'c@z.org'], invalid: [] });
  });
  it('reports malformed entries without dropping the good ones', () => {
    expect(parseEmailList('a@x.org, nope, b@')).toEqual({ emails: ['a@x.org'], invalid: ['nope', 'b@'] });
  });
  it('is empty for blank input', () => {
    expect(parseEmailList('   ')).toEqual({ emails: [], invalid: [] });
  });
});

describe('splitClientEmails', () => {
  it('makes the first the primary and the rest members', () => {
    expect(splitClientEmails(['a@x.org', 'b@x.org', 'c@x.org'])).toEqual({ clientEmail: 'a@x.org', memberEmails: ['b@x.org', 'c@x.org'] });
  });
  it('allows an empty list', () => {
    expect(splitClientEmails([])).toEqual({ clientEmail: undefined, memberEmails: [] });
  });
});

describe('jobPeople', () => {
  it('prefers the server-resolved primary', () => {
    expect(jobPeople({ primaryClientEmail: 'client@bu.edu', email: 'tech@bu.edu', memberEmails: ['m@x.org'] })).toEqual({ primary: 'client@bu.edu', members: ['m@x.org'] });
  });
  it('falls back to clientEmail, then email', () => {
    expect(jobPeople({ clientEmail: 'Client@BU.edu', email: 'tech@bu.edu' }).primary).toBe('client@bu.edu');
    expect(jobPeople({ email: 'Owner@x.org' }).primary).toBe('owner@x.org');
  });
});

describe('viewerIsJobMember', () => {
  const job = { sub: 'staff-sub', email: 'tech@bu.edu', primaryClientEmail: 'client@bu.edu', memberEmails: ['m@x.org'] };
  it('admits sub, primary and member, case-insensitively', () => {
    expect(viewerIsJobMember(job, { subject: 'staff-sub' })).toBe(true);
    expect(viewerIsJobMember(job, { email: 'Client@BU.edu' })).toBe(true);
    expect(viewerIsJobMember(job, { email: 'M@x.org' })).toBe(true);
  });
  it('refuses a stranger and empty identities', () => {
    expect(viewerIsJobMember(job, { subject: 'x', email: 'x@x.org' })).toBe(false);
    expect(viewerIsJobMember({}, {})).toBe(false);
  });
});
