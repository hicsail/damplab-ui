import { Box, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Step, StepButton, StepLabel, Stepper, Typography, Tooltip } from '@mui/material'
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
    const [activeStage, setActiveStage] = useState(0);
    const [activeService, setActiveService] = useState(0);
    const [workflowStages, setWorkflowStages] = useState(workflow.stages.map((stage: any) => {
        return stage;
    }));
    const [dialogOpen, setDialogOpen] = useState(false);
    const [mutateNodeStatus, { loading, error }] = useMutation(MUTATE_NODE_STATUS);


    useEffect(() => {
        function handleResize() {
            console.log('resizing');
            windowSize.current = [window.innerWidth, window.innerHeight];
            if (windowSize.current[0] < 700) {
                setIsSmall(true);
            } else {
                setIsSmall(false);
            }
        }
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const handleDialogOpen = () => {
        setDialogOpen(true);
    };

    const handleClose = () => {
        setDialogOpen(false);
    };

    const selectStep = (stageIndex: number, serviceIndex: number) => () => {
        setActiveStage(stageIndex);
        setActiveService(serviceIndex);
        setDialogOpen(true);
    };

    // TODO: Needs to be redone...
    const updateWorkflowNode = (newState: string) => () => {
        mutateNodeStatus({
            variables: {
                _ID: workflow.stages[activeStage][activeService].id,
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
            <Box style={{ display: 'flex', justifyContent: 'flex-start', flexDirection: 'row', margin: 5 }}>
                {workflowStages.map((stage: any, stageIndex: number) => {
                    return(
                        <div>
                            <Box style={{ display: 'flex', justifyContent: 'flex-start', flexDirection: 'column', alignItems: 'center', margin: 25 }}>
                                {stage.map((service: any, serviceIndex: number) => {
                                    return(
                                        <Button style={{ margin: 15 }} variant="outlined" title={service.name} onClick={selectStep(stageIndex, serviceIndex)}>
                                            {service.name}
                                        </Button>
                                    )
                                })}
                            </Box>
                        </div>
                    )
                })}
            </Box>

            {/* <Stepper nonLinear activeStep={activeStep} alternativeLabel={!isSmall} 
            orientation={isSmall ? 'vertical' : 'horizontal'}>
                {workflowStages.map((stage: any, index: number) => (
                    <Step key={stage.id} style={{ maxWidth: 250 }}>
                        <StepButton onClick={selectStep(index)}>
                            <StepLabel StepIconComponent={() => getStepIcon(stage.state)}>
                                {stage.name}
                            </StepLabel>
                        </StepButton>
                    </Step>
                ))}
            </Stepper> */}
        
            <Dialog
                open={dialogOpen}
                onClose={handleClose}
                aria-labelledby="alert-dialog-title"
                aria-describedby="alert-dialog-description"
            >
                <DialogTitle id="alert-dialog-title">
                    <div className='name-and-icon' title={workflow.stages[activeStage][activeService].name} 
                    style={{ display: 'flex', justifyContent: 'flex-start', margin: 5 }}>
                        <div className='icon' style={{ marginRight: 10 }}>
                            <img style={{ width: 20 }} src={workflow.stages[activeStage][activeService].data.icon} 
                            alt=" " />
                        </div>
                        <div className='name'>
                            <Typography variant='subtitle1'>
                                {workflow.stages[activeStage][activeService].name}
                            </Typography>
                        </div>
                    </div>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{}} style={{ height: 150, overflow: 'auto' }}>
                        <div className='parameters' style={{ overflow: 'auto' }}>
                            {workflow.stages[activeStage][activeService].data.formData.map((parameter: any) => {
                                return (
                                    <div className='parameter' style={{ display: 'flex' }} key={Math.random()}>
                                        <div className='parameter-name'>
                                            {parameter.name}
                                        </div>
                                        <div className='parameter-separator' style={{ marginLeft: 5, marginRight: 5 }}>
                                            :
                                        </div>
                                        <div className='parameter-value'>
                                            <input type='text' value={parameter.value ? parameter.value : parameter.resultParamValue} 
                                            onChange={(e) => parameter.value = e.target.value} />
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </Box>
                    {/* <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px' }}>
                        <Tooltip title = "Set as Pending"><Button color     = "inherit" onClick = {updateWorkflowNode("QUEUED")}><PendingIcon/></Button></Tooltip>
                        <Tooltip title = "Set as In Progress"><Button color = "inherit" onClick = {updateWorkflowNode("IN_PROGRESS")}><LoopIcon/></Button></Tooltip>
                        <Tooltip title = "Set as Completed"><Button color   = "inherit" onClick = {updateWorkflowNode("COMPLETE")}><DoneIcon /></Button></Tooltip>
                    </Box> */}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="error">Close</Button>
                </DialogActions>
            </Dialog>
        </div>
    )
}
