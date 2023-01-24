import React, { useContext, useState } from 'react'
import { Accordion, Snackbar, TextField } from '@mui/material';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import Button from '@mui/material/Button';
import { CanvasContext } from '../contexts/Canvas'
import { ApolloError, gql, useMutation } from '@apollo/client';
import { onError } from "apollo-link-error";
import { GraphQLError } from 'graphql';


export default function Checkout() {

    const val = useContext(CanvasContext);
    const [workflowName, setWorkflowName] = useState('');
    const [username, setUserName] = useState('');
    const [institution, setInstitution] = useState('');
    const [open, setOpen] = useState(false);


    // function that traverses over nodes and edges and returns a list of all the nodes in order

    const getWorkflowsFromGraph = (nodes: any, edges: any) => {

        if (nodes.length === 0) return [];
        // loop over edges and identify start nodes
        let startNodes: any = [];
        // if edge.source is not in edges.target, then it is a start node
        edges.forEach((edge: any) => {
            let isStartNode = true;
            edges.forEach((e: any) => {
                if (edge.source === e.target) {
                    isStartNode = false;
                }
            });
            if (isStartNode) {
                startNodes.push(edge.source);
            }
        });

        // add start nodes that are not in edges.source or destination
        nodes.forEach((node: any) => {
            let isStartNode = true;
            edges.forEach((e: any) => {
                if (node.id === e.source || node.id === e.target) {
                    isStartNode = false;
                }
            });
            if (isStartNode) {
                startNodes.push(node.id);
            }
        });



        // loop over start nodes and create workflows
        let workflows: any = [];
        startNodes.forEach((startNode: any) => {
            let workflow: any = [];
            let node = nodes.find((n: any) => n.id === startNode);
            workflow.push(node);
            let i = 0;
            while (i < edges.length) {
                let edge = edges[i];
                if (edge.source === node.id) {
                    node = nodes.find((n: any) => n.id === edge.target);
                    workflow.push(node);
                    i = 0;
                } else {
                    i++;
                }
            }
            workflows.push(workflow);
        });

        return workflows;
    }

    const transformNodesToGQL = (nodes: any) => {

        let gqlNodes: any = [];

        nodes.forEach((node: any) => {
            let gqlNode: any = {};
            gqlNode = { ...node.data };
            gqlNode.reactNode = node;
            gqlNode.serviceId = node.data.serviceId // random value for now 
            // remove allowedConnections
            delete gqlNode.allowedConnections;
            delete gqlNode.icon;
            //delete gqlNode.serviceId;
            delete gqlNode.parameters;
            gqlNodes.push(gqlNode);
        });
        return gqlNodes;

    }

    const transformEdgesToGQL = (edges: any) => {

        let gqlEdges: any = [];

        edges.forEach((edge: any) => {
            let gqlEdge: any = {};
            gqlEdge.source = edge.source;
            gqlEdge.target = edge.target;
            gqlEdge.reactEdge = edge;
            gqlEdge.id = "hello world" + Math.random() // random value for now 
            gqlEdges.push(gqlEdge);
        });
        return gqlEdges;
    }

    const CREATE_WORKFLOW = gql`
        mutation createWorkflow($createWorkflowInput: AddWorkflowInput!) {
        createWorkflow(createWorkflowInput: $createWorkflowInput) {
            name
            nodes {
            id
            }
            edges {
            id
            }
        }
        }
    `;

    const [createWorkflow, { data, loading, error }] = useMutation(CREATE_WORKFLOW, {
        onCompleted: (data) => {
            // handle success
            console.log('success');
            console.log(data);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
        }
    });
    const saveWorkflow = () => {

        let gqlWorkflows: any = transformNodesToGQL(val.nodes);
        let gqlEdges: any = transformEdgesToGQL(val.edges);
        let workflow = {
            name: workflowName,
            username: username,
            institution: institution,
            nodes: gqlWorkflows,
            edges: gqlEdges
        }
        console.log(workflow);
        createWorkflow({
            variables: { createWorkflowInput: workflow }, onCompleted(data, clientOptions) {
                console.log(data);
                setOpen(true);
                console.log(clientOptions);
            },
        });

    }

    const link = onError(({ graphQLErrors, networkError }) => {
        if (graphQLErrors)
            graphQLErrors.map(({ message, locations, path }) =>
                console.log(
                    `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`,
                ),
            );

        if (networkError) console.log(`[Network error]: ${networkError}`);
    });

    return (
        <div>
            <div>
                <div>
                    <h1>Checkout</h1>
                    {
                        // print workflows side by side
                        getWorkflowsFromGraph(val.nodes, val.edges).map((workflow: any, index: number) => {
                            return (
                                <div style={{ textAlign: 'start', padding: 10, overflowX: 'auto' }}>
                                    <div>
                                        <h4>Workflow {index + 1}</h4>
                                    </div>

                                    <div style={{ display: 'flex', justifyContent: 'flex-start', height: 'fit-content' }}>

                                        {
                                            workflow.map((node: any) => {
                                                return (
                                                    <Accordion>
                                                        <AccordionSummary
                                                            expandIcon={<ExpandMoreIcon />}
                                                        >
                                                            <div style={{ border: 'solid 1px', width: 'fit-content', margin: 10, padding: 10 }}>
                                                                <div>
                                                                    <img src={node.data.icon} alt={node.name} style={{ width: 30 }} />
                                                                </div>
                                                                <div>
                                                                    <h3>
                                                                        {node.name}
                                                                    </h3>
                                                                </div>
                                                            </div>
                                                        </AccordionSummary>
                                                        <AccordionDetails>
                                                            <div>
                                                                <h4>Details</h4>
                                                                <div>
                                                                    <h5>Node ID: {node.id}</h5>
                                                                </div>
                                                                <div>
                                                                    <h5>Node Name: {node.name}</h5>
                                                                </div>
                                                                <div>
                                                                    <h5>Parameters</h5>
                                                                    <div>
                                                                        {
                                                                            node.data.formData.map((parameter: any) => {

                                                                                return (
                                                                                    <div style={{ display: 'flex', justifyItems: 'flex-start' }}>
                                                                                        <h6>{parameter.name + ' : '} </h6>
                                                                                        <div>
                                                                                            <h6>{' ' + parameter.value}</h6>
                                                                                        </div> {
                                                                                            parameter.paramType === 'result' ? <h6>Alternate: {parameter.resultParamValue}</h6> : null
                                                                                        }
                                                                                    </div>
                                                                                )
                                                                            })
                                                                        }
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </AccordionDetails>

                                                    </Accordion>
                                                )
                                            })

                                        }
                                    </div>
                                </div>
                            )
                        })
                    }
                </div>
                <div>
                </div>
                <div>
                    <TextField label="Workflow" variant="outlined" onChange={(e) => setWorkflowName(e.target.value)} />
                    <TextField label="Name" variant="outlined" onChange={(e) => setUserName(e.target.value)} />
                    <TextField label="Institution" variant="outlined" onChange={(e) => setInstitution(e.target.value)} />
                    <Button variant="contained" onClick={() => {
                        console.log(workflowName);
                        console.log(username);
                        console.log(institution);
                        saveWorkflow();
                    }}>Submit</Button>
                </div>
            </div>
            <Snackbar
                open={open}
                autoHideDuration={6000}
                message={"Saved, find at /submitted/" + {workflowName}}
            />
        </div>

    )
}
