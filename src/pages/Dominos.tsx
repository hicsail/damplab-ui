import React, { useEffect, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Button, Typography, createTheme } from "@mui/material";
import Box from '@mui/material/Box';
import DominosStepper from "../components/DominosStepper";
import { UPDATE_WORKFLOW_STATE } from '../gql/mutations';
import { ThemeProvider } from "@emotion/react";

export default function Dominos() {
    const [queuedWorkflows,     setQueuedWorkflows]     = useState([]);
    const [inProgressWorkflows, setInProgressWorkflows] = useState([]);
    const [completedWorkflows,  setCompletedWorkflows]  = useState([]);

    const [updateWorkflowMutation] = useMutation(UPDATE_WORKFLOW_STATE, {
        onCompleted: (data) => {
            console.log('successfully completed workflow:', data);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log('error completing workflow', error);
        }
    });

    // Themes (will modularize)
    const bodyText = createTheme();
    bodyText.typography.body2 = {
        fontSize: 16,
    }

    // GQL Query: workflow retrieval by state:(QUEUED | IN_PROGRESS | COMPLETE)
    const GET_WORKFLOWS_BY_STATE = gql`
        query GetWorkflowByState($state: WorkflowState!) {
            getWorkflowByState(state: $state) {
                id
                name
                state
                # dueDate
                # timeCompleted
                nodes {
                    formData
                    service {
                        id
                        name
                        parameters
                        icon
                        # technicianFirst
                        # technicianLast
                    }
                }
            }
        }
    `;

    // Retrieve QUEUED
    useQuery(GET_WORKFLOWS_BY_STATE, {
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
    useQuery(GET_WORKFLOWS_BY_STATE, {
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
    useQuery(GET_WORKFLOWS_BY_STATE, {
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

    const transformGQLToWorkflow = (workflow: any) => {
        let nodes = workflow.nodes.map((node: any) => {
            return {
                id: node.service.id,
                name: node.service.name,
                data: {
                    icon: node.service.icon,
                    formData: node.formData,
                },
            };
        });

        const val = {
            id: workflow.id,
            name: workflow.name,
            state: workflow.state,
            // technicianFirst: technicianFirst,
            // technicianLast: technicianLast,
            // dueDate: dueDate,
            // timeCompleted: timeCompleted,
            nodes: nodes,
        };
        return val;
    };

    return (
        <>
        <ThemeProvider theme={bodyText}>
            {completedWorkflows.map((workflow: any) => (
                <div
                    key={workflow.id}
                    style={{
                        textAlign: "start",
                        border: "2px solid green", borderRadius: 5,
                        backgroundColor: 'rgba(152, 251, 152, 0.3)',
                        margin: 5, padding: 5,
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" order="1">
                                <span style={{color: 'black'}}><b>Completed</b></span>
                            </Typography>
                            <Typography variant="body2" order="2">
                                <b>{workflow.name}</b> <span style={{fontSize: 12}}>({workflow.id})</span>
                            </Typography>
                            <Typography variant="body2" order="3">
                                <b>Finished</b>: {new Date(Date.now()).toDateString().toLocaleString()}
                            </Typography>
                    </Box>
                </div>
            ))}
            {inProgressWorkflows.map((workflow: any) => (
                <div
                    key={workflow.id}
                    style={{
                        textAlign: "start",
                        border: "2px solid blue", borderRadius: 5,
                        backgroundColor: 'rgba(240, 255, 255, 1)',
                        margin: 5, padding: 5,
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" order="1">
                                <span style={{color: 'black'}}><b>In Progress</b></span>
                            </Typography>
                            <Typography variant="body2" order="2">
                                <b>{workflow.name}</b> <span style={{fontSize: 12}}>({workflow.id})</span>
                            </Typography>
                            <Typography variant="body2" order="3">
                                <b>Due</b>: {new Date(Date.now()).toDateString().toLocaleString()}
                            </Typography>
                    </Box>
                        <DominosStepper
                            workflow={transformGQLToWorkflow(workflow).nodes}
                            id={workflow.id}
                        />
                </div>
            ))}
            {queuedWorkflows.map((workflow: any) => (
                <div
                    key={workflow.id}
                    style={{
                        textAlign: "start",
                        border: "2px solid grey", borderRadius: 5,
                        backgroundColor: 'rgba(192, 192, 192, 0.2)',
                        margin: 5, padding: 5
                    }}
                >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                            <Typography variant="body2" order="1">
                                <span style={{color: 'black'}}><b>Pending</b></span>
                            </Typography>
                            <Typography variant="body2" order="2">
                                <b>{workflow.name}</b> <span style={{fontSize: 12}}>({workflow.id})</span>
                            </Typography>
                            <Typography variant="body2" order="3">
                                <b>Due</b>: {new Date(Date.now()).toDateString().toLocaleString()}
                            </Typography>
                    </Box>
                        <DominosStepper
                            workflow={transformGQLToWorkflow(workflow).nodes}
                            id={workflow.id}
                        />
                </div>
            ))}
        </ThemeProvider>
        </>
    );
}
