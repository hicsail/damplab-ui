import React, { useContext, useEffect, useState, useRef } from 'react'
// import { useMutation } from '@apollo/client';
import { Badge, Box, Button, Dialog, DialogTitle, DialogContent, DialogActions, Popover, Step, StepButton, StepLabel, Stepper, Typography } from '@mui/material'
import { GppMaybe, GppMaybeTwoTone } from '@mui/icons-material/';

// import { MUTATE_NODE_STATUS } from '../gql/mutations';
import { AppContext }         from '../contexts/App';
import { ImagesServicesDict } from '../assets/icons';


// the purpose of this component is to showcase nodes in a workflow and their details
export default function WorkflowStepper(workflow: any) {

    const { hazards } = useContext(AppContext);
    const windowSize = useRef([window.innerWidth, window.innerHeight]);
    const [isSmall, setIsSmall] = useState(false);
    const [activeStep, setActiveStep] = useState(0);
    const [dialogOpen, setDialogOpen] = useState(false);
    // const [mutateNodeStatus, { loading, error }] = useMutation(MUTATE_NODE_STATUS);
    const workflowServices = workflow.workflow.map((service: any) => {return service;});

    

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

    // const handleDialogOpen = () => {setDialogOpen(true);};
    const handleClose = () => {setDialogOpen(false);};
    const selectStep = (index: number) => () => {
        setActiveStep(index);
        setDialogOpen(true);
    };

    const [anchorEl, setAnchorEl] = React.useState<HTMLElement | null>(null);
    const handlePopoverOpen = (event: React.MouseEvent<HTMLElement>) => {setAnchorEl(event.currentTarget);};
    const handlePopoverClose = () => {setAnchorEl(null);};
    const open = Boolean(anchorEl);

    // const updateWorkflowNode = (newState: string) => () => {
    //     // why is it workflow.workflow and not workflow.nodes?
    //     mutateNodeStatus({
    //         variables: {
    //             _ID: workflow.workflow[activeStep].id,
    //             State: newState,
    //         },
    //         onError: (error: any) => {
    //             console.log(error.networkError?.result?.errors);
    //         },
    //         onCompleted: () => {
    //             window.location.reload();
    //         }
    //     });   
    // }

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
            <Stepper nonLinear activeStep={activeStep} alternativeLabel={!isSmall} 
            orientation={isSmall ? 'vertical' : 'horizontal'}>
                {workflowServices.map((service: any, index: number) => (
                    <Step key={service.id} style={{ maxWidth: 250, minWidth: 50, paddingLeft: 50, paddingRight: 50 }}>
                        <StepButton onClick={selectStep(index)}>
                            <StepLabel StepIconComponent={() => <img src={ImagesServicesDict[service.name]} height="50" alt="Service icon"/>}>
                                <div style={{display: 'flex', alignItems: 'end' }}>
                                <Badge   anchorOrigin={{vertical: 'top', horizontal: 'right'}} badgeContent={
                                    <div>
                                        <Typography
                                            aria-owns={open ? 'mouse-over-popover' : undefined}
                                            aria-haspopup="true"
                                            onMouseEnter={handlePopoverOpen}
                                            onMouseLeave={handlePopoverClose}
                                        >
                                            <sup>{hazards.includes(service.name) 
                                                ? <GppMaybeTwoTone style={{color:'grey'}}/> 
                                                : <p/>}</sup>
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
                                                This service requires a biosecurity screening...
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
                    <Box style={{ height: 400, overflow: 'auto' }}>
                        <div className='parameters' style={{ overflow: 'auto' }}>
                            {
                                hazards.includes(workflow.workflow[activeStep].data.label) 
                                ? (
                                    <>
                                        <p><GppMaybe style={{color: "grey", verticalAlign:"bottom"}}/>&nbsp;Note: For this service, 
                                        sequences provided below or produced by the process will undergo a safety screening.<br/><br/></p>
                                    </>)
                                : ""
                            }
                            {workflow.workflow[activeStep].data.formData.map((parameter: any) => {
                                return (
                                    <div className='parameter' style={{ display: 'flex', marginBottom: 3 }} key={Math.random()}>
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
                        </div>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose} color="error">Close</Button>
                </DialogActions>
            </Dialog>
        </div>
    )
}
