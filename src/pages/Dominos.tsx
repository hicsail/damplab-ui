import React, { useEffect, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import { Button, Typography } from "@mui/material";
import DominosStepper from "../components/DominosStepper";
import { UPDATE_WORKFLOW_STATE } from '../gql/mutations';

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

    // GQL Query: workflow retrieval by state:(QUEUED | IN_PROGRESS | COMPLETE)
    const GET_WORKFLOWS_BY_STATE = gql`
        query GetWorkflowByState($state: WorkflowState!) {
            getWorkflowByState(state: $state) {
                id
                name
                state
                # technician
                # dueDate
                # timeCompleted
                nodes {
                    formData
                    service {
                        id
                        name
                        parameters
                        icon
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
            // technician: technician,
            // dueDate: dueDate
            // timeCompleted: timeCompleted
            nodes: nodes,
        };
        return val;
    };

    return (
        <>
            <h1>Recently Completed Workflows</h1>
            {completedWorkflows.map((workflow: any) => (
                <div
                    key={workflow.id}
                    style={{
                        textAlign: "start",
                        border: "1px solid grey",
                        borderRadius: 5,
                        borderColor: 'green',
                        margin: 5,
                        padding: 5,
                    }}
                >
                    <div>
                        <Typography variant="body1">
                            Name (ID): {workflow.name} ({workflow.id})
                        </Typography>
                        <Typography variant="body1">
                            Status: <span style={{color: 'green'}}>Completed by {workflow.technician ? workflow.technician : "UNASSIGNED"} on {new Date(Date.now()).toDateString().toLocaleString()}</span>
                        </Typography>
                    </div>
                </div>
            ))}
            <h1>Queued Workflows</h1>
            {queuedWorkflows.map((workflow: any) => (
                <div
                    key={workflow.id}
                    style={{
                        textAlign: "start",
                        border: "1px solid grey",
                        borderRadius: 5,
                        borderColor: 'blue',
                        margin: 5,
                        padding: 5,
                    }}
                >
                    <div>
                        <Typography variant="body1">
                            Name (ID): {workflow.name} ({workflow.id})
                        </Typography>
                        <Typography variant="body1">
                            Status: <span style={{color: 'blue'}}>{workflow.state}</span>
                        </Typography>
                        <Typography variant="body1">
                            Due Date: {new Date(Date.now()).toDateString().toLocaleString()}
                        </Typography>
                        <Typography variant="body1">
                            Technician: {workflow.technician ? workflow.technician : "UNASSIGNED"}
                        </Typography>
                        <DominosStepper
                            workflow={transformGQLToWorkflow(workflow).nodes}
                            id={workflow.id}
                        />
                    </div>
                </div>
            ))}
        </>
    );
}
