import React, { useEffect, useState } from "react";
import { gql, useMutation, useQuery } from "@apollo/client";
import WorkflowStepper from "../components/WorkflowStepper";
import { Button, Typography } from "@mui/material";
import DominosStepper from "../components/DominosStepper";

export default function Dominos() {
    const [workflows, setWorkflows] = useState([]); // ▶ URLSearchParams {}

    // get workflows from gql
    const GET_WORKFLOWS_BY_STATE = gql`
        query {
            getWorkflowByState(state: QUEUED) {
                id
                nodes {
                    label
                    formData
                    service {
                        id
                        name
                        parameters
                    }
                }
                edges {
                    id
                    source {
                        id
                        formData
                    }
                    target {
                        id
                        formData
                    }
                }
                state
            }
        }
    `;

    useQuery(GET_WORKFLOWS_BY_STATE, {
        variables: { state: "QUEUED" },
        onCompleted: (data) => {
            console.log("workflows loaded successfully on queued", data);
            setWorkflows(data.getWorkflowByState);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log("error when loading workflows on queued", error);
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

        let edges = workflow.edges.map((edge: any) => {
            return {
                source: edge.source.id,
                target: edge.target.id,
            };
        });

        const val = {
            id: workflow.id,
            state: workflow.state,
            name: workflow.name,
            nodes: nodes,
            edges: edges,
        };
        return val;
    };

    const [queuedWorkflows, setQueuedWorkflows] = useState<any>([]);

    return (
        <>
            <h1>Queued</h1>
            {workflows.map((workflow: any) => (
                <div
                    key={workflow.id}
                    style={{
                        textAlign: "start",
                        border: "1px solid grey",
                        borderRadius: 5,
                        margin: 5,
                        padding: 5,
                    }}
                >
                    <div>
                        <Typography variant="body1">
                            ID: {workflow.id}
                        </Typography>
                        <Typography variant="body1">
                            Status: {workflow.state}
                        </Typography>
                        <Typography variant="body1">
                            Technician: TECHNICIAN NAME HERE
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
