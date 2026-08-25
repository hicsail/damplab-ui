import { describe, it, expect } from 'vitest';
import { jobReviewLabels, reviewDecisions, reviewDecision, REVIEW_DECISIONS } from './jobReviewLabels';

describe('jobReviewLabels', () => {
  it('treats a submitted job as the customer putting the spec forward', () => {
    const labels = jobReviewLabels('SUBMITTED');
    expect(labels.acceptOption).toBe('Accept job (ready to proceed)');
    expect(labels.acceptButton).toBe('Accept Job');
    expect(labels.acceptNote).toBeNull();
  });

  it('calls out acceptance on the customer behalf while the job sits with them', () => {
    const labels = jobReviewLabels('CHANGES_REQUESTED');
    expect(labels.acceptOption).toBe("Accept on the customer's behalf (ready to proceed)");
    expect(labels.acceptNote).toMatch(/closes their editor/i);
  });

  it('re-accepts an already accepted job', () => {
    const labels = jobReviewLabels('ACCEPTED');
    expect(labels.acceptOption).toBe("Re-accept on the customer's behalf (ready to proceed)");
    expect(labels.acceptButton).toBe('Re-accept');
  });

  it('treats an unknown or missing state as acceptance on the customer behalf', () => {
    for (const state of [undefined, null, '', 'QUEUED']) {
      expect(jobReviewLabels(state).acceptOption).toContain("customer's behalf");
    }
  });
});

describe('reviewDecisions', () => {
  it('offers accept, clarification, design edits and approval', () => {
    expect(reviewDecisions('SUBMITTED').map((d) => d.value)).toEqual(['accept', 'clarify', 'edits', 'approval']);
  });

  it('maps every choice directly to the backend decision literal', () => {
    const byValue = Object.fromEntries(reviewDecisions('SUBMITTED').map((d) => [d.value, d]));
    expect(byValue.accept.decision).toBe('ACCEPT');
    expect(byValue.clarify.decision).toBe('REQUEST_CLARIFICATION');
    expect(byValue.edits.decision).toBe('REQUEST_EDITS');
    expect(byValue.approval.decision).toBe('REQUEST_APPROVAL');
  });

  it('states each deterministic customer action without exposing an editing choice', () => {
    const byValue = Object.fromEntries(reviewDecisions('SUBMITTED').map((d) => [d.value, d]));
    expect(byValue.clarify.note).toMatch(/reply.*cannot edit/i);
    expect(byValue.edits.note).toMatch(/edit.*submit/i);
    expect(byValue.approval.note).toMatch(/approve.*cannot edit/i);
    for (const decision of Object.values(byValue)) {
      expect(decision).not.toHaveProperty('editingControl');
      expect(decision).not.toHaveProperty('defaultEditingEnabled');
    }
  });

  it('requires a message for everything except accept', () => {
    const byValue = Object.fromEntries(reviewDecisions('SUBMITTED').map((d) => [d.value, d]));
    expect(byValue.accept.messageRequired).toBe(false);
    expect(byValue.clarify.messageRequired).toBe(true);
    expect(byValue.edits.messageRequired).toBe(true);
    expect(byValue.approval.messageRequired).toBe(true);
  });

  it('carries the accept wording through from jobReviewLabels', () => {
    const accept = reviewDecision('accept', 'ACCEPTED');
    expect(accept.optionLabel).toBe(jobReviewLabels('ACCEPTED').acceptOption);
    expect(accept.buttonLabel).toBe('Re-accept');
  });

  it('exposes the decision values as a stable list', () => {
    expect(REVIEW_DECISIONS).toEqual(['accept', 'clarify', 'edits', 'approval']);
  });
});
