import React, { useState } from "react";
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
  const [feedbackType, setFeedbackType] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  const handleFeedbackTypeChange = (event: any) => {
    setFeedbackType(event.target.value);
  };

  const handleFeedbackMessageChange = (event: any) => {
    setFeedbackMessage(event.target.value);
  };

  const handleSubmit = () => {
    // Handle form submission here
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
              label="Looks good"
            />
            <FormControlLabel
              value="minor-changes"
              control={<Radio />}
              label="Minor changes"
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
              label="Major changes"
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
            <Button variant="contained" onClick={handleSubmit}>
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
