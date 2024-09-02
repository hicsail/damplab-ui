import React, { useState, useEffect } from "react";
import { useMutation } from '@apollo/client';
import { Box, Button, FormControl, FormControlLabel, Modal, Radio, RadioGroup, TextField } from "@mui/material";
import { styled } from "@mui/system";

import { MUTATE_JOB_STATE } from '../gql/mutations';
import { createELabsStudy, createELabsExperiment } from '../mpi/eLabs';


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

interface FetchOptions {
  method: string;
  headers: {
    // accept: string;
    // 'X-Requested-With': string;
    'content-type': string;
    Authorization: string;
  };
  body: string;
}

export default function JobFeedbackModal(props: any) {
  const { onClose, id, workflows } = props;
  
  const [feedbackType,      setFeedbackType]      = useState("");
  const [feedbackMessage,   setFeedbackMessage]   = useState("");
  // const [newState,          setNewState]          = useState("");
  const [mutationCompleted, setMutationCompleted] = useState(false);

  const [mutateJobState] = useMutation(MUTATE_JOB_STATE);

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

  const handleELabsCall = async () => {
    try {
      for (const workflow of workflows) {
        console.log('eLabs Study creation: ', workflow)
        const studyID = await createELabsStudy('822c512d20c3222a33fc79ed53aa02c2', 23469, workflow.name);
        if (!studyID || typeof(studyID) !== 'number') {
          throw new Error('StudyID not returned by eLabs (or invalid type)...');
        }

        for (const service of workflow.nodes) {
          console.log('eLabs Experiment creation: ', service.label)
          const experimentID = await createELabsExperiment('822c512d20c3222a33fc79ed53aa02c2', studyID, service.label, 'PENDING');
          if (!experimentID || typeof(experimentID) !== 'number') {
            throw new Error('ExperimentID not returned by eLabs (or invalid type)...');
          }
        }
      }

      await handleSubmit();

      return(`Study created successfully in eLabs.  Study ID: {studyID}`)
    } catch (error) {
      console.log(error);
    }
  };

  const handleSubmit = async () => {
    // feedbackType === "looks-good" ? setNewState("ACCEPTED") : setNewState("REJECTED");
    
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

      // const elabsResult = await handleELabsCall();

      // if (elabsResult) {
      //   console.log(elabsResult);
      // }

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
            <Button variant="contained" color="inherit" onClick={handleELabsCall}>
              {feedbackType === "looks-good"
                ? "Accept Job/Transmit to eLabs"
                : "Send Feedback"}
            </Button>
          )}
          
        </FormControl>
      </ModalBox>
    </CenteredModal>
  );
}
