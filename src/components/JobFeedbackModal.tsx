import React, { useState, useEffect } from "react";
import { useMutation } from '@apollo/client';

import { MUTATE_JOB_STATE } from '../gql/mutations';

import {
  Modal,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  TextField,
  Button,
  Box
} from "@mui/material";

import { styled } from "@mui/system";

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
`;


function JobFeedbackModal(props: any) {
  const { open, onClose, id } = props;
  const [feedbackType, setFeedbackType] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [newState, setNewState] = useState("");
  const [mutationCompleted, setMutationCompleted] = useState(false);

  const handleFeedbackTypeChange = (event: any) => {
    setFeedbackType(event.target.value);
  };

  const handleFeedbackMessageChange = (event: any) => {
    setFeedbackMessage(event.target.value);
  };
  
  const [mutateJobState, { loading, error, data }] = useMutation(MUTATE_JOB_STATE);

  useEffect(() => {
    if (mutationCompleted) {
      onClose(); // Close the modal when the mutation is completed
      setMutationCompleted(false)
    }
  }, [mutationCompleted, onClose]);


  const handleSubmit = async () => {
    feedbackType === "looks-good" ? setNewState("ACCEPTED") : setNewState("REJECTED");
    
    const updatedState = feedbackType === "looks-good" ? "ACCEPTED" : "REJECTED";
    try {
      await mutateJobState({
        variables: {
          ID: id,
          State: updatedState,
        },
        onError: (error: any) => {
          console.log(error.networkError?.result?.errors);
        },
        onCompleted: () => {
          window.location.reload();
        }
      });
  
      onClose(); // Close the modal after the mutation is completed
    } catch (error) {
      console.log(error);
    }
  };  
  
  
  
  return (
    <CenteredModal open={props.open} onClose={props.onClose}>
      <ModalBox>
        <h2>Job Feedback</h2>
        <FormControl component="fieldset">
          <RadioGroup
            aria-label="feedback-type"
            name="feedback-type"
            value={feedbackType}
            onChange={handleFeedbackTypeChange}
          >
            <FormControlLabel
              value="looks-good"
              control={<Radio />}
              label="Job Accepted"
            />
            <FormControlLabel
              value="minor-changes"
              control={<Radio />}
              label="Needs Minor Changes"
            />
            {feedbackType === "minor-changes" && (
              <TextField
                id="feedback-message"
                label="Feedback message"
                variant="outlined"
                margin="normal"
                value={feedbackMessage}
                onChange={handleFeedbackMessageChange}
                fullWidth
              />
            )}
            <FormControlLabel
              value="major-changes"
              control={<Radio />}
              label="Needs Major Changes"
            />
            {feedbackType === "major-changes" && (
              <TextField
                id="feedback-message"
                label="Reason for major changes"
                variant="outlined"
                margin="normal"
                value={feedbackMessage}
                onChange={handleFeedbackMessageChange}
                required
                fullWidth
              />
            )}
          </RadioGroup>
          {feedbackType && (
            <Button variant="contained" color="inherit" onClick={handleSubmit}>
              {feedbackType === "looks-good"
                ? "Accept Job"
                : "Send Feedback"}
            </Button>
          )}
        </FormControl>
      </ModalBox>
    </CenteredModal>
  );
}

export default JobFeedbackModal;
