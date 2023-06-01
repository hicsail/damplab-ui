import { Box, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Step, StepButton, StepLabel, Stepper, Typography } from '@mui/material'
import React, { useEffect, useState, useRef } from 'react'
import { useMutation } from '@apollo/client';
import LoopIcon from '@mui/icons-material/Loop';
import DoneIcon from '@mui/icons-material/Done';
import PendingIcon from '@mui/icons-material/Pending';
import { MUTATE_NODE_STATUS } from '../gql/mutations';
// the purpose of this component is to showcase nodes in a workflow and their details
export default function WorkflowStepper(workflow: any) {

    const windowSize = useRef([window.innerWidth, window.innerHeight]);
    const [isSmall, setIsSmall] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [workflowServices, setWorkflowServices] = useState(workflow.workflow.map((service: any) => {
        return service;
    }));
    const [dialogOpen, setDialogOpen] = useState(false);
    const [mutateNodeStatus, { loading, error }] = useMutation(MUTATE_NODE_STATUS);


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

    const handleDialogOpen = () => {
        setDialogOpen(true);
    };

    const handleClose = () => {
        setDialogOpen(false);
    };

    const selectStep = (index: number) => () => {
        setActiveStep(index);
        setDialogOpen(true);
    };

    const updateWorkflowNode = (newState: string) => () => {
        // why is it workflow.workflow and not workflow.nodes?
        mutateNodeStatus({
            variables: {
                _ID: workflow.workflow[activeStep].id,
                State: newState,
            },
            onError: (error: any) => {
                console.log(error.networkError?.result?.errors);
            },
            onCompleted: () => {
                window.location.reload();
            }
        });   
    }

    useEffect(() => {
        console.log(workflow);
    }, [workflow]);

    function getStepIcon(state: any) {
        switch (state) {
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
            <Stepper nonLinear activeStep={activeStep} alternativeLabel={!isSmall} orientation={isSmall ? 'vertical' : 'horizontal'}>
                {workflowServices.map((service: any, index: number) => (
                    console.log(service),
                    <Step key={service.id} style={{ maxWidth: 250 }}>
                        <StepButton onClick={selectStep(index)}>
                            <StepLabel StepIconComponent={() => getStepIcon(service.state)}>
                                {service.name}
                            </StepLabel>
                        </StepButton>
                    </Step>
                ))}
            </Stepper>

            <Dialog
                open={dialogOpen}
                onClose={handleClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    <div className='name-and-icon' style={{ display: 'flex', justifyContent: 'flex-start', margin: 5 }}>
                        <div className='icon' style={{ marginRight: 10 }}>
                            <img style={{ width: 20 }} src={workflow.workflow[activeStep].data.icon} alt={workflow.workflow[activeStep].name} />
                        </div>
                        <div className='name'>
                            <Typography variant='subtitle1'>
                                {workflow.workflow[activeStep].name}
                            </Typography>
                        </div>
                    </div>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{}} style={{ height: 150, overflow: 'auto' }}>
                        <div className='parameters' style={{ overflow: 'auto' }}>
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
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px' }}>
                        <Button color="inherit" onClick={updateWorkflowNode("QUEUED")}><PendingIcon /></Button>
                        <Button color="inherit" onClick={updateWorkflowNode("IN_PROGRESS")}><LoopIcon /></Button>
                        <Button color="inherit" onClick={updateWorkflowNode("COMPLETE")}><DoneIcon /></Button>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="error">Close</Button>
                </DialogActions>
            </Dialog>
        </div>
    )
}
