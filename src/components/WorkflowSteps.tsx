import { Step, StepLabel, Stepper, Typography } from '@mui/material'
import React, { useEffect, useState, useRef } from 'react'
import LoopIcon from '@mui/icons-material/Loop';
import DoneIcon from '@mui/icons-material/Done';
import PendingIcon from '@mui/icons-material/Pending';
// the purpose of this component is to showcase nodes in a workflow and their details
export default function WorkflowSteps(workflow: any) {

  const windowSize = useRef([window.innerWidth, window.innerHeight]);
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    function handleResize() {
      windowSize.current = [window.innerWidth, window.innerHeight];
      if (windowSize.current[0] < 700) {
        setIsSmall(true);
      } else {
        setIsSmall(false);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [workflowServices, setWorkflowServices] = useState(workflow.workflow.map((service: any) => {
    return service;
  }));

  useEffect(() => {
    console.log(workflow);
  }, [workflow]);

  function getStepIcon(state: any) {
    switch(state) {
      case 'QUEUED':
        return <PendingIcon />;
      case 'IN_PROGRESS':
        return <LoopIcon />;
      case 'COMPLETE':
        return <DoneIcon />;
      default:
        return <div />;
    }
  }
  
  return (
    <div>
      <Typography variant="h6">
        {
          workflow.name
        }
      </Typography>
      <Stepper activeStep={0} alternativeLabel={!isSmall} orientation={isSmall ? 'vertical' : 'horizontal'}>
        {workflowServices.map((service: any) => (
          console.log(service),
          <Step key={service.id} style={{maxWidth: 250}}>
            <StepLabel  
            StepIconComponent={() => getStepIcon(service.state)}
            >{service.name}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </div>
  )
}
