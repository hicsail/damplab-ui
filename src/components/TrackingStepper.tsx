import React, { useState } from 'react'
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepButton from '@mui/material/StepButton';
import StepLabel from '@mui/material/StepLabel';
import Typography from '@mui/material/Typography';
import { ThemeProvider } from "@emotion/react";
import { styled } from "@mui/material";
import TextField from '@mui/material/TextField';
import { useMutation } from '@apollo/client';
import { UPDATE_WORKFLOW_STATE } from '../gql/mutations';
import LoopIcon from '@mui/icons-material/Loop';
import DoneIcon from '@mui/icons-material/Done';
import PendingIcon from '@mui/icons-material/Pending';
import "../styles/tracking.css";
import { StyledList, StyledBreak } from "../styles/themes";
import Grid from '@mui/material/Grid';

export default function TrackingStepper(workflow: any) {

    // loop over workflow and save each name in array
    const [workflowServices, setWorkflowServices] = useState(workflow.workflow.map((workflow: any) => {
        return workflow.name;
    }));
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

    const handleStep = (workflowName: any) => () => {
        setActiveStep(workflowName);
    };

    return (
        <div style={{ overflowX: 'auto' }}>
            <Stepper nonLinear activeStep={activeStep} 
                    style={{ padding: '10px' }} 
                    alternativeLabel
                    connector={null}
                    
            >
                {workflowServices.map((label: string, index: number) => (
                    <Step key={label} completed={completed[index]} style={{maxWidth: 250}}>
                        <StepButton color="inherit" onClick={handleStep(index)}>
                            <StepLabel StepIconComponent={() => getStepIcon(workflow.workflow[index].state)}>
                                {label}
                            </StepLabel>
                        </StepButton>
                    </Step>
                ))}
            </Stepper>
            <>
                <Box style={{ overflow: 'auto' }}>
                    <div className='name-and-icon' style={{ display: 'flex', 
                        justifyContent: 'flex-start', margin: 15 }}
                    >
                        <div className='icon' style={{marginRight:10}}>
                            <img style={{ width: 60, padding: 10 }} className="trackingStepper"
                                src={workflow.workflow[activeStep].data.icon} 
                                alt={workflow.workflow[activeStep].name} 
                            />
                        </div>
                        <div className='name'>
                            <Typography variant='subtitle1' sx={{ lineHeight: '80px', verticalAlign: 'middle' }}>
                                {workflow.workflow[activeStep].name}
                            </Typography>
                        </div>
                    </div>
                    <div className='parameters'style={{overflow: 'auto'}}>
                        {workflow.workflow[activeStep].data.formData.map((parameter: any) => {
                            return (
                                <div className='parameter' 
                                    style={{ display: 'flex' }} 
                                    key={Math.random()}
                                >
                                    <Typography>{parameter.name}</Typography>
                                    <Typography>: &nbsp;</Typography>
                                    <Typography>
                                        <input type='text' 
                                            value={parameter.value ? parameter.value : ""} 
                                            onChange={(e) => parameter.value = e.target.value} 
                                        />
                                    </Typography>
                                    {/* <Grid container>
                                        <Grid container item xs={6} direction="column" alignItems={'flex-start'}>
                                            {parameter.name}
                                        </Grid>
                                        <Grid container item xs={1} direction="column" justifyContent="right" alignItems="center">
                                            : &nbsp;
                                        </Grid>
                                        <Grid container item xs={2} direction="column" alignItems={'flex-start'}>
                                            <input type='text' 
                                                value={parameter.value ? parameter.value : ""} 
                                                onChange={(e) => parameter.value = e.target.value} 
                                            />
                                        </Grid>
                                    </Grid> */}
                                </div>
                            )
                        })}
                    </div>
                </Box>
            </>
        </div>
    )
}
