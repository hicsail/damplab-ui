import { useEffect, useState } from "react";
import { Stepper, Step, StepButton, StepIconProps, StepLabel } from "@mui/material";
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useMutation } from "@apollo/client";
import { MUTATE_NODE_STATUS, MUTATE_WORKFLOW_STATE } from "../gql/mutations";
import { ColorlibStepIconRoot, atLeastOneServiceActive, allServicesCompleted } from "../controllers/StepperHelpers"
import QuestionMarkIcon from '@mui/icons-material/QuestionMark';

export default function DominosStepper({ id, nodes, workflowState, refetchQueued, refetchInProgress, refetchComplete }: any) {
    const [serviceNames] = useState(nodes.map((node: any) => {return node.name;}));
    const [serviceIds]   = useState(nodes.map((node: any) => {return node.globalId;}));
    const [active, setActive] = useState({});
    // const [serviceIcons] = nodes.map((nodes: any) => {return nodes.icon});

// Service status handlers
    type serviceStatus = "queued" | "in_progress" | "complete"; 
    //                    QUEUED     IN_PROGRESS     COMPLETE    // GQL terms
    //                    Pending    In Progress     Completed   // Display terms
    //                    inactive   active          completed   // Stepper terms

    const [serviceStatuses, setServiceStatuses] = useState<serviceStatus[]>({} as any);

    const updateServiceStatuses = () => {
        const newServiceStatuses: serviceStatus[] = serviceStatuses;
        nodes.map((label: string, index: number) => (
            nodes[index].state   === 'QUEUED'      ? newServiceStatuses[index] = 'queued'
            : nodes[index].state === 'IN_PROGRESS' ? newServiceStatuses[index] = 'in_progress'
            : nodes[index].state === 'COMPLETE'    ? newServiceStatuses[index] = 'complete'
            : console.log("error on status type")));
        setServiceStatuses(newServiceStatuses);
    };

    useEffect(() => {
        updateServiceStatuses();
        setActive(Object.values(serviceStatuses).map((service) => (
            service === 'in_progress' ? true : false)));
    }, []);

// Service mutation handlers
    const advanceServiceStatus = (step: number) => () => {
        const newServiceStatuses: serviceStatus[] = serviceStatuses;
        let state: serviceStatus = newServiceStatuses[step];
        newServiceStatuses[step]   === "queued"      ? state = "in_progress"
        : newServiceStatuses[step] === "in_progress" ? state = "complete"
        : newServiceStatuses[step] === "complete"    ? state = "queued"
        : console.log('error on status type');
        newServiceStatuses[step] = state;
        setServiceStatuses(newServiceStatuses);
        console.log("step statuses set");
        mutateServiceStatus(serviceIds[step], state.toUpperCase());   // mutate on gql
    }; 

    const mutateServiceStatus = (globalId: string, status: string) => {
        mutateNodeStatus({
            variables: { _ID: globalId, State: status }
        });
    }

    const [mutateNodeStatus] = useMutation(MUTATE_NODE_STATUS, {
        onCompleted: (data) => {
            console.log("successfully updated service status:", data);
            checkWorkflowState();
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log("error updating service status", error);
        },
    });

// Workflow mutation handlers
    const checkWorkflowState = () => {
        console.log("workflow state check ran");
        let state: string;
        allServicesCompleted(serviceStatuses) ? state = 'COMPLETE'
        : atLeastOneServiceActive(serviceStatuses) ? state = 'IN_PROGRESS'
        : state = 'QUEUED'

        if (state !== workflowState) {
            workflowState = state;
            updateWorkflow(id);
        }
    }; 

    const updateWorkflow = (id: string) => {
        updateWorkflowMutation({
            variables: { ID: id, State: workflowState }
        });
    }

    const [updateWorkflowMutation] = useMutation(MUTATE_WORKFLOW_STATE, {
        onCompleted: (data) => {
            console.log('successfully updated workflow state:', data);
            refetchQueued();
            refetchInProgress();
            refetchComplete();
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log('error updated workflow state', error);
        }
    });

// Helper for custom icons (works with ColorlibStepIconRoot in StepperHelpers)
    function ColorlibStepIcon(props: StepIconProps) {
        const { active, completed, className } = props;
        let image: any;
        // const imageCached: any = useMemo(() => 
        //     <img className={className}
        //     src={nodes[Number(props.icon)-1].icon}
        //     width="50" height="50" 
        //     referrerPolicy="no-referrer" />, [nodes[Number(props.icon)-1].icon]);
        completed 
            ? image = <CheckCircleOutlineIcon fontSize="large" sx={{color: "white"}}/>
            :   // TODO: Cache images (keeps overloading google w/ requests)
                
                image = <img className={className}
                  src={nodes[Number(props.icon)-1].icon}
                  width="50" height="50" />
                //   <QuestionMarkIcon />
        return (
            <ColorlibStepIconRoot ownerState={{ completed, active }} className={className}>
                {image}
                {/* <QuestionMarkIcon /> */}
            </ColorlibStepIconRoot>
        );
    };

    return (
        <Stepper
            nonLinear
            alternativeLabel 
            // activeStep usually scalar; here array; get warning; doesn't seem to cause probs
            activeStep = {active}
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
                    {nodes[index].technicianFirst ? nodes[index].technicianFirst : ""}<br/> 
                    {nodes[index].technicianLast  ? nodes[index].technicianLast  : "Unassigned"}<br/><br/>
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
    )
}
