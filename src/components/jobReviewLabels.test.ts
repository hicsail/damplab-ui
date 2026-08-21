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

  it('gives every decision a plain-text header — comments are not markdown', () => {
    for (const d of reviewDecisions('SUBMITTED')) {
      expect(d.commentHeader.length).toBeGreaterThan(0);
      expect(d.commentHeader).not.toMatch(/[*_#`]/);
    }
  });

  it('routes accept to ACCEPTED and every request back to the customer', () => {
    const byValue = Object.fromEntries(reviewDecisions('SUBMITTED').map((d) => [d.value, d]));
    expect(byValue.accept.nextState).toBe('ACCEPTED');
    expect(byValue.clarify.nextState).toBe('CHANGES_REQUESTED');
    expect(byValue.edits.nextState).toBe('CHANGES_REQUESTED');
    expect(byValue.approval.nextState).toBe('CHANGES_REQUESTED');
  });

  it('enables editing only where the customer is being asked to change the design', () => {
    const byValue = Object.fromEntries(reviewDecisions('SUBMITTED').map((d) => [d.value, d]));
    expect(byValue.edits.defaultEditingEnabled).toBe(true);
    expect(byValue.accept.defaultEditingEnabled).toBe(false);
    expect(byValue.clarify.defaultEditingEnabled).toBe(false);
    expect(byValue.approval.defaultEditingEnabled).toBe(false);
  });

  it('hides the editing control under accept, locks it on for design edits, and leaves it free otherwise', () => {
    const byValue = Object.fromEntries(reviewDecisions('SUBMITTED').map((d) => [d.value, d]));
    expect(byValue.accept.editingControl).toBe('hidden');
    expect(byValue.edits.editingControl).toBe('locked');
    expect(byValue.clarify.editingControl).toBe('choice');
    expect(byValue.approval.editingControl).toBe('choice');
  });

  it('cannot request design edits without granting editing', () => {
    const edits = reviewDecision('edits', 'SUBMITTED');
    expect(edits.editingControl).toBe('locked');
    expect(edits.defaultEditingEnabled).toBe(true);
  });

  it('never shows an editing control that the transition would immediately undo', () => {
    for (const d of reviewDecisions('SUBMITTED')) {
      if (d.nextState !== 'CHANGES_REQUESTED') expect(d.editingControl).toBe('hidden');
    }
  });

  it('locks the control only in the on position — a locked-off box would just be a hidden one', () => {
    for (const d of reviewDecisions('SUBMITTED')) {
      if (d.editingControl === 'locked') expect(d.defaultEditingEnabled).toBe(true);
      if (d.editingControl === 'hidden') expect(d.defaultEditingEnabled).toBe(false);
    }
  });

  it('requires a message for everything except accept', () => {
    const byValue = Object.fromEntries(reviewDecisions('SUBMITTED').map((d) => [d.value, d]));
    expect(byValue.accept.messageRequired).toBe(false);
    expect(byValue.clarify.messageRequired).toBe(true);
    expect(byValue.edits.messageRequired).toBe(true);
    expect(byValue.approval.messageRequired).toBe(true);
  });

  it('leaves no decision silent: it either requires a message or stands on its header', () => {
    for (const state of ['SUBMITTED', 'CHANGES_REQUESTED', 'ACCEPTED']) {
      for (const d of reviewDecisions(state)) {
        expect(d.messageRequired || d.commentHeader.trim().length > 0).toBe(true);
      }
    }
  });

  it('carries no canned message — an unwritten decision is its header alone', () => {
    for (const d of reviewDecisions('SUBMITTED')) {
      expect(d).not.toHaveProperty('defaultMessage');
    }
  });

  it('carries the accept wording through from jobReviewLabels', () => {
    const accept = reviewDecision('accept', 'ACCEPTED');
    expect(accept.optionLabel).toBe(jobReviewLabels('ACCEPTED').acceptOption);
    expect(accept.buttonLabel).toBe('Re-accept');
  });

  it('names an approval request distinctly in the version history', () => {
    expect(reviewDecision('approval', 'SUBMITTED').historyNote).toBe('Approval requested');
    expect(reviewDecision('edits', 'SUBMITTED').historyNote).toBe('Changes requested');
  });

  it('exposes the decision values as a stable list', () => {
    expect(REVIEW_DECISIONS).toEqual(['accept', 'clarify', 'edits', 'approval']);
  });
});
