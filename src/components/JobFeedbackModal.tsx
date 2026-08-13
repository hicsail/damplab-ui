import React, { useState, useEffect, useContext } from "react";
import { useMutation } from '@apollo/client';
import { Box, Button, FormControl, FormControlLabel, Modal, Radio, RadioGroup, TextField, Typography } from "@mui/material";
import { styled } from "@mui/system";

import { MUTATE_JOB_STATE, CREATE_COMMENT } from '../gql/mutations';
import { UserContext } from '../contexts/UserContext';


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
`;

const FeedbackField = styled(TextField)`
  margin-bottom: 10px;
`;


export default function JobFeedbackModal(props: any) {
  const { onClose, id, jobName, jobUsername, jobEmail, jobInstitution, jobTime, jobState } = props;
  
  const [feedbackType,      setFeedbackType]      = useState("");
  const [feedbackMessage,   setFeedbackMessage]   = useState("");
  const [mutationCompleted, setMutationCompleted] = useState(false);

  const [mutateJobState] = useMutation(MUTATE_JOB_STATE);
  const [createComment]  = useMutation(CREATE_COMMENT);
  const userContext      = useContext(UserContext);

  useEffect(() => {
    if (mutationCompleted) {
      onClose(); // Close the modal when the mutation is completed
      setMutationCompleted(false)
    }
  }, [mutationCompleted, onClose]);

  const handleFeedbackTypeChange = (event: any) => {
    setFeedbackType(event.target.value);
  };

  const handleFeedbackMessageChange = (event: any) => {
    setFeedbackMessage(event.target.value);
  };
  
  const handleSubmit = async () => {
    if (!feedbackType) return;

    let updatedState: string;
    switch (feedbackType) {
      case "looks-good":
        updatedState = "ACCEPTED";
        break;
      case "minor-changes":
      case "major-changes":
        updatedState = "CHANGES_REQUESTED";
        break;
      default:
        updatedState = jobState || "SUBMITTED";
    }

    try {
      await mutateJobState({
        variables: { ID: id, State: updatedState },
        onError: (error: any) => {
          console.log(error.networkError?.result?.errors);
        },
        onCompleted: () => {
          setMutationCompleted(true);
        }
      });
  
      // Always posted — the customer cannot act on feedback they never see.
      if (feedbackMessage.trim()) {
        const email = userContext.userProps?.idTokenParsed?.email ?? 'technician@bu.edu';
        // Requesting changes hands the customer the editor; the link is what
        // turns the request into something they can actually do.
        const editorLink = `[Open the workflow editor](/job_editor/${id})`;
        const content = updatedState === 'CHANGES_REQUESTED'
          ? `${feedbackMessage.trim()}\n\n${editorLink}`
          : feedbackMessage.trim();

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
      }

      window.location.reload();
    } catch (error) {
      console.log(error);
    }
  };  
  
  
  return (
    <CenteredModal open={props.open} onClose={props.onClose}>
      <ModalBox>
        <Typography variant="h6" sx={{ mb: 1 }}>Review Job</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Record a decision on this job and optionally send structured feedback to the client.
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

          <RadioGroup onChange = {handleFeedbackTypeChange} value = {feedbackType} name = "feedback-type" aria-label = "feedback-type">

            <FormControlLabel control={<Radio />} value="looks-good"    label="Accept job (ready to proceed)" />

            <FormControlLabel control={<Radio />} value="minor-changes" label="Request clarification" />
              {feedbackType === "minor-changes" && (
                <FeedbackField
                  fullWidth
                  multiline
                  minRows={3}
                  onChange={handleFeedbackMessageChange}
                  value={feedbackMessage}
                  label="What needs clarifying?"
                  required
                />
              )}

            <FormControlLabel control={<Radio />} value="major-changes" label="Request design edits"/>
              {feedbackType === "major-changes" && (
                <FeedbackField
                  fullWidth
                  multiline
                  minRows={3}
                  onChange={handleFeedbackMessageChange}
                  value={feedbackMessage}
                  label="Explain what needs to change"
                  required
                />
              )}

          </RadioGroup>

          <Box sx={{ mt: 1, mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {feedbackType && feedbackType !== 'looks-good'
                ? 'This will be posted to the client as a comment, with a link to the workflow editor.'
                : 'Your decision will be posted to the client as a comment.'}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={onClose} color="inherit">
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={!feedbackType || (feedbackType !== 'looks-good' && !feedbackMessage.trim())}
            >
              {feedbackType === "looks-good"
                ? "Accept Job"
                : "Submit Decision"}
            </Button>
          </Box>
          
        </FormControl>
      </ModalBox>
    </CenteredModal>
  );
}
