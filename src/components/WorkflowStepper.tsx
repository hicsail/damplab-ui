import React, { useState } from 'react'
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepButton from '@mui/material/StepButton';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import Accordion from '@mui/material/Accordion';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TextField from '@mui/material/TextField';
import { useMutation } from '@apollo/client';
import { UPDATE_WORKFLOW_STATE } from '../gql/mutations';

export default function WorkflowStepper(workflow: any) {

    // loop over workflow and save each name in array
    const [workflowNames, setWorkflowNames] = useState(workflow.workflow.map((workflow: any) => {
        return workflow.name;
    }));
    const [workflowName, setWorkflowName] = useState(workflow.workflow.name);
    const [activeStep, setActiveStep] = useState(0);
    const [completed, setCompleted] = useState({} as any);
    const [acceptWorkflowMutation] = useMutation(UPDATE_WORKFLOW_STATE, {
        onCompleted: (data) => {
            console.log('successfully accepted workflow:', data);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log('error accepting workflow', error);
        }
    });

    const totalSteps = () => {
        return workflowNames.length;
    };

    const completedSteps = () => {
        return Object.keys(completed).length;
    };

    const isLastStep = () => {
        return activeStep === totalSteps() - 1;
    };

    const allStepsCompleted = () => {
        return completedSteps() === totalSteps();
    };

    const handleNext = () => {
        const newActiveStep =
            isLastStep() && !allStepsCompleted()
                ? // It's the last step, but not all steps have been completed,
                // find the first step that has been completed
                workflowNames.findIndex((workflow: any, i: number) => !(i in completed))
                : activeStep + 1;
        setActiveStep(newActiveStep);
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const handleStep = (workflowName: any) => () => {
        setActiveStep(workflowName);
    };

    const handleComplete = () => {
        const newCompleted: any = completed;
        newCompleted[activeStep] = true;
        setCompleted(newCompleted);
        handleNext();
    };

    const handleReset = () => {
        setActiveStep(0);
        setCompleted({});
    };

    const acceptWorkflow = () => {
        
        let updateWorkflowState = {
            workflowId: workflow.id,
            state: 'APPROVED'
        }
        acceptWorkflowMutation({
            variables: { updateWorkflowState: updateWorkflowState }
        });
    }
    return (
        <div style={{ padding: 25 }}>
            <div>
                {
                    workflow.parent !== 'checkout' && (
                        <div>
                            <Button>
                                Flag
                            </Button>
                            <Button onClick={acceptWorkflow}>
                                Validate
                            </Button>
                        </div>
                    )
                }    
            </div>
            <div style={{ overflowX: 'auto' }}>
                <Stepper nonLinear activeStep={activeStep} style={{ overflowX: 'auto' }}>
                    {workflowNames.map((label: string, index: number) => (
                        <Step key={label} completed={completed[index]}>
                            <StepButton color="inherit" onClick={handleStep(index)}>
                                {label}
                            </StepButton>
                        </Step>
                    ))}
                </Stepper>
                <Accordion>
                    <AccordionSummary
                        expandIcon={<ExpandMoreIcon />}
                        aria-controls="panel1a-content"
                        id="panel1a-header"
                    >
                        <Typography>Protocol Details</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <div>

                            {allStepsCompleted() ? (
                                <React.Fragment>
                                    <Typography sx={{ mt: 2, mb: 1 }}>
                                        All steps completed - you&apos;re finished
                                    </Typography>
                                    <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
                                        <Box sx={{ flex: '1 1 auto' }} />
                                        <Button onClick={handleReset}>Reset</Button>
                                    </Box>
                                </React.Fragment>
                            ) : (
                                <React.Fragment>
                                    <Box sx={{ mb: 1, py: 1 }} style={{ height: 150, overflow: 'auto' }}>
                                        <div className='name-and-icon' style={{ display: 'flex', justifyContent: 'flex-start', margin: 10 }}>
                                            <div className='icon' style={{marginRight:10}}>
                                                <img style={{ width: 20 }} src={workflow.workflow[activeStep].data.icon} alt={workflow.workflow[activeStep].name} />
                                            </div>
                                            <div className='name'>
                                                <Typography variant='subtitle1'>
                                                    {workflow.workflow[activeStep].name}
                                                </Typography>
                                            </div>
                                        </div>
                                        <div className='parameters'style={{overflow: 'auto'}}>
                                            {workflow.workflow[activeStep].data.formData.map((parameter: any) => {
                                                return (
                                                    <div className='parameter' style={{ display: 'flex' }} key={Math.random()}>
                                                        <div className='parameter-name'>
                                                            {parameter.name}
                                                        </div>
                                                        <div className='parameter-separator' style={{ marginLeft: 5, marginRight: 5 }}>
                                                            :
                                                        </div>
                                                        <div className='parameter-value'>
                                                            <input type='text' value={parameter.value ? parameter.value : ""} onChange={(e) => parameter.value = e.target.value} />
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </Box>
                                    <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
                                        <Button
                                            color="inherit"
                                            disabled={activeStep === 0}
                                            onClick={handleBack}
                                            sx={{ mr: 1 }}
                                        >
                                            Back
                                        </Button>
                                        <Box sx={{ flex: '1 1 auto' }} />
                                        <Button onClick={handleNext} sx={{ mr: 1 }}>
                                            Next
                                        </Button>
                                        {activeStep !== workflowNames.length &&
                                            (completed[activeStep] ? (
                                                <Typography variant="caption" sx={{ display: 'inline-block' }}>
                                                    Step {activeStep + 1} already completed
                                                </Typography>
                                            ) : (
                                                <Button onClick={handleComplete}>
                                                    {completedSteps() === totalSteps() - 1
                                                        ? 'Finish'
                                                        : 'Complete Step'}
                                                </Button>
                                            ))}
                                    </Box>
                                </React.Fragment>
                            )}
                        </div>
                    </AccordionDetails>
                </Accordion>
            </div>
        </div>
    )
}
