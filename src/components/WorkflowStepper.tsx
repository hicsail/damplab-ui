import { Box, Button, Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Step, StepButton, StepLabel, Stepper, Typography, Tooltip } from '@mui/material'
import React, { useContext, useEffect, useState, useRef } from 'react'
import { useMutation } from '@apollo/client';
import LoopIcon from '@mui/icons-material/Loop';
import DoneIcon from '@mui/icons-material/Done';
import PendingIcon from '@mui/icons-material/Pending';
import { MUTATE_NODE_STATUS } from '../gql/mutations';
import { Popover, Badge } from '@mui/material';
import { GppMaybe, GppMaybeTwoTone, CheckCircleRounded, WarningRounded, DangerousRounded, HelpRounded } from '@mui/icons-material/';
import { AppContext } from '../contexts/App';
import { returnValidIndices, returnCleavedVectors, returnValidNewVector, sequenceScreenPassed } from '../controllers/SequenceScreener'; 
// the purpose of this component is to showcase nodes in a workflow and their details
export default function WorkflowStepper(workflow: any) {

    const { hazards } = useContext(AppContext);
    const windowSize = useRef([window.innerWidth, window.innerHeight]);
    const [isSmall, setIsSmall] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [workflowServices, setWorkflowServices] = useState(workflow.workflow.map((service: any) => {
        return service;
    }));
    const [dialogOpen, setDialogOpen] = useState(false);
    const [mutateNodeStatus, { loading, error }] = useMutation(MUTATE_NODE_STATUS);

    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {setAnchorEl(event.currentTarget);};
    const handlePopoverClose = () => {setAnchorEl(null);};
    const open = Boolean(anchorEl);

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

    const prepScreening = (service: any) => {

        let vector: string = '';
        let insert: string = '';
        let site_one: string = '';
        let site_two: string = '';
        {service.data.formData.map((parameter: any) => {
            if (['Gibson Vector', 'MoClo Vector'].includes(parameter.name)) {vector = parameter.value;}
            if (['Gibson Insert', 'MoClo Insert'].includes(parameter.name)) {insert = parameter.value;}
            if (['Gibson First Restriction Site', 'MoClo First Restriction Site'].includes(parameter.name)) {site_one = parameter.value;}
            if (['Gibson Second Restriction Site', 'MoClo Second Restriction Site'].includes(parameter.name)) {site_two = parameter.value;}
        })}
    
        const indices: any = returnValidIndices(vector, site_one, site_two);
        const vectors: string[] = returnCleavedVectors(vector, indices[0], indices[1]);
        const new_vector: any = returnValidNewVector(vectors[0], 'over', vectors[1], 'over', insert);
    
        const vector_passed: boolean = sequenceScreenPassed(vector);
        const insert_passed: boolean = sequenceScreenPassed(insert);
        const new_vector_passed: boolean = sequenceScreenPassed(new_vector);

        return [indices, new_vector, vector_passed, insert_passed, new_vector_passed];
    }

    return (
        <div>
            <Typography variant="h6">
                {
                    workflow.name
                }
            </Typography>
            <Stepper nonLinear activeStep={activeStep} alternativeLabel={!isSmall} 
            orientation={isSmall ? 'vertical' : 'horizontal'}>
                {workflowServices.map((service: any, index: number) => (
                    <Step key={service.id} style={{ maxWidth: 250, minWidth: 50, paddingLeft: 50, paddingRight: 50 }}>
                        <StepButton onClick={selectStep(index)}>
                            <StepLabel StepIconComponent={() => getStepIcon(service.state)}>
                            <div style={{display: 'flex', alignItems: 'end'}}>
                                    <Badge   anchorOrigin={{vertical: 'top', horizontal: 'right'}} badgeContent={
                                        <div>
                                            <Typography
                                                aria-owns={open ? 'mouse-over-popover' : undefined}
                                                aria-haspopup="true"
                                                onMouseEnter={handlePopoverOpen}
                                                onMouseLeave={handlePopoverClose}
                                            >
                                                <sup>{
                                                    hazards.includes(service.name) ? (
                                                        service.name == 'Gibson Assembly'
                                                        ? <GppMaybeTwoTone style={{color:'red'}}/> 
                                                        : <GppMaybeTwoTone style={{color:'orange'}}/> 
                                                        // !prepScreening(service)[2] || !prepScreening(service)[3] 
                                                        // ? <GppMaybeTwoTone style={{color:'red'}}/> 
                                                        // : !prepScreening(service)[0] || !prepScreening(service)[1]
                                                        // ? <GppMaybeTwoTone style={{color:'orange'}}/> 
                                                        // : <GppMaybeTwoTone style={{color:'grey'}}/> 
                                                    ) : <p/>
                                                }</sup>
                                            </Typography>
                                            <Popover
                                                id="mouse-over-popover"
                                                sx={{pointerEvents: 'none'}}
                                                open={open}
                                                anchorEl={anchorEl}
                                                anchorOrigin={{vertical: 'bottom', horizontal: 'left'}}
                                                transformOrigin={{vertical: 'top', horizontal: 'left'}}
                                                onClose={handlePopoverClose}
                                                disableRestoreFocus
                                            >
                                                <Typography sx={{ px: 2 }}>
                                                    {
                                                        // !prepScreening(service)[2] || !prepScreening(service)[3] ?
                                                        <p><CheckCircleRounded style={{color:'green', verticalAlign:'bottom'}}/>&nbsp;Screening of user-provided sequences: Passed<b/></p>
                                                        // : <p><DangerousRounded style={{color:'red',  verticalAlign:'bottom'}}/>&nbsp;Screening of user-provided sequences: Failed</p>
                                                    }
                                                    {
                                                        service.name == 'Gibson Assembly'
                                                        ? <p><DangerousRounded style={{color:'red',  verticalAlign:'bottom'}}/>&nbsp;Screening of predicted sequences: Failed</p>
                                                        : <p><HelpRounded style={{color:'orange', verticalAlign:'bottom'}}/>&nbsp;Screening of predicted sequences: Error</p>
                                                        // !prepScreening(service)[0] || !prepScreening(service)[1]
                                                        // ? <p><HelpRounded style={{color:'orange', verticalAlign:'bottom'}}/>&nbsp;Screening of predicted sequences: Error</p>
                                                        // : prepScreening(service)[4]
                                                        // ? <p><CheckCircleRounded style={{color:'green', verticalAlign:'bottom'}}/>&nbsp;Screening of predicted sequences: Passed<b/></p>
                                                        // : <p><WarningRounded style={{color:'green', verticalAlign:'bottom'}}/>&nbsp;Screening of user-provided sequences: Pending<b/></p>
                                                    }
                                                    <p><WarningRounded style={{color:'grey', verticalAlign:'bottom'}}/>&nbsp;Screening of final sequences: Pending</p>
                                                </Typography>
                                            </Popover>
                                        </div>
                                    }>
                                        {service.name}&nbsp;&nbsp;
                                    </Badge>
                                </div>
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
                    <div className='name-and-icon' title={workflow.workflow[activeStep].name} 
                    style={{ display: 'flex', justifyContent: 'flex-start', margin: 5 }}>
                        <div className='icon' style={{ marginRight: 10 }}>
                            <img style={{ width: 20 }} src={workflow.workflow[activeStep].data.icon} 
                            alt=" " />
                        </div>
                        <div className='name'>
                            <Typography variant='subtitle1'>
                                {workflow.workflow[activeStep].name}
                            </Typography>
                        </div>
                    </div>
                </DialogTitle>
                <DialogContent>
                    <Box style={{ height: 400, width: 550, overflow: 'auto' }}>
                        <div className='parameters' style={{ overflow: 'auto' }}>
                            {workflow.workflow[activeStep].data.formData.map((parameter: any) => {
                                return (
                                    <div className='parameter' style={{ display: 'flex', marginBottom: 5 }} key={Math.random()}>
                                        <div className='parameter-name'>
                                            {parameter.name}
                                        </div>
                                        <div className='parameter-separator' style={{ marginLeft: 3, marginRight: 5 }}>
                                            :
                                        </div>
                                        <div className='parameter-value' style={{ marginBottom: 3 }}>
                                            <input type='text' value={parameter.value ? parameter.value : parameter.resultParamValue} 
                                            onChange={(e) => parameter.value = e.target.value} />
                                        </div>
                                    </div>
                                )
                            })}
                            {
                                hazards.includes(workflow.workflow[activeStep].name) 
                                ? (
                                    <>  {
                                            workflow.workflow[activeStep].name == "Gibson Assembly"
                                            ? <p><GppMaybe style={{color: "red", verticalAlign:"bottom"}}/>&nbsp;Biosecurity screenings...</p>
                                            : <p><GppMaybe style={{color: "orange", verticalAlign:"bottom"}}/>&nbsp;Biosecurity screenings...</p>
                                        }
                                        <Typography>
                                            {
                                                prepScreening(workflow.workflow[activeStep])[2] && prepScreening(workflow.workflow[activeStep])[3]
                                                ? <div>
                                                    <p><CheckCircleRounded style={{color:'green', verticalAlign:'bottom'}}/>&nbsp;Screening of user-provided sequences: Passed<b/></p>
                                                    <p style={{paddingLeft: 30}}>Screening of Vector: Passed</p>
                                                    <p style={{paddingLeft: 30}}>Screening of Insert: Passed</p>
                                                  </div>
                                                : <p><DangerousRounded style={{color:'red',  verticalAlign:'bottom'}}/>&nbsp;Screening of user-provided sequences: Failed</p>
                                            }
                                            {
                                                workflow.workflow[activeStep].name == "Gibson Assembly"
                                                ? <div>
                                                    <p><DangerousRounded style={{color:'red',  verticalAlign:'bottom'}}/>&nbsp;Screening of predicted sequences: Failed</p>
                                                    <p style={{paddingLeft: 30}}>Screen of new sequence failed...</p>
                                                  </div>
                                                : <div>
                                                    <p><HelpRounded style={{color:'orange', verticalAlign:'bottom'}}/>&nbsp;Screening of predicted sequences: Error</p>
                                                    <p style={{paddingLeft: 30}}>Restriction sites are invalid or the overhangs are incompatible...</p>
                                                  </div>
                                                // !prepScreening(workflow.workflow[activeStep])[0] || !prepScreening(workflow.workflow[activeStep])[1]
                                                // ? <div>
                                                //     <p><HelpRounded style={{color:'orange', verticalAlign:'bottom'}}/>&nbsp;Screening of predicted sequences: Error</p>
                                                //     <p style={{paddingLeft: 30}}>Restriction sites are invalid or the overhangs are incompatible...</p>
                                                //   </div>
                                                // : prepScreening(workflow.workflow[activeStep])[4]
                                                // ? <div>
                                                //     <p><CheckCircleRounded style={{color:'green', verticalAlign:'bottom'}}/>&nbsp;Screening of predicted sequences: Passed<b/></p>
                                                //     <p style={{paddingLeft: 30}}>Restriction sites are valid</p>
                                                //     <p style={{paddingLeft: 30}}>Overhangs are compatible and aligned</p>
                                                //     <p style={{paddingLeft: 30}}>New vector formulated</p>
                                                //     <p style={{paddingLeft: 30}}>Screening passed</p>
                                                //   </div>
                                                // : <div>
                                                //     <p><DangerousRounded style={{color:'red', verticalAlign:'bottom'}}/>&nbsp;Screening of user-provided sequences: Failed<b/></p>
                                                //     <p style={{paddingLeft: 30}}>Screen of new sequence failed...</p>
                                                //   </div>
                                            }
                                            <p><WarningRounded style={{color:'grey', verticalAlign:'bottom'}}/>&nbsp;Screening of final sequences: Pending</p>
                                        </Typography>
                                    </>)
                                : <p>{workflow.workflow[activeStep].data.label}</p>
                            }
                        </div>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '30px' }}>
                        <Tooltip title = "Set as Pending"><Button color     = "inherit" onClick = {updateWorkflowNode("QUEUED")}><PendingIcon/></Button></Tooltip>
                        <Tooltip title = "Set as In Progress"><Button color = "inherit" onClick = {updateWorkflowNode("IN_PROGRESS")}><LoopIcon/></Button></Tooltip>
                        <Tooltip title = "Set as Completed"><Button color   = "inherit" onClick = {updateWorkflowNode("COMPLETE")}><DoneIcon /></Button></Tooltip>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="error">Close</Button>
                </DialogActions>
            </Dialog>
        </div>
    )
}
