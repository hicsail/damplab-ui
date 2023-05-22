import { useEffect, useState } from "react";
import { Stepper, Step, StepButton, StepIconProps, StepLabel } from "@mui/material";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useQuery, useMutation } from "@apollo/client";
import { UPDATE_WORKFLOW_STATE, MUTATE_NODE_STATUS, MUTATE_WORKFLOW_STATE } from "../gql/mutations";
import { GET_JOB_BY_ID } from "../gql/queries";
import { ColorlibStepIconRoot } from "../controllers/StepperHelpers"

export default function DominosStepper(workflow: any) {
    const [nodeNames] = useState(
        workflow.nodes.map((node: any) => {
            return node.name;
        })
    );
    const [nodeIds] = useState(
        workflow.nodes.map((node: any) => {
            return node.globalId;
        })
    );
    const [activeSteps, setActiveSteps] = useState({} as any);
    const [completedSteps, setCompletedSteps] = useState({} as any);
    const [updateNodeStatus] = useMutation(MUTATE_NODE_STATUS, {
        onCompleted: (data) => {
            console.log("successfully updated node:", data);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log("error updating node", error);
        },
    });
    const [updateWorkflowMutation] = useMutation(MUTATE_WORKFLOW_STATE, {
        onCompleted: (data) => {
            console.log('successfully updated workflow:', data);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log('error updated workflow', error);
        }
    });

    const atLeastOneStepActive = () => {
        // return Object.keys(activeSteps).length > 0;
        for (var val of Object.entries(activeSteps)) {
            if (val[1] == true) return true; 
        }
        return false;
    };

    const allStepsCompleted = () => {
        // return Object.keys(completedSteps).length === nodeNames.length;
        for (var val of Object.entries(completedSteps)) {
            if (val[1] == false) return false;
        }
        return true;
    };

    const activateStep = (step: number) => () => {
        const newActiveStep: any = activeSteps; 
        newActiveStep[step] = true;
        setActiveSteps(newActiveStep);

        const newCompleted: any = completedSteps; 
        newCompleted[step] = false;
        setCompletedSteps(newCompleted);

        updateNode(nodeIds[step], 'IN_PROGRESS');
        // console.log(activeSteps[step], completedSteps[step]);
    }; 

    const completeStep = (step: number) => () => {
        const newActiveStep: any = activeSteps; 
        newActiveStep[step] = false;
        setActiveSteps(newActiveStep);

        const newCompleted: any = completedSteps; 
        newCompleted[step] = true;
        setCompletedSteps(newCompleted);

        updateNode(nodeIds[step], 'COMPLETE');
        // console.log(activeSteps[step], completedSteps[step]);
    }; 

    const deactivateStep = (step: number) => () => {
        const newActiveStep: any = activeSteps; 
        newActiveStep[step] = false;
        setActiveSteps(newActiveStep);

        const newCompleted: any = completedSteps; 
        newCompleted[step] = false;
        setCompletedSteps(newCompleted);

        updateNode(nodeIds[step], 'QUEUED');
        // console.log(activeSteps[step], completedSteps[step]);
    }; 

    const updateNode = (globalId: string, status: string) => {
        updateNodeStatus({
            variables: { _ID: globalId, State: status }
        });
    }

    function ColorlibStepIcon(props: StepIconProps) {
        const { active, completed, className } = props;
        let image: any;
        completed 
            ? image = <CheckCircleOutlineIcon fontSize="large" sx={{color: "white"}}/>
            : image = <img className={className} 
                       src={workflow.nodes[Number(props.icon)-1].icon} 
                       width="50" height="50" />
        return (
            <ColorlibStepIconRoot ownerState={{ completed, active }} className={className}>
                {image}
            </ColorlibStepIconRoot>
        );
    };

    useEffect(() => {
        nodeNames.map((label: string, index: number) => (
            workflow.nodes[index].state === 'COMPLETE' 
            ? (activeSteps[index] = false, completedSteps[index] = true)  
            : workflow.nodes[index].state === 'IN_PROGRESS' 
            ? (activeSteps[index] = true,  completedSteps[index] = false) 
            : (activeSteps[index] = false, completedSteps[index] = false)
        ))
    }, [ MUTATE_NODE_STATUS ]);

    useEffect(() => {
        let state: string;
        console.log(workflow.id, "complete:", allStepsCompleted(), "active:", atLeastOneStepActive(), "first step:", completedSteps[1]);
        if ( allStepsCompleted() && workflow.workflowState!='COMPLETE') {
            state = 'COMPLETE'
        } else if ( atLeastOneStepActive() && workflow.workflowState!='IN_PROGRESS') {
            state = 'IN_PROGRESS'
        } else if ( workflow.workflowState!='QUEUED' ) {
            state = 'QUEUED'
        } else {
            return
        }; 

        const updateWorkflow = (workflowId: string) => {
            updateWorkflowMutation({
                variables: { ID: workflowId, State: state }
            });
        }

        updateWorkflow(workflow.id);
    }, [ activeSteps, completedSteps ]);

    return (
        <div>
            <div>
                <Stepper
                    nonLinear
                    alternativeLabel 
                    activeStep = {activeSteps}
                    style={{ overflowX: "auto", padding: "25px", textAlign: 'center', 
                             fontSize: "11px",  lineHeight: "1.2" }}
                    connector={null}
                > 
                    {nodeNames.map((label: string, index: number) => ( 
                        <Step key={label} 
                              completed={completedSteps[index]} 
                              active={activeSteps[index]}
                        >
                            {workflow.nodes[index].technicianFirst  
                                ? workflow.nodes[index].technicianFirst 
                                : ""
                            }<br/> 
                            {workflow.nodes[index].technicianLast 
                                ? workflow.nodes[index].technicianLast 
                                : "Unassigned"
                            }<br/><br/>
                            <StepButton onClick={
                                activeSteps[index]    === true ? completeStep(index) :
                                completedSteps[index] === true ? deactivateStep(index) :
                                activateStep(index)
                            }>
                                <StepLabel StepIconComponent={ColorlibStepIcon}>
                                    <div style={{fontSize: "11px"}}>
                                        {label}
                                    </div>
                                </StepLabel> 
                            </StepButton>
                        </Step>
                    ))}
                </Stepper>
            </div>
        </div>
    );
}
