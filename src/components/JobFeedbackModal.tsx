import React, { useState, useEffect, useRef } from "react";
import { useMutation } from '@apollo/client';
import { Alert, AlertTitle, Box, Button, FormControl, FormControlLabel, Modal, Radio, RadioGroup, TextField, Typography } from "@mui/material";
import { styled } from "@mui/system";

import { REVIEW_JOB } from '../gql/mutations';
import { jobReviewLabels, reviewDecisions, type ReviewDecisionValue } from './jobReviewLabels';
import { buildReviewInput, retryOperationId } from '../utils/jobReview';


const CenteredModal = styled(Modal)`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
`;

const ModalBox = styled(Box)`
  background-color: #fff;
  padding: 1rem;
  border-radius: 4px;
  outline: none;
  margin: 20px;
  width: 500px;
  max-height: 90vh;
  overflow-y: auto;
`;

const FeedbackField = styled(TextField)`
  margin-bottom: 10px;
`;


export default function JobFeedbackModal(props: any) {
  const { open, onClose, onSubmitted, id, jobName, jobUsername, jobEmail, jobInstitution, jobTime, jobState, customerHasNotSeenEdits } = props;

  const [decision,        setDecision]        = useState<ReviewDecisionValue | ''>('');
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [submitting,      setSubmitting]      = useState(false);
  const [submitError,     setSubmitError]     = useState<string | null>(null);
  const operationIdRef = useRef<string | null>(null);

  const [reviewJob] = useMutation(REVIEW_JOB);

  // Reachable from SUBMITTED, CHANGES_REQUESTED and ACCEPTED alike, and the
  // accept option means something different in each — see jobReviewLabels.
  // Staff reach re-acceptance here rather than from the SOW card so that "send
  // it back to the customer" stays an equally available choice at the same
  // moment.
  /**
   * The job as it was when this modal opened, frozen for as long as it stays open.
   *
   * Submitting refetches the job, and the refetch lands while the modal is still
   * mounted: the state moves to CHANGES_REQUESTED and the version history gains
   * the decision's entry. Reading those live repainted the modal against the
   * *outcome* of the decision in the instant before it closed — the red banner
   * appeared for a frame on a submit that had shown no banner while it was being
   * made, and the radio labels rewrote themselves underneath the reader.
   *
   * `open` alone drives this. It is set once per opening, before any submit.
   */
  const [snapshot, setSnapshot] = useState<{ jobState: string | null; unseenEdits: boolean }>({ jobState: null, unseenEdits: false });

  const decisions = reviewDecisions(snapshot.jobState, snapshot.unseenEdits);
  const chosen = decisions.find((d) => d.value === decision) ?? null;
  const accept = jobReviewLabels(snapshot.jobState, snapshot.unseenEdits);

  // TechnicianView keeps this modal mounted and only toggles `open`, so nothing
  // clears the form between openings. The page reload used to do it by
  // accident; reopening Review would otherwise show the last decision, its
  // message, and any stale error still filled in.
  useEffect(() => {
    if (open) {
      setDecision('');
      setFeedbackMessage('');
      setSubmitError(null);
      setSnapshot({ jobState: jobState ?? null, unseenEdits: customerHasNotSeenEdits === true });
      operationIdRef.current = retryOperationId(operationIdRef.current, { type: 'reopen' });
    }
    // Intentionally keyed on `open` alone: see the comment on `snapshot`. Adding
    // the job fields here would reintroduce exactly the repaint it prevents.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleDecisionChange = (event: any) => {
    const value = event.target.value as ReviewDecisionValue;
    operationIdRef.current = retryOperationId(operationIdRef.current, { type: 'edit' });
    setDecision(value);
  };

  const handleFeedbackMessageChange = (event: any) => {
    operationIdRef.current = retryOperationId(operationIdRef.current, { type: 'edit' });
    setFeedbackMessage(event.target.value);
  };

  const handleSubmit = async () => {
    if (!chosen) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      operationIdRef.current = retryOperationId(operationIdRef.current, { type: 'submit', candidate: crypto.randomUUID() });
      await reviewJob({
        variables: {
          input: buildReviewInput({
            operationId: operationIdRef.current,
            jobId: id,
            decision: chosen.decision,
            message: feedbackMessage
          })
        }
      });

      await onSubmitted?.();
      operationIdRef.current = retryOperationId(operationIdRef.current, { type: 'success' });
      onClose();
    } catch (error: any) {
      operationIdRef.current = retryOperationId(operationIdRef.current, { type: 'failure' });
      // Previously swallowed into console.log and then hidden by the reload, so
      // a decision that never reached the server still looked like it landed.
      console.error(error);
      setSubmitError(error?.message ?? 'Could not record the decision. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <CenteredModal
      open={open}
      disableEscapeKeyDown={submitting}
      onClose={() => {
        if (!submitting) onClose();
      }}
    >
      <ModalBox>
        <Typography variant="h6" sx={{ mb: 1 }}>Review Job</Typography>

        {jobName && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2">{jobName}</Typography>
            {jobUsername && (
              <Typography variant="body2" color="text.secondary">
                {jobUsername} {jobEmail ? `(${jobEmail})` : ''}
              </Typography>
            )}
            {jobInstitution && (
              <Typography variant="body2" color="text.secondary">
                {jobInstitution}
              </Typography>
            )}
            {jobTime && (
              <Typography variant="body2" color="text.secondary">
                Submitted: {jobTime.slice(0, 16).replace('T', ' ')}
              </Typography>
            )}
          </Box>
        )}

        <FormControl component="fieldset" sx={{width: '100%'}} disabled={submitting}>

          <RadioGroup onChange={handleDecisionChange} value={decision} name="feedback-type" aria-label="feedback-type">
            {decisions.map((option) => (
              <React.Fragment key={option.value}>
                <FormControlLabel control={<Radio disabled={submitting} />} value={option.value} label={option.optionLabel} />
                {decision === option.value && (
                  <Box sx={{ ml: 4, mb: 1 }}>
                    {/* Every option's note now appears only once that option is
                        chosen, accept included — it used to sit above the whole
                        group, warning about a decision the reader had not made.
                        Accept keeps the Alert treatment rather than dropping to
                        the grey Typography the others use: it is the one note
                        that commits somebody else, and an Alert carries an icon
                        and a role, so the warning does not rest on colour alone. */}
                    {option.value === 'accept' && accept.onCustomersBehalf ? (
                      <Alert severity="error" sx={{ mb: 1 }}>
                        <AlertTitle sx={{ fontWeight: 500 }}>Accepting commits customer to this job on their behalf.</AlertTitle>
                        {accept.acceptNote}
                      </Alert>
                    ) : (
                      option.note && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                          {option.note}
                        </Typography>
                      )
                    )}
                    <FeedbackField
                      fullWidth
                      multiline
                      minRows={option.messageRequired ? 3 : 2}
                      onChange={handleFeedbackMessageChange}
                      value={feedbackMessage}
                      disabled={submitting}
                      required={option.messageRequired}
                      label={option.messageRequired ? 'Message to the customer' : 'Message to the customer (optional)'}
                      helperText={option.messageRequired ? undefined : ''}
                    />
                  </Box>
                )}
              </React.Fragment>
            ))}
          </RadioGroup>

          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={onClose} color="inherit" disabled={submitting}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={submitting || !chosen || (chosen.messageRequired && !feedbackMessage.trim())}
            >
              {submitting ? 'Saving…' : (chosen?.buttonLabel ?? 'Submit Decision')}
            </Button>
          </Box>

        </FormControl>
      </ModalBox>
    </CenteredModal>
  );
}
