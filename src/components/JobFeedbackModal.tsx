import React, { useState, useEffect, useContext } from "react";
import { useMutation } from '@apollo/client';
import { Box, Button, FormControl, FormControlLabel, Modal, Radio, RadioGroup, TextField, Typography, Checkbox } from "@mui/material";
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
  const {
    onClose,
    id,
    jobName,
    jobUsername,
    jobEmail,
    jobInstitution,
    jobTime,
    jobState,
    screeningBlocksAccept = false,
    screeningMessage = null,
  } = props;
  
  const [feedbackType,      setFeedbackType]      = useState("");
  const [feedbackMessage,   setFeedbackMessage]   = useState("");
  const [sendAsComment,     setSendAsComment]     = useState(true);
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
  
      if (sendAsComment && feedbackMessage.trim()) {
        const email = userContext.userProps?.idTokenParsed?.email ?? 'technician@bu.edu';
        await createComment({
          variables: {
            input: {
              jobId: id,
              content: feedbackMessage.trim(),
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

            {feedbackType === "looks-good" && screeningBlocksAccept && screeningMessage ? (
              <Typography variant="body2" color="error" sx={{ mb: 1, ml: 1 }}>
                {screeningMessage}
              </Typography>
            ) : null}

            <FormControlLabel control={<Radio />} value="minor-changes" label="Request minor changes" />
              {feedbackType === "minor-changes" && (
                <FeedbackField
                  fullWidth
                  multiline
                  minRows={3}
                  onChange={handleFeedbackMessageChange}
                  value={feedbackMessage}
                  label="Describe the minor changes needed"
                  required
                />
              )}

            <FormControlLabel control={<Radio />} value="major-changes" label="Request major changes / redesign"/>
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
            <FormControlLabel
              control={
                <Checkbox
                  checked={sendAsComment}
                  onChange={(e) => setSendAsComment(e.target.checked)}
                />
              }
              label="Post this feedback as a visible comment to the client"
            />
          </Box>

          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={onClose} color="inherit">
              Cancel
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={handleSubmit}
              disabled={
                !feedbackType ||
                (feedbackType !== 'looks-good' && !feedbackMessage.trim()) ||
                (feedbackType === 'looks-good' && screeningBlocksAccept)
              }
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
