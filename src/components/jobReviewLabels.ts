import type { JobReviewDecision } from '../utils/jobReview';

/**
 * Wording for the accept option in the staff Review Job modal.
 *
 * Three independent facts about the job decide it:
 *
 *  - *Whose spec is this?* SUBMITTED is the only state a job reaches because
 *    the customer affirmatively put a spec forward — it is what an initial
 *    submit and a resubmit both produce. From anywhere else staff are accepting
 *    on the customer's behalf: a job sitting in CHANGES_REQUESTED may hold
 *    edits the customer is still working on and has not handed back.
 *  - *Has the lab edited it since?* A SUBMITTED job whose newest content version
 *    is STAFF-authored is still, by its state, the customer's spec — but it is
 *    no longer the spec they last saw. Staff can edit a submitted job without
 *    handing it back, and accepting it then binds the customer to changes they
 *    have never been shown. The state cannot express this, so the caller passes
 *    it in; see `latestContentVersion` in utils/jobGraphDiff.
 *  - *Has it been accepted before?* Re-accepting an ACCEPTED job re-stamps the
 *    billing fingerprint that the SOW send gate compares against, which is how
 *    staff release a send that a later job edit locked.
 */
export interface JobReviewLabels {
  /** Radio label for the accept option. */
  acceptOption: string;
  /** Submit button label once accept is chosen. */
  acceptButton: string;
  /** Shown under the accept option to spell out its consequences, or null when there are none worth calling out. */
  acceptNote: string | null;
  /**
   * True when accepting would commit the customer to something they have not
   * themselves put forward. The modal states this in red, above the choices,
   * because it is the fact staff most need before deciding — not after.
   */
  onCustomersBehalf: boolean;
}

/** The state in which the job on screen is the spec the customer last put forward. */
const CUSTOMER_SUBMITTED = 'SUBMITTED';

/**
 * @param customerHasNotSeenEdits True when the newest *content* version of a
 *   SUBMITTED job was written by staff, i.e. the lab has edited it since the
 *   customer last put it forward. Ignored in the other states, which already say
 *   the acceptance is on the customer's behalf.
 */
export function jobReviewLabels(jobState: string | null | undefined, customerHasNotSeenEdits = false): JobReviewLabels {
  const onCustomersBehalf = jobState !== CUSTOMER_SUBMITTED;
  const isReAccept = jobState === 'ACCEPTED';

  if (!onCustomersBehalf) {
    if (customerHasNotSeenEdits) {
      return {
        acceptOption: "Accept on the customer's behalf (ready to proceed)",
        acceptButton: 'Accept Job',
        acceptNote:
          'The lab has edited this job since the customer submitted it, and they have not seen those edits. Accepting commits them to the workflow as it now stands. To let them see it first, request approval of edits below.',
        onCustomersBehalf: true
      };
    }
    return {
      acceptOption: 'Accept job (ready to proceed)',
      acceptButton: 'Accept Job',
      acceptNote: null,
      onCustomersBehalf: false
    };
  }

  if (isReAccept) {
    return {
      acceptOption: "Re-accept on the customer's behalf (ready to proceed)",
      acceptButton: 'Re-accept',
      acceptNote:
        'Confirms the job as it now stands, without asking the customer again. This unlocks sending the Statement of Work. If the change should be the customer’s call, request edits below instead.',
      onCustomersBehalf: true
    };
  }

  // CHANGES_REQUESTED — and any state the Review button should not have opened
  // from, which is safest described the same way.
  return {
    acceptOption: "Accept on the customer's behalf (ready to proceed)",
    acceptButton: 'Accept Job',
    acceptNote:
      'The customer still has this job open for editing, whether or not they have resubmitted it. Accepting takes it back and closes their editor. If the change should be their call, request edits below instead.',
    onCustomersBehalf: true
  };
}

/**
 * The decisions staff can record in the Review Job modal.
 *
 * `approval` is the one that is not simply "the customer must change something":
 * it hands the job back so they can sign off on edits the *lab* made. It shares
 * CHANGES_REQUESTED with the two change requests because in all three cases the
 * job is with the customer; what separates it is that editing stays closed, and
 * a customer holding a job they cannot edit is being asked to approve it.
 */
export const REVIEW_DECISIONS = ['accept', 'clarify', 'edits', 'approval'] as const;
export type ReviewDecisionValue = (typeof REVIEW_DECISIONS)[number];

export interface ReviewDecisionSpec {
  value: ReviewDecisionValue;
  decision: JobReviewDecision;
  optionLabel: string;
  buttonLabel: string;
  /** Shown under the option once chosen, to spell out consequences. Null when there are none worth calling out. */
  note: string | null;
  /** Only acceptance permits an empty note. */
  messageRequired: boolean;
}

export function reviewDecisions(jobState: string | null | undefined, customerHasNotSeenEdits = false): ReviewDecisionSpec[] {
  const accept = jobReviewLabels(jobState, customerHasNotSeenEdits);

  return [
    {
      value: 'accept',
      decision: 'ACCEPT',
      optionLabel: accept.acceptOption,
      buttonLabel: accept.acceptButton,
      note: accept.acceptNote,
      messageRequired: false
    },
    {
      value: 'clarify',
      decision: 'REQUEST_CLARIFICATION',
      optionLabel: 'Request clarification',
      buttonLabel: 'Submit Decision',
      note: 'The customer will be asked to reply. They can view the workflow but cannot edit it.',
      messageRequired: true
    },
    {
      value: 'edits',
      decision: 'REQUEST_EDITS',
      optionLabel: 'Request design edits',
      buttonLabel: 'Submit Decision',
      note: 'The customer can edit the workflow and submit the updated workflow for review.',
      messageRequired: true
    },
    {
      value: 'approval',
      decision: 'REQUEST_APPROVAL',
      optionLabel: 'Request approval of edits',
      buttonLabel: 'Request Approval',
      note: 'The customer can view and approve the lab’s edits, but cannot edit the workflow.',
      messageRequired: true
    }
  ];
}

export function reviewDecision(value: ReviewDecisionValue, jobState: string | null | undefined, customerHasNotSeenEdits = false): ReviewDecisionSpec {
  const found = reviewDecisions(jobState, customerHasNotSeenEdits).find((d) => d.value === value);
  if (!found) throw new Error(`Unknown review decision: ${value}`);
  return found;
}
