import { describe, it, expect } from 'vitest';
import { jobReviewLabels, reviewDecisions, reviewDecision, REVIEW_DECISIONS } from './jobReviewLabels';

describe('jobReviewLabels', () => {
  it('treats a submitted job as the customer putting the spec forward', () => {
    const labels = jobReviewLabels('SUBMITTED');
    expect(labels.acceptOption).toBe('Accept job (ready to proceed)');
    expect(labels.acceptButton).toBe('Accept Job');
    expect(labels.acceptNote).toBeNull();
    // The one case with no red warning: this is the customer's own spec.
    expect(labels.onCustomersBehalf).toBe(false);
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

  describe('a submitted job the lab has since edited', () => {
    // The gap this closes: staff edit a SUBMITTED job and accept it without ever
    // handing it back, so the customer is contractually bound to a spec they
    // have not seen. The state alone cannot tell you — it is still SUBMITTED.
    const labels = () => jobReviewLabels('SUBMITTED', true);

    it('is acceptance on the customer behalf, not a plain accept', () => {
      expect(labels().acceptOption).toBe("Accept on the customer's behalf (ready to proceed)");
      expect(labels().acceptButton).toBe('Accept Job');
    });

    it('says the customer has not seen the edits', () => {
      expect(labels().acceptNote).toMatch(/not seen/i);
    });

    it('does not claim the job is open in their editor, because it is not', () => {
      // That is the CHANGES_REQUESTED wording, and it would be false here.
      expect(labels().acceptNote).not.toMatch(/closes their editor/i);
    });
  });

  it('leaves a job the customer last touched alone', () => {
    // A resubmission after staff edits makes the newest content version theirs
    // again, so there is nothing unseen and nothing to warn about.
    expect(jobReviewLabels('SUBMITTED', false).acceptNote).toBeNull();
  });

  it('flags every acceptance that commits the customer to something they did not submit', () => {
    // Drives the red banner. The three cases are: the job is open with them, it
    // was already accepted, or the lab has edited it since they submitted.
    expect(jobReviewLabels('CHANGES_REQUESTED').onCustomersBehalf).toBe(true);
    expect(jobReviewLabels('ACCEPTED').onCustomersBehalf).toBe(true);
    expect(jobReviewLabels('SUBMITTED', true).onCustomersBehalf).toBe(true);
    expect(jobReviewLabels('SUBMITTED', false).onCustomersBehalf).toBe(false);
  });

  it('keeps the wording for the other states, edited or not', () => {
    // CHANGES_REQUESTED and ACCEPTED already say "on the customer's behalf"; an
    // unseen staff edit does not change what those two mean.
    for (const state of ['CHANGES_REQUESTED', 'ACCEPTED']) {
      expect(jobReviewLabels(state, true)).toEqual(jobReviewLabels(state, false));
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

  it('carries the unseen-edits warning through to the decision list', () => {
    const accept = reviewDecision('accept', 'SUBMITTED', true);
    expect(accept.optionLabel).toBe(jobReviewLabels('SUBMITTED', true).acceptOption);
    expect(accept.note).toMatch(/not seen/i);
  });

  it('exposes the decision values as a stable list', () => {
    expect(REVIEW_DECISIONS).toEqual(['accept', 'clarify', 'edits', 'approval']);
  });
});
