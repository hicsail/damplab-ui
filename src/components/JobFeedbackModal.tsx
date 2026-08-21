import React, { useState, useEffect, useContext } from "react";
import { useMutation } from '@apollo/client';
import { Alert, Box, Button, Checkbox, FormControl, FormControlLabel, Modal, Radio, RadioGroup, TextField, Typography } from "@mui/material";
import { styled } from "@mui/system";

import { MUTATE_JOB_STATE, SET_JOB_CUSTOMER_EDITING, CREATE_COMMENT } from '../gql/mutations';
import { UserContext } from '../contexts/UserContext';
import { reviewDecisions, type ReviewDecisionValue } from './jobReviewLabels';


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
  const { open, onClose, onSubmitted, id, jobName, jobUsername, jobEmail, jobInstitution, jobTime, jobState } = props;

  const [decision,        setDecision]        = useState<ReviewDecisionValue | ''>('');
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [editingEnabled,  setEditingEnabled]  = useState(false);
  const [submitting,      setSubmitting]      = useState(false);
  const [submitError,     setSubmitError]     = useState<string | null>(null);

  const [mutateJobState]     = useMutation(MUTATE_JOB_STATE);
  const [setCustomerEditing] = useMutation(SET_JOB_CUSTOMER_EDITING);
  const [createComment]      = useMutation(CREATE_COMMENT);
  const userContext          = useContext(UserContext);

  // Reachable from SUBMITTED, CHANGES_REQUESTED and ACCEPTED alike, and the
  // accept option means something different in each — see jobReviewLabels.
  // Staff reach re-acceptance here rather than from the SOW card so that "send
  // it back to the customer" stays an equally available choice at the same
  // moment.
  const decisions = reviewDecisions(jobState);
  const chosen = decisions.find((d) => d.value === decision) ?? null;

  // TechnicianView keeps this modal mounted and only toggles `open`, so nothing
  // clears the form between openings. The page reload used to do it by
  // accident; reopening Review would otherwise show the last decision, its
  // message, and any stale error still filled in.
  useEffect(() => {
    if (open) {
      setDecision('');
      setFeedbackMessage('');
      setEditingEnabled(false);
      setSubmitError(null);
    }
  }, [open]);

  const handleDecisionChange = (event: any) => {
    const value = event.target.value as ReviewDecisionValue;
    setDecision(value);
    // Each decision carries its own sensible answer to "should they be able to
    // edit?"; staff override it from here, not by remembering to.
    setEditingEnabled(decisions.find((d) => d.value === value)?.defaultEditingEnabled ?? false);
  };

  const handleFeedbackMessageChange = (event: any) => {
    setFeedbackMessage(event.target.value);
  };

  const handleSubmit = async () => {
    if (!chosen) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      // Editing first, deliberately. These three writes are not atomic, and if
      // one is going to fail it should fail before the state moves: a job left
      // in its old state is recoverable, whereas one handed to the customer
      // with editing still open is access we meant to withhold.
      await setCustomerEditing({ variables: { jobId: id, enabled: editingEnabled } });
      await mutateJobState({ variables: { ID: id, State: chosen.nextState, Note: chosen.historyNote } });

      // Every decision is announced. The customer cannot act on — or even
      // notice — a decision they are never told about, and several of these
      // silently change what they are allowed to do. The header names the
      // decision, which is the whole message where staff wrote none.
      const email = userContext.userProps?.idTokenParsed?.email ?? 'technician@bu.edu';
      const body = feedbackMessage.trim();
      // Only offered when they can actually act on it. Pointing someone at an
      // editor they are not allowed to save from is worse than no link.
      const editorLink = editingEnabled ? `\n\n[Open the workflow editor](/job_editor/${id})` : '';
      const content = `${chosen.commentHeader}${body ? `\n\n${body}` : ''}${editorLink}`;

      await createComment({
        variables: {
          input: {
            jobId: id,
            content,
            author: email,
            authorType: 'STAFF',
            isInternal: false,
          },
        },
      });

      // Pull the job (and its versions) fresh rather than reloading the page.
      // The old `window.location.reload()` fired while this handler's own state
      // updates were still settling — a teardown race that is the leading
      // suspect for the dev-mode "Application Error" seen right after a
      // decision, and unnecessary regardless: the job query is what changed.
      await onSubmitted?.();
      onClose();
    } catch (error: any) {
      // Previously swallowed into console.log and then hidden by the reload, so
      // a decision that never reached the server still looked like it landed.
      console.error(error);
      setSubmitError(error?.message ?? 'Could not record the decision. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <CenteredModal open={open} onClose={onClose}>
      <ModalBox>
        <Typography variant="h6" sx={{ mb: 1 }}>Review Job</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Record a decision on this job. Whichever you pick is posted to the client as a comment.
        </Typography>

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

        <FormControl component="fieldset" sx={{width: '100%'}}>

          <RadioGroup onChange={handleDecisionChange} value={decision} name="feedback-type" aria-label="feedback-type">
            {decisions.map((option) => (
              <React.Fragment key={option.value}>
                <FormControlLabel control={<Radio />} value={option.value} label={option.optionLabel} />
                {decision === option.value && (
                  <Box sx={{ ml: 4, mb: 1 }}>
                    {option.note && (
                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {option.note}
                      </Typography>
                    )}
                    <FeedbackField
                      fullWidth
                      multiline
                      minRows={option.messageRequired ? 3 : 2}
                      onChange={handleFeedbackMessageChange}
                      value={feedbackMessage}
                      required={option.messageRequired}
                      label={option.messageRequired ? 'Message to the customer' : 'Message to the customer (optional)'}
                      helperText={option.messageRequired ? undefined : `Left blank, the comment reads “${option.commentHeader}”.`}
                    />
                  </Box>
                )}
              </React.Fragment>
            ))}
          </RadioGroup>

          {/* Independent of the decision above — who holds the job and whether they
              may change it are two separate calls — except where the decision
              settles it: accept returns the job to the lab, and a design-edit
              request cannot coherently withhold the editor. */}
          {chosen && chosen.editingControl !== 'hidden' && (
            <Box sx={{ mt: 1, mb: 1 }}>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={editingEnabled}
                    disabled={chosen.editingControl === 'locked'}
                    onChange={(e) => setEditingEnabled(e.target.checked)}
                  />
                }
                label="Let the customer edit the workflow"
              />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 4 }}>
                {chosen.editingControl === 'locked'
                  ? 'Always on for a design-edit request — you are asking the customer to change the workflow, so they need the editor.'
                  : editingEnabled
                    ? 'The customer can open the workflow editor and save changes to this job.'
                    : 'The customer can view the workflow but not change it.'}
              </Typography>
            </Box>
          )}

          <Box sx={{ mt: 1, mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {chosen
                ? `Posted to the client as a comment headed “${chosen.commentHeader}”.`
                : 'Your decision will be posted to the client as a comment.'}
            </Typography>
          </Box>

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
