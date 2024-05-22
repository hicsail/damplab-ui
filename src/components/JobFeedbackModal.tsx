import React, { useState, useEffect } from "react";
import { useMutation } from '@apollo/client';
import { Box, Button, FormControl, FormControlLabel, Modal, Radio, RadioGroup, TextField } from "@mui/material";
import { styled } from "@mui/system";

import { MUTATE_JOB_STATE } from '../gql/mutations';


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
  id: feedback-message;
  variant: outlined;
  margin: normal;
  margin-bottom: 10px;
`;


export default function JobFeedbackModal(props: any) {
  const { open, onClose, id } = props;
  
  const [feedbackType,      setFeedbackType]      = useState("");
  const [feedbackMessage,   setFeedbackMessage]   = useState("");
  const [newState,          setNewState]          = useState("");
  const [mutationCompleted, setMutationCompleted] = useState(false);

  const [mutateJobState, { loading, error, data }] = useMutation(MUTATE_JOB_STATE);

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
    feedbackType === "looks-good" ? setNewState("ACCEPTED") : setNewState("REJECTED");
    
    const updatedState = feedbackType === "looks-good" ? "ACCEPTED" : "REJECTED";
    try {
      await mutateJobState({
        variables: { ID: id, State: updatedState },
        onError: (error: any) => {
          console.log(error.networkError?.result?.errors);
        },
        onCompleted: () => {
          window.location.reload();
        }
      });
  
      onClose();  // Close the modal after the mutation is completed
    } catch (error) {
      console.log(error);
    }
  };  
  
  
  return (
    <CenteredModal open={props.open} onClose={props.onClose}>
      <ModalBox>
        <h2 text-align="center">Job Feedback</h2>
        <FormControl component="fieldset" sx={{width: '500px'}}>

          <RadioGroup onChange = {handleFeedbackTypeChange} value = {feedbackType} name = "feedback-type" aria-label = "feedback-type">

            <FormControlLabel control={<Radio />} value="looks-good"    label="Job Accepted" />

            <FormControlLabel control={<Radio />} value="minor-changes" label="Needs Minor Changes" />
              {feedbackType === "minor-changes" && (
                <FeedbackField onChange={handleFeedbackMessageChange} value={feedbackMessage} label="Feedback message" required/>
              )}

            <FormControlLabel control={<Radio />} value="major-changes" label="Needs Major Changes"/>
              {feedbackType === "major-changes" && (
                <FeedbackField onChange={handleFeedbackMessageChange} value={feedbackMessage} label="Reason for major changes" required/>
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
