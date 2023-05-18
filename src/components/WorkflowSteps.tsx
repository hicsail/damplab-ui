import { Step, StepLabel, Stepper, Typography } from '@mui/material'
import React, { useEffect, useState } from 'react'



// the purpose of this component is to showcase nodes in a workflow and their details
export default function WorkflowSteps(workflow: any) {

  const [workflowServices, setWorkflowServices] = useState(workflow.workflow.map((service: any) => {
    return service;
  }));

  useEffect(() => {
    console.log(workflow);
  }, [workflow]);
  

  return (
    <div>
      <Typography variant="h6">
        {
          workflow.name
        }
      </Typography>
      <Stepper activeStep={0} alternativeLabel>
        {workflowServices.map((service: any) => (
          <Step key={service.id} style={{maxWidth: 250}}>
            <StepLabel>{service.name}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </div>
  )
}
