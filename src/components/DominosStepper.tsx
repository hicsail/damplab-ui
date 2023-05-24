import { useEffect, useState } from "react";
import { Stepper, Step, StepButton, StepIconProps, StepLabel } from "@mui/material";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useQuery, useLazyQuery, useMutation, gql } from "@apollo/client";
import { UPDATE_WORKFLOW_STATE, MUTATE_NODE_STATUS, MUTATE_WORKFLOW_STATE } from "../gql/mutations";
import { GET_WORKFLOWS_FOR_DOMINOS } from "../gql/queries";
import { GET_JOB_BY_ID } from "../gql/queries";
import { ColorlibStepIconRoot, atLeastOneServiceActive, allServicesCompleted } from "../controllers/StepperHelpers"
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';
import { QueryManager } from "@apollo/client/core/QueryManager";

export default function DominosStepper({ id, nodes, workflowState }: any) {
    const [serviceNames] = useState(nodes.map((node: any) => {return node.name;}));
    const [serviceIds]   = useState(nodes.map((node: any) => {return node.globalId;}));

// Service status handlers
    type serviceStatus = "queued" | "in_progress" | "complete";  
    //                    QUEUED     IN_PROGRESS     COMPLETE    // GQL terms
    //                    Pending    In Progress     Completed   // Display terms
    //                    inactive   active          completed   // Stepper terms

    const [serviceStatuses, setStepStatuses] = useState<serviceStatus[]>({} as any);

    useEffect(() => {
        const newServiceStatuses: serviceStatus[] = serviceStatuses;
        nodes.map((label: string, index: number) => (
            nodes[index].state   === 'QUEUED'      ? newServiceStatuses[index] = 'queued'
            : nodes[index].state === 'IN_PROGRESS' ? newServiceStatuses[index] = 'in_progress'
            : nodes[index].state === 'COMPLETE'    ? newServiceStatuses[index] = 'complete'
            : console.log("error on status type")));
        setStepStatuses(newServiceStatuses);
    }, []);

    const advanceServiceStatus = (step: number) => () => {
        const newServiceStatuses: serviceStatus[] = serviceStatuses;
        let state: serviceStatus = newServiceStatuses[step];
        newServiceStatuses[step]   === "queued"      ? state = "in_progress"
        : newServiceStatuses[step] === "in_progress" ? state = "complete"
        : newServiceStatuses[step] === "complete"    ? state = "queued"
        : console.log('error on status type');
        newServiceStatuses[step] = state;
        setStepStatuses(newServiceStatuses);

        mutateServiceStatus(serviceIds[step], state.toUpperCase());   // mutate on gql
    }; 

// Service mutation handlers
    const mutateServiceStatus = (globalId: string, status: string) => {
        mutateNodeStatus({
            variables: { _ID: globalId, State: status }
        });
    }

    const [mutateNodeStatus] = useMutation(MUTATE_NODE_STATUS, {
        onCompleted: (data) => {
            console.log("successfully updated service status:", data);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log("error updating service status", error);
        },
    });

// Workflow mutation handlers
    const updateWorkflow = (id: string) => {
        updateWorkflowMutation({
            variables: { ID: id, State: workflowState }
        });
    }

    const [updateWorkflowMutation] = useMutation(MUTATE_WORKFLOW_STATE, {
        onCompleted: (data) => {
            console.log('successfully updated workflow state:', data);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log('error updated workflow state', error);
        }
    });

    useEffect(() => {
        let state: string;
        allServicesCompleted(serviceStatuses) ? state = 'COMPLETE'
        : atLeastOneServiceActive(serviceStatuses) ? state = 'IN_PROGRESS'
        : state = 'QUEUED'

        if (state !== workflowState) {
            workflowState = state;
            updateWorkflow(id);
        }

    }, [ serviceStatuses ]);

// Helper for custom icons (works with ColorlibStepIconRoot in StepperHelpers)
    function ColorlibStepIcon(props: StepIconProps) {
        const { active, completed, className } = props;
        let image: any;
        completed 
            ? image = <CheckCircleOutlineIcon fontSize="large" sx={{color: "white"}}/>
            :   // TODO: Cache images (keeps overloading google w/ requests)
                // image = <img className={className}
                //   src={nodes[Number(props.icon)-1].icon}
                //   width="50" height="50" />
              <QuestionMarkIcon />
        return (
            <ColorlibStepIconRoot ownerState={{ completed, active }} className={className}>
                {/* {image} */}
                <QuestionMarkIcon />
            </ColorlibStepIconRoot>
        );
    };

    return (
        <Stepper
            nonLinear
            alternativeLabel 
            // activeStep usually scalar; here array; get warning; doesn't seem to cause probs
            activeStep = {Object.values(serviceStatuses).map((service) => (
                service === 'in_progress' ? true : false))}
            style={{ overflowX: "auto", padding: "25px", textAlign: 'center', 
                        fontSize: "11px",  lineHeight: "1.2" }}
            connector={null}
        > 
            {serviceNames.map((label: string, index: number) => ( 
                <Step key={label} 
                        completed={Object.values(serviceStatuses).map((service) => (
                        service === 'complete' ? true : false))[index]} 
                        active={Object.values(serviceStatuses).map((service) => (
                        service === 'in_progress' ? true : false))[index]}
                >
                    {nodes[index].technicianFirst  ? nodes[index].technicianFirst : ""}<br/> 
                    {nodes[index].technicianLast ? nodes[index].technicianLast : "Unassigned"}<br/><br/>
                    <StepButton onClick={advanceServiceStatus(index)}>
                        <StepLabel StepIconComponent={ColorlibStepIcon}>
                            <div style={{fontSize: "11px"}}>
                                {label}
                            </div>
                        </StepLabel> 
                    </StepButton>
                </Step>
            ))}
        </Stepper>
    );
}
