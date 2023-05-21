import { useState } from "react";
import { Stepper, Step, StepButton, StepIconProps, StepLabel } from "@mui/material";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useMutation } from "@apollo/client";
import { UPDATE_WORKFLOW_STATE } from "../gql/mutations";
import { styled } from "@mui/material";

export default function DominosStepper(workflow: any) {
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

    const totalSteps = () => {
        return workflowNames.length;
    };

    const completedSteps = () => {
        return Object.keys(completed).length;
    };

    const allStepsCompleted = () => {
        return completedSteps() === totalSteps();
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

        // if (allStepsCompleted()) {
        //     completeWorkflow();
        // }
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
        console.log("All workflow servivices completed")
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
        width: 65,              height: 65,
        display: 'flex',        justifyContent: 'center',   alignItems: 'center',
        borderRadius: '50%',    boxShadow: '0 4px 10px 0 rgba(0,0,0,.35)',
        ...(ownerState.active && {backgroundImage:
            'linear-gradient( 136deg, rgb(128,128,255) 0%, rgb(64,64,255) 50%, rgb(0,0,255) 100%)',
        }),
        ...(ownerState.completed && {backgroundImage:
            'linear-gradient( 136deg, rgb(0,255,0) 0%, rgb(32,128,32) 50%, rgb(64,128,64) 100%)',
        })
    }));
      
    function ColorlibStepIcon(props: StepIconProps) {
        const { active, completed, className } = props;
        let image: any;
        completed 
            ? image = <CheckCircleOutlineIcon fontSize="large" sx={{color: "white"}}/>
            : image = <img className={className} 
                       src={workflow.workflow[Number(props.icon)-1].data.icon} 
                       width="50" height="50" />
        return (
            <ColorlibStepIconRoot ownerState={{ completed, active }} className={className}>
                {image}
            </ColorlibStepIconRoot>
        );
    }

    return (
        <div>
            <div>
                <Stepper
                    nonLinear
                    alternativeLabel 
                    activeStep = {activeStep}
                    style={{ overflowX: "auto", padding: "25px", textAlign: 'center', fontSize: "12px"}}
                    connector={null}
                > 
                    {workflowNames.map((label: string, index: number) => ( 
                        <Step key={label} completed={completed[index]} active={activeStep[index]}>
                            {workflow.workflow[index].technicianFirst  
                                ? workflow.workflow[index].technicianFirst 
                                : ""
                            }<br/> 
                            {workflow.workflow[index].technicianLast 
                                ? workflow.workflow[index].technicianLast 
                                : "Unassigned"
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
