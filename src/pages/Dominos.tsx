import { Component, useState } from "react";
import { useQuery, useMutation } from "@apollo/client";
import { Typography } from "@mui/material";
import { ThemeProvider } from "@emotion/react";

import { GET_WORKFLOWS_FOR_DOMINOS }                 from "../gql/queries";
import { MUTATE_NODE_STATUS, MUTATE_WORKFLOW_STATE } from "../gql/mutations";
import {transformGQLforDominos} from "../controllers/GraphHelpers";
import DominosStepper           from "../components/DominosStepper";
import { bodyText, StyledContainer } from "../styles/themes";
import "../styles/dominos.css";


export default function Dominos() {
    
    const [queuedWorkflows,     setQueuedWorkflows]     = useState([]);
    const [inProgressWorkflows, setInProgressWorkflows] = useState([]);
    const [completedWorkflows,  setCompletedWorkflows]  = useState([]);

    const useQueries = ($state: string, $setterFunc: Function) => {
        const { loading, error, data, refetch } = useQuery(GET_WORKFLOWS_FOR_DOMINOS, {  // TODO: setup date/technician fields on gql
            variables: { state: $state },
            onCompleted: (data) => {
                console.log($state, " workflows loaded successfully", data);
                $setterFunc(data.getWorkflowByState);
            },
            onError: (error: any) => {
                console.log(error.networkError?.result?.errors);
                console.log("error when loading ", $state, " workflows", error);
            },
        });

        return refetch
    }
    
    const refetchQueued     = useQueries("QUEUED",      setQueuedWorkflows);
    const refetchInProgress = useQueries("IN_PROGRESS", setInProgressWorkflows);
    const refetchComplete   = useQueries("COMPLETE",    setCompletedWorkflows);   // TODO: limit to ~5 most recent?

    const mutateServiceStatus = (globalId: string, status: string) => {
        mutateNodeStatus({
            variables: { _ID: globalId, State: status }
        });
    }

// For resetting workflow
    const [mutateNodeStatus] = useMutation(MUTATE_NODE_STATUS, {
        onCompleted: (data) => {
            console.log("successfully updated service status:", data);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log("error updating service status", error);
        },
    });
    
    const updateWorkflow = (id: string) => {
        updateWorkflowMutation({
            variables: { ID: id, State: 'QUEUED' }
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

    const resetServices = (nodes: any) => nodes.map((node: any) => {
        mutateServiceStatus(node.globalId, 'QUEUED');
    });
    
    const resetWorkflow = (workflow: any) => updateWorkflow(workflow.id);



    return (
        <ThemeProvider theme={bodyText}>
            {completedWorkflows.map((workflow: any) => ( 
                <div key={workflow.id}
                    className="dominos"
                    style={{borderColor: "green", 
                            backgroundColor: 'rgba(152, 251, 152, 0.3)',}}
                >
                    <StyledContainer component='span'>
                        <Typography order="1">Completed&nbsp;&nbsp;
                            <button onClick={() => {
                                resetServices(transformGQLforDominos(workflow).nodes); 
                                resetWorkflow(workflow)}
                            }>Reset</button>
                        </Typography>
                        <Typography order="2">{workflow.name}</Typography>
                        <Typography order="3">Finished: {new Date(Date.now()).toDateString().toLocaleString()}</Typography>
                    </StyledContainer>
                </div>
            ))}
            {inProgressWorkflows.map((workflow: any) => (
                <div key={workflow.id}
                    className="dominos"
                    style={{borderColor: "blue", 
                            backgroundColor: 'rgba(240, 255, 255, 1)',}}
                >
                    <StyledContainer component='span'>
                        <Typography order="1">In Progress</Typography>
                        <Typography order="2">{workflow.name}</Typography>
                        <Typography order="3">Due: {new Date(Date.now()).toDateString().toLocaleString()}</Typography>
                    </StyledContainer>
                    <DominosStepper
                        nodes             = {transformGQLforDominos(workflow).nodes}
                        id                = {workflow.id}
                        workflowState     = {workflow.state}
                        refetchQueued     = {refetchQueued}
                        refetchInProgress = {refetchInProgress}
                        refetchComplete   = {refetchComplete}
                    />
                </div>
            ))}
            {queuedWorkflows.map((workflow: any) => (
                <div key={workflow.id}
                    className="dominos"
                    style={{borderColor: "grey", 
                            backgroundColor: 'rgba(192, 192, 192, 0.2)',}}
                >
                    <StyledContainer component='span'>
                        <Typography order="1">Pending</Typography>
                        <Typography order="2">{workflow.name}</Typography>
                        <Typography order="3">Due: {new Date(Date.now()).toDateString().toLocaleString()}</Typography>
                    </StyledContainer>
                    <DominosStepper
                        nodes             = {transformGQLforDominos(workflow).nodes}
                        id                = {workflow.id}
                        workflowState     = {workflow.state}
                        refetchQueued     = {refetchQueued}
                        refetchInProgress = {refetchInProgress}
                        refetchComplete   = {refetchComplete}
                    />
                </div>
            ))}
        </ThemeProvider>
    )
}
