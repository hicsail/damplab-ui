import React, { useState, useContext } from "react";
import { Service } from '../types/Service';
import Box from "@mui/material/Box";
import { Stepper, Step, StepButton, StepIconProps, StepLabel, stepClasses } from "@mui/material";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Check from '@mui/icons-material/Check';
import { useMutation } from "@apollo/client";
import { UPDATE_WORKFLOW_STATE } from "../gql/mutations";
import { CanvasContext } from '../contexts/Canvas';
import { AppContext } from '../contexts/App';
import { makeStyles, styled } from "@mui/material";
import clsx from 'clsx';
import SettingsIcon from '@mui/icons-material/Settings';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import VideoLabelIcon from '@mui/icons-material/VideoLabel';
import { services } from '../data/services';
import { getServiceFromId } from '../controllers/GraphHelpers'

export default function DominosStepper(workflow: any) {
    const [category, setCategory] = useState('');
    const [categories, setCategories] = useState<any>([]);
    const [alignment, setAlignment] = useState('bundles');
    const {services, bundles} = useContext(AppContext);
    const [filteredServices, setFilteredServices] = useState(services);
    const {setNodes, setEdges} = useContext(CanvasContext);

    const [workflowNames, setWorkflowNames] = useState(
        workflow.workflow.map((workflow: any) => {
            return workflow.name;
        })
    );
    const [activeStep, setActiveStep] = useState({} as any);
    const [completed, setCompleted] = useState({} as any);
    const [updateWorkflowMutation] = useMutation(UPDATE_WORKFLOW_STATE, {
        onCompleted: (data) => {
            console.log("successfully completed workflow:", data);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log("error completing workflow", error);
        },
    });

    const handleAdvance = (index: number) => {
        const newCompleted: any = completed;
        newCompleted[activeStep] = true;
        setCompleted(newCompleted);
        handleNext();
    };

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
        const newActive =
            isLastStep() && !allStepsCompleted()
                ? workflowNames.findIndex((workflow: any, i: number) => !(i in completed))
                : activeStep + 1;
        setActiveStep(newActive);
        if (allStepsCompleted()) {
            isLastStep() 
                ? setActiveStep(0)
                : setActiveStep(totalSteps() - 1)
        }
    };

    const handleBack = () => {
        setActiveStep((prevActive) => prevActive - 1);
    };

    const activateStep = (step: number) => () => {
        const newActiveStep: any = activeStep; 
        newActiveStep[step] = true;
        setActiveStep(newActiveStep);
        updateWorkflowMutation();
    }; 

    const completeStep = (step: number) => () => {
        const newCompleted: any = completed; 
        newCompleted[step] = true;
        setCompleted(newCompleted);

        const newActiveStep: any = activeStep; 
        newActiveStep[step] = false;
        setActiveStep(newActiveStep);

        updateWorkflowMutation();
    }; 

    const deactivateStep = (step: number) => () => {
        const newCompleted: any = completed; 
        newCompleted[step] = false;
        setCompleted(newCompleted);

        const newActiveStep: any = activeStep; 
        newActiveStep[step] = false;
        setActiveStep(newActiveStep);

        updateWorkflowMutation();
    }; 

    const handleComplete = () => {
        const newCompleted: any = completed;
        newCompleted[activeStep] = true;
        setCompleted(newCompleted);
        // handleNext();
        // allStepsCompleted() 
        //     ? setActive(0)
        //     : handleNext();
        // if (allStepsCompleted()) {
        //     // {completeWorkflow();}
        // }
    };

    const handleReset = () => {
        setActiveStep(0);
        setCompleted({});
    };

    const startWorkflow = () => {
        let updateWorkflowState = {
            workflowId: workflow.id,
            state: "IN_PROGRESS",
        };
        updateWorkflowMutation({
            variables: { updateWorkflowState: updateWorkflowState },
        });
    };

    const stopWorkflow = () => {
        let updateWorkflowState = {
            workflowId: workflow.id,
            state: "QUEUED",
        };
        updateWorkflowMutation({
            variables: { updateWorkflowState: updateWorkflowState },
        });
    };

    const completeWorkflow = () => {
        let updateWorkflowState = {
            workflowId: workflow.id,
            state: "COMPLETE",
        };
        updateWorkflowMutation({
            variables: { updateWorkflowState: updateWorkflowState }, 
        });
    };

    const ColorlibStepIconRoot = styled('div')<{
        ownerState: { completed?: boolean; active?: boolean };
      }>(({ theme, ownerState }) => ({
        backgroundColor: theme.palette.mode === 'dark' ? theme.palette.grey[700] : '#aaa',
        zIndex: 1,
        width: 65,
        height: 65,
        display: 'flex',
        borderRadius: '50%',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0 4px 10px 0 rgba(0,0,0,.35)',
        ...(ownerState.active && {
          backgroundImage:
            'linear-gradient( 136deg, rgb(128,128,255) 0%, rgb(64,64,255) 50%, rgb(0,0,255) 100%)',
            boxShadow: '0 4px 10px 0 rgba(0,0,0,.35)',
        }),
        ...(ownerState.completed && {
          backgroundImage:
            'linear-gradient( 136deg, rgb(0,255,0) 0%, rgb(32,128,32) 50%, rgb(64,128,64) 100%)',
            boxShadow: '0 4px 10px 0 rgba(0,0,0,.35)',
        })
    }));
      
    function ColorlibStepIcon(props: StepIconProps) {
        const { active, completed, className } = props;

        return (
            <ColorlibStepIconRoot ownerState={{ completed, active }} className={className}>
                {<img className={className} src={workflow.workflow[Number(props.icon)-1].data.icon} width="50" height="50" />}
            </ColorlibStepIconRoot>
        );
    }

    return (
        <div>
            <div>
                <Stepper
                    nonLinear
                    activeStep = {activeStep}
                    style={{ overflowX: "auto", padding: "25px", textAlign: 'center', fontSize: "12px"}}
                    connector={null}
                    alternativeLabel 
                > 
                    {workflowNames.map((label: string, index: number) => ( 
                        <Step key={label} completed={completed[index]} active={activeStep[index]}>
                            {workflow.workflow[index].technicianFirst  
                                ? workflow.workflow[index].technicianFirst 
                                : "First"
                            }<br/> 
                            {workflow.workflow[index].technicianLast 
                                ? workflow.workflow[index].technicianLast 
                                : "Last"
                            }<br/><br/>
                            <StepButton onClick={
                                activeStep[index] === true ? completeStep(index) : 
                                completed[index] === true ? deactivateStep(index) :
                                activateStep(index)
                            }>
                                <StepLabel StepIconComponent={ColorlibStepIcon}>
                                    <span style={{fontSize: "11px"}}>
                                        {label}
                                    </span>
                                </StepLabel> 
                            </StepButton>
                        </Step>
                    ))}
                </Stepper>
            </div>
        </div>
    );
}
