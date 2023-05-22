import { useState } from "react";
import { gql, useQuery } from "@apollo/client";
import DominosStepper from "../components/DominosStepper";
import { GET_WORKFLOWS_FOR_DOMINOS } from "../gql/queries";
import {transformGQLforDominos} from "../controllers/GraphHelpers";
import { Typography } from "@mui/material";
import { ThemeProvider } from "@emotion/react";
import "../styles/dominos.css";
import { bodyText, StyledContainer } from "../styles/themes";

export default function Dominos() {
    const [queuedWorkflows,     setQueuedWorkflows]     = useState([]);
    const [inProgressWorkflows, setInProgressWorkflows] = useState([]);
    const [completedWorkflows,  setCompletedWorkflows]  = useState([]);

    // Retrieve QUEUED
    useQuery(GET_WORKFLOWS_FOR_DOMINOS, {
        variables: { state: "QUEUED" },
        onCompleted: (data) => {
            console.log("queued workflows loaded successfully", data);
            setQueuedWorkflows(data.getWorkflowByState);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log("error when loading queued workflows", error);
        },
    });

    // Retrieve IN_PROGRESS
    useQuery(GET_WORKFLOWS_FOR_DOMINOS, {
        variables: { state: "IN_PROGRESS" },
        onCompleted: (data) => {
            console.log("in progress workflows loaded successfully", data);
            setInProgressWorkflows(data.getWorkflowByState);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log("error when loading in progress workflows", error);
        },
    });

    // Retrieve COMPLETE
    useQuery(GET_WORKFLOWS_FOR_DOMINOS, {
        variables: { state: "COMPLETE" },
        onCompleted: (data) => {
            console.log("completed workflows loaded successfully", data);
            setCompletedWorkflows(data.getWorkflowByState);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log("error when loading completed workflows", error);
        },
    });

    // Trim completed to 5 most recent


    return (
        <>
        <ThemeProvider theme={bodyText}>
            {completedWorkflows.map((workflow: any) => ( 
                <div key={workflow.id}
                    className="dominos"
                    style={{ borderColor: "green", backgroundColor: 'rgba(152, 251, 152, 0.3)', }}
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
                    style={{ borderColor: "blue", backgroundColor: 'rgba(240, 255, 255, 1)', }}
                >
                    <StyledContainer>
                            <Typography order="1">In Progress</Typography>
                            <Typography order="2">{workflow.name}</Typography>
                            <Typography order="3">Due: {new Date(Date.now()).toDateString().toLocaleString()}</Typography>
                    </StyledContainer>
                        <DominosStepper
                            nodes={transformGQLforDominos(workflow).nodes}
                            id={workflow.id}
                        />
                </div>
            ))}
            {queuedWorkflows.map((workflow: any) => (
                <div key={workflow.id}
                    className="dominos"
                    style={{ borderColor: "grey", backgroundColor: 'rgba(192, 192, 192, 0.2)', }}
                >
                    <StyledContainer>
                            <Typography order="1">Pending</Typography>
                            <Typography order="2">{workflow.name}</Typography>
                            <Typography order="3">Due: {new Date(Date.now()).toDateString().toLocaleString()}</Typography>
                    </StyledContainer>
                        <DominosStepper
                            nodes={transformGQLforDominos(workflow).nodes}
                            id={workflow.id}
                            workflowState={workflow.state}
                        />
                </div>
            ))}
        </ThemeProvider>
        </>
    );
}
