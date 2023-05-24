import { useState, useEffect } from "react";
import { gql, useQuery, useLazyQuery, useMutation } from "@apollo/client";
import DominosStepper from "../components/DominosStepper";
import { GET_WORKFLOWS_FOR_DOMINOS } from "../gql/queries";
import {transformGQLforDominos} from "../controllers/GraphHelpers";
import { Typography } from "@mui/material";
import { ThemeProvider } from "@emotion/react";
import "../styles/dominos.css";
import { bodyText, StyledContainer } from "../styles/themes";
import { MUTATE_WORKFLOW_STATE } from "../gql/mutations";

export default function Dominos() {
    const [queuedWorkflows,     setQueuedWorkflows]     = useState([]);
    const [inProgressWorkflows, setInProgressWorkflows] = useState([]);
    const [completedWorkflows,  setCompletedWorkflows]  = useState([]);

    // TODO: set up interval polling or refetching
    const useQueries = ($state: string, $setterFunc: Function) => {
        useQuery(GET_WORKFLOWS_FOR_DOMINOS, {  // TODO: setup date/technician fields on gql
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
    }

    useQueries("QUEUED",      setQueuedWorkflows);
    useQueries("IN_PROGRESS", setInProgressWorkflows);
    useQueries("COMPLETE",    setCompletedWorkflows); // TODO: limit to recent 5

    return (
        <ThemeProvider theme={bodyText}>
            {completedWorkflows.map((workflow: any) => ( 
                <div key={workflow.id}
                    className="dominos"
                    style={{borderColor: "green", 
                            backgroundColor: 'rgba(152, 251, 152, 0.3)',}}
                >
                    <StyledContainer>
                            <Typography order="1">Completed</Typography>
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
                    <StyledContainer>
                            <Typography order="1">In Progress</Typography>
                            <Typography order="2">{workflow.name}</Typography>
                            <Typography order="3">Due: {new Date(Date.now()).toDateString().toLocaleString()}</Typography>
                    </StyledContainer>
                        <DominosStepper
                            nodes         = {transformGQLforDominos(workflow).nodes}
                            id            = {workflow.id}
                            workflowState = {workflow.state}
                        />
                </div>
            ))}
            {queuedWorkflows.map((workflow: any) => (
                <div key={workflow.id}
                    className="dominos"
                    style={{borderColor: "grey", 
                            backgroundColor: 'rgba(192, 192, 192, 0.2)',}}
                >
                    <StyledContainer>
                            <Typography order="1">Pending</Typography>
                            <Typography order="2">{workflow.name}</Typography>
                            <Typography order="3">Due: {new Date(Date.now()).toDateString().toLocaleString()}</Typography>
                    </StyledContainer>
                        <DominosStepper
                            nodes         = {transformGQLforDominos(workflow).nodes}
                            id            = {workflow.id}
                            workflowState = {workflow.state}
                        />
                </div>
            ))}
        </ThemeProvider>
    );
}
