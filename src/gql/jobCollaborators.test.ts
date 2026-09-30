import { print } from 'graphql';
import { describe, expect, it } from 'vitest';
import { ADD_JOB_MEMBER, REMOVE_JOB_MEMBER, SET_JOB_DESCRIPTION } from './mutations';
import { GET_JOB_BY_ID, GET_OWN_JOB_BY_ID } from './queries';

const compact = (document: Parameters<typeof print>[0]): string => print(document).replace(/\s+/g, ' ').trim();

/**
 * Nothing validates these documents against the schema, and one misspelled field
 * fails ownJobById outright — the whole client page goes blank. These names are
 * the backend's (job.model.ts, job.resolver.ts, parameter-snapshot.model.ts).
 */
describe('job collaborators GraphQL contracts', () => {
  it.each([['GET_JOB_BY_ID', GET_JOB_BY_ID], ['GET_OWN_JOB_BY_ID', GET_OWN_JOB_BY_ID]])('%s selects people, description and snapshots', (_name, document) => {
    const query = compact(document);
    for (const field of ['sub', 'clientEmail', 'memberEmails', 'primaryClientEmail', 'description']) expect(query).toMatch(new RegExp(`\\b${field}\\b`));
    expect(query).toContain('submittedBy { sub email name }');
    // Once on live nodes, once on version nodes.
    expect(query.match(/parameterSnapshot \{ id name type displayValue \}/g)).toHaveLength(2);
  });

  it('sends the member and description mutations with the backend argument names', () => {
    expect(compact(ADD_JOB_MEMBER)).toContain('addJobMember(jobId: $jobId, email: $email)');
    expect(compact(ADD_JOB_MEMBER)).toContain('mutation AddJobMember($jobId: ID!, $email: String!)');
    expect(compact(REMOVE_JOB_MEMBER)).toContain('removeJobMember(jobId: $jobId, email: $email)');
    expect(compact(SET_JOB_DESCRIPTION)).toContain('mutation SetJobDescription($jobId: ID!, $description: String)');
    expect(compact(SET_JOB_DESCRIPTION)).toContain('setJobDescription(jobId: $jobId, description: $description)');
  });
});
