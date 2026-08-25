import { print } from 'graphql';
import { describe, expect, it } from 'vitest';
import { RESPOND_TO_JOB_REVIEW, REVIEW_JOB } from './mutations';
import { ACTIVITY_EVENTS, GET_JOB_BY_ID, GET_OWN_JOB_BY_ID, GET_SOW_BY_JOB_ID, GET_SOW_EDITOR_STATE, SOW_VERSION_FIELDS } from './queries';

const compact = (document: Parameters<typeof print>[0]): string => print(document).replace(/\s+/g, ' ').trim();

describe('job review GraphQL contracts', () => {
  it('sends each command through its backend input type and returns the authoritative job fields', () => {
    const expectedFields = [
      'id',
      'state',
      'customerEditingEnabled',
      'customerActionRequired',
      'acceptedJobVersionNumber',
      'acceptedContractFingerprint',
      'acceptedBillingFingerprint'
    ];
    const review = compact(REVIEW_JOB);
    const response = compact(RESPOND_TO_JOB_REVIEW);

    expect(review).toContain('mutation ReviewJob($input: ReviewJobInput!)');
    expect(review).toContain('reviewJob(input: $input)');
    expect(response).toContain('mutation RespondToJobReview($input: RespondToJobReviewInput!)');
    expect(response).toContain('respondToJobReview(input: $input)');
    for (const field of expectedFields) {
      expect(review).toMatch(new RegExp(`\\b${field}\\b`));
      expect(response).toMatch(new RegExp(`\\b${field}\\b`));
    }
  });

  it('requests review and acceptance facts in both job-detail queries', () => {
    const expectedFields = ['customerActionRequired', 'acceptedJobVersionNumber', 'acceptedContractFingerprint', 'acceptedBillingFingerprint'];

    for (const document of [GET_JOB_BY_ID, GET_OWN_JOB_BY_ID]) {
      const query = compact(document);
      for (const field of expectedFields) expect(query).toMatch(new RegExp(`\\b${field}\\b`));
    }
  });
});

describe('SOW and activity GraphQL contracts', () => {
  it('requests immutable job-source linkage on every full SOW version', () => {
    const fragment = compact(SOW_VERSION_FIELDS);
    expect(fragment).toMatch(/\bsourceJobVersionNumber\b/);
    expect(fragment).toMatch(/\bsourceContractFingerprint\b/);
  });

  it('requests the customer signing gate', () => {
    const query = compact(GET_SOW_EDITOR_STATE);
    expect(query).toMatch(/actionGate \{[^}]*\bcanSign\b[^}]*\bsignBlockers\b/);
  });

  it('requests customer lifecycle data in ClientView’s SOW query', () => {
    const query = compact(GET_SOW_BY_JOB_ID);
    expect(query).toMatch(
      /activeVersion \{[^}]*\bversionNumber\b[^}]*\bstatus\b[^}]*\bvisibleToCustomer\b[^}]*\bsourceJobVersionNumber\b[^}]*\bsourceContractFingerprint\b[^}]*\}/
    );
    expect(query).toMatch(/actionGate \{[^}]*\bcanSign\b[^}]*\bsignBlockers\b[^}]*\}/);
  });

  it('requests SOW linkage in activity events', () => {
    const query = compact(ACTIVITY_EVENTS);
    expect(query).toMatch(/\bsowId\b/);
    expect(query).toMatch(/\bsowVersionNumber\b/);
  });
});
