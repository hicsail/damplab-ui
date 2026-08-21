/**
 * Wording for the accept option in the staff Review Job modal.
 *
 * Two independent facts about the job decide it:
 *
 *  - *Whose spec is this?* SUBMITTED is the only state a job reaches because
 *    the customer affirmatively put a spec forward — it is what an initial
 *    submit and a resubmit both produce. From anywhere else staff are accepting
 *    on the customer's behalf: a job sitting in CHANGES_REQUESTED may hold
 *    edits the customer is still working on and has not handed back.
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
}

/** The state in which the job on screen is the spec the customer last put forward. */
const CUSTOMER_SUBMITTED = 'SUBMITTED';

export function jobReviewLabels(jobState: string | null | undefined): JobReviewLabels {
  const onCustomersBehalf = jobState !== CUSTOMER_SUBMITTED;
  const isReAccept = jobState === 'ACCEPTED';

  if (!onCustomersBehalf) {
    return {
      acceptOption: 'Accept job (ready to proceed)',
      acceptButton: 'Accept Job',
      acceptNote: null
    };
  }

  if (isReAccept) {
    return {
      acceptOption: "Re-accept on the customer's behalf (ready to proceed)",
      acceptButton: 'Re-accept',
      acceptNote:
        'Confirms the job as it now stands, without asking the customer again. This unlocks sending the Statement of Work. If the change should be the customer’s call, request edits below instead.'
    };
  }

  // CHANGES_REQUESTED — and any state the Review button should not have opened
  // from, which is safest described the same way.
  return {
    acceptOption: "Accept on the customer's behalf (ready to proceed)",
    acceptButton: 'Accept Job',
    acceptNote:
      'The customer still has this job open for editing, whether or not they have resubmitted it. Accepting takes it back and closes their editor. If the change should be their call, request edits below instead.'
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
  optionLabel: string;
  buttonLabel: string;
  /** Shown under the option once chosen, to spell out consequences. Null when there are none worth calling out. */
  note: string | null;
  /**
   * Prefixed to the comment so the customer can see which decision this was.
   *
   * Plain text on purpose: comment bodies are not markdown (CommentBody only
   * linkifies `[label](url)` and bare URLs), so any `**` would render literally.
   */
  commentHeader: string;
  /**
   * True where staff must write something. Where false the header stands alone:
   * "Lab decision: Job accepted" is the whole message, and inventing a canned
   * body to sit under it would only pad the comment with words no one chose.
   */
  messageRequired: boolean;
  nextState: 'ACCEPTED' | 'CHANGES_REQUESTED';
  /**
   * How the "let the customer edit" checkbox behaves for this decision.
   *
   *  - `hidden`  — the control cannot mean anything. Accepting returns the job to
   *    the lab, and editingClosedByTransition closes editing on any move out of
   *    CHANGES_REQUESTED, so a ticked box would be undone a moment later. Better
   *    to show no control than one that does not hold.
   *  - `locked`  — shown, ticked, and not clickable. Asking the customer to edit
   *    the design while denying them the editor is a self-contradiction, so the
   *    grant is part of the decision rather than a box to remember.
   *  - `choice`  — genuinely staff's call.
   *
   * Only ever locked *on*: a locked-off box tells the reader nothing a hidden one
   * would not, while implying a choice exists.
   */
  editingControl: 'hidden' | 'locked' | 'choice';
  /**
   * Whether the customer ends up able to edit.
   *
   * On only for a design-edit request, the one decision that is an invitation to
   * change the canvas. A clarification is a question — it is answered in the
   * comments, not by reopening the editor — and being asked to approve someone
   * else's edit is not an invitation to make your own. Staff can tick the box in
   * both of those; the point is that they choose it rather than inherit it.
   */
  defaultEditingEnabled: boolean;
  /** Version-history label, so an approval request does not read as "Changes requested". */
  historyNote: string;
}

const CUSTOMER_EDITOR_LINK_STATE = 'CHANGES_REQUESTED';

export function reviewDecisions(jobState: string | null | undefined): ReviewDecisionSpec[] {
  const accept = jobReviewLabels(jobState);

  return [
    {
      value: 'accept',
      optionLabel: accept.acceptOption,
      buttonLabel: accept.acceptButton,
      note: accept.acceptNote,
      commentHeader: 'Lab decision: Job accepted',
      messageRequired: false,
      nextState: 'ACCEPTED',
      editingControl: 'hidden',
      defaultEditingEnabled: false,
      historyNote: 'Accepted'
    },
    {
      value: 'clarify',
      optionLabel: 'Request clarification',
      buttonLabel: 'Submit Decision',
      note: null,
      commentHeader: 'Lab decision: Clarification requested',
      messageRequired: true,
      nextState: CUSTOMER_EDITOR_LINK_STATE,
      editingControl: 'choice',
      defaultEditingEnabled: false,
      historyNote: 'Changes requested'
    },
    {
      value: 'edits',
      optionLabel: 'Request design edits',
      buttonLabel: 'Submit Decision',
      note: null,
      commentHeader: 'Lab decision: Design edits requested',
      messageRequired: true,
      nextState: CUSTOMER_EDITOR_LINK_STATE,
      editingControl: 'locked',
      defaultEditingEnabled: true,
      historyNote: 'Changes requested'
    },
    {
      value: 'approval',
      optionLabel: 'Request approval of edits',
      buttonLabel: 'Request Approval',
      note: 'Hands the job back so the customer can approve edits the lab made. They see the job and can approve it, but cannot change it unless you also enable editing below.',
      commentHeader: 'Lab decision: Your approval requested',
      messageRequired: true,
      nextState: CUSTOMER_EDITOR_LINK_STATE,
      editingControl: 'choice',
      defaultEditingEnabled: false,
      historyNote: 'Approval requested'
    }
  ];
}

export function reviewDecision(value: ReviewDecisionValue, jobState: string | null | undefined): ReviewDecisionSpec {
  const found = reviewDecisions(jobState).find((d) => d.value === value);
  if (!found) throw new Error(`Unknown review decision: ${value}`);
  return found;
}
