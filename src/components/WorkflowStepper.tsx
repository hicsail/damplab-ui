import React, { useContext, useEffect, useState, useRef } from 'react'
import { useMutation } from '@apollo/client';
import { Badge, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Popover, Step, StepButton, StepLabel, Stepper, Typography, Tooltip } from '@mui/material'
import { GppMaybeTwoTone, CheckCircleRounded, WarningRounded, DangerousRounded, HelpRounded } from '@mui/icons-material/';
import LoopIcon    from '@mui/icons-material/Loop';
import DoneIcon    from '@mui/icons-material/Done';
import PendingIcon from '@mui/icons-material/Pending';

// import { returnValidIndices, returnCleavedVectors, returnValidNewVector, sequenceScreenPassed } from '../controllers/SequenceScreener'; 
import { MUTATE_NODE_STATUS } from '../gql/mutations';
import { AppContext }         from '../contexts/App';
import { ImagesServicesDict } from '../assets/icons';


// the purpose of this component is to showcase nodes in a workflow and their details
export default function WorkflowStepper(workflow: any) {

    const { hazards } = useContext(AppContext);
    const windowSize = useRef([window.innerWidth, window.innerHeight]);
    const [isSmall, setIsSmall] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [dialogOpen, setDialogOpen] = useState(false);
    const workflowServices = workflow.workflow.map((service: any) => {return service;});
    const [mutateNodeStatus] = useMutation(MUTATE_NODE_STATUS);

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

    // const handleDialogOpen = () => {
    //     setDialogOpen(true);
    // };

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

    // const prepScreening = (service: any) => {
    //     let vector: string = '';
    //     let insert: string = '';
    //     let site_one: string = '';
    //     let site_two: string = '';

    //     {service.data.formData.map((parameter: any) => {
    //         if (['Vector'].includes(parameter.name)) {vector = parameter.value;}
    //         if (['Insert'].includes(parameter.name)) {insert = parameter.value;}
    //         if (['First Restriction Site'].includes(parameter.name))  {site_one = parameter.value;}
    //         if (['Second Restriction Site'].includes(parameter.name)) {site_two = parameter.value;}
    //     })}
    
    //     const indices: any      = returnValidIndices(vector, site_one, site_two);
    //     const vectors: string[] = returnCleavedVectors(vector, indices[0], indices[1]);
    //     const new_vector: any   = returnValidNewVector(vectors[0], 'over', vectors[1], 'over', insert);
    
    //     const vector_passed:     boolean = sequenceScreenPassed(vector);
    //     const insert_passed:     boolean = sequenceScreenPassed(insert);
    //     const new_vector_passed: boolean = sequenceScreenPassed(new_vector);

    //     return [indices, new_vector, vector_passed, insert_passed, new_vector_passed];
    // }

    // function prepare_for_screening() {
        // Pick this back up when have Kernel integration...
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
    // }

    function demo_prep_screen(stage: string, value: string) {
        // Stage options...
        // Screening of predicted sequences

        // const value = workflow.workflow[activeStep].data.formData[0].value;  // First field is 'Vector'

        return(
            <>{ value === "CAT"
                ? <div><CheckCircleRounded style={{color:'green',  verticalAlign:'bottom'}}/>&nbsp;{stage}: Passed</div>
                : value === "TAC"
                ? <div><DangerousRounded   style={{color:'red',    verticalAlign:'bottom'}}/>&nbsp;{stage}: Failed</div>
                : value === "ACT"
                ? <div><HelpRounded        style={{color:'orange', verticalAlign:'bottom'}}/>&nbsp;{stage}: Error</div>
                : <div><WarningRounded     style={{color:'grey',   verticalAlign:'bottom'}}/>&nbsp;{stage}: Pending</div>
            }</>
        )
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
                                            >                                                              {/* BADGE */}
                                                <sup>{
                                                    hazards.includes(service.name) ? (
                                                        <GppMaybeTwoTone style={{color:'grey'}}/>
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
                                                <Typography sx={{ px: 2}} >                              {/* POPOVER */}
                                                    {<p><CheckCircleRounded style={{color:'green', verticalAlign:'bottom'}}/>&nbsp;Screening of user-provided sequences: Passed</p>}
                                                    {<p>{demo_prep_screen('Screening of predicted sequences', workflow.workflow[activeStep].data.formData[0].value)}</p>}
                                                    {<p><WarningRounded style={{color:'grey', verticalAlign:'bottom'}}/>&nbsp;Screening of final sequences: Pending</p>}
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
                            {/* URL (e.g. to Google Drive) from the DB... */}
                            {/* <img src={workflow.workflow[activeStep].data.icon} alt=" " style={{ width: 20 }} /> */}
                            {/* Local files in src/assets/icons folder... */}
                            <img src={ImagesServicesDict[workflow.workflow[activeStep].data.name]} alt=" " style={{ width: 20 }} />
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
                                hazards.includes(workflow.workflow[activeStep].name)  // if includes Gibson or Moclo...
                                ? (
                                    <> 
                                        {/* {console.log('Vector: ', workflow.workflow[activeStep].data.formData[0].value)}; */}
                                        {/* {console.log('Screening Prep Vars: ', prepScreening(workflow.workflow[activeStep]))}; */}
                                        
                                        <Typography>                                                       {/* MODAL */}
                                            {<p><CheckCircleRounded style={{color:'green', verticalAlign:'bottom'}}/>&nbsp;Screening of user-provided sequences: Passed</p>}
                                            {<p>{demo_prep_screen('Screening of predicted sequences', workflow.workflow[activeStep].data.formData[0].value)}</p>}
                                            {<p><WarningRounded style={{color:'grey', verticalAlign:'bottom'}}/>&nbsp;Screening of final sequences: Pending</p>}
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
