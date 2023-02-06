import { gql, useMutation, useQuery } from '@apollo/client'
import React, { useState } from 'react'
import { GET_SERVICES } from '../gql/queries';
import WorkflowStepper from '../components/WorkflowStepper';
import TextField from '@mui/material/TextField';
import { Button, Typography } from '@mui/material';
import { UPDATE_WORKFLOW_STATE } from '../gql/mutations';


export default function Accepted() {

    const [workflows, setWorkflows] = useState([]);

    const [updateWorkflowMutation] = useMutation(UPDATE_WORKFLOW_STATE, {
        onCompleted: (data) => {
            console.log('successfully accepted workflow:', data);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log('error accepting workflow', error);
        }
    });

    // get workflows from gql
    const GET_WORKFLOWS_BY_STATE = gql`
        query GetWorkflowsByState {
            getWorkflowByState(state: APPROVED) {
                    id
                    state
                    nodes {
                        service {
                            name
                            icon
                        }
                        formData
                    }
                    edges {
                        source {
                            id
                        }
                        target {
                            id
                        }
                    }
                
            }
        }
    `;

    const GET_JOB_BY_WORKFLOW_ID = gql`
        query JobByWorkflowId($id: ID!) {
            jobByWorkflowId(id: $id) {
                id
                name
                username
                institute
            }
        }
    `;

    useQuery(GET_WORKFLOWS_BY_STATE, {
        variables: { state: "APPROVED" },
        onCompleted: (data) => {
            console.log('workflows loaded successfully on accepted', data);
            setWorkflows(data.getWorkflowByState);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log('error when loading workflows on accepted', error);
        }
    });

    const transformGQLToWorkflow = (workflow: any) => {
        let nodes = workflow.nodes.map((node: any) => {
            return {
                id: node.service.id,
                name: node.service.name,
                data: {
                    icon: node.service.icon,
                    formData: node.formData
                },
                
            }
        });

        let edges = workflow.edges.map((edge: any) => {
            return {
                source: edge.source.id,
                target: edge.target.id
            }
        });

        const val =  {
            id: workflow.id,
            state: workflow.state,
            nodes: nodes,
            edges: edges
        }
        return val;
    }

    const queueWorkflow = (workflowId: string) => {

        let updateWorkflowState = {
            workflowId: workflowId,
            state: 'QUEUED'
        }

        updateWorkflowMutation({
            variables: { updateWorkflowState: updateWorkflowState }
        });

    }
    

  return (
    <>
    <h4>Accepted Workflows</h4>
    <TextField id="outlined-basic" label="Search workflows" variant="outlined" fullWidth/>
    {
        workflows.map((workflow: any) => (
            <div key={workflow.id + Math.random} style={{ textAlign: 'left',border: '1px solid grey', borderRadius: 5, margin: 5, padding: 5 }}>
                <div className='nodes' key={workflow.id + Math.random}>
                    <Typography variant='h6'>Workflow ID: {workflow.id}</Typography>
                    <Typography variant='h6'>Workflow State: {workflow.state}</Typography>
                    <Typography variant='h6'>Workflow Name: {workflow.name || "Name not provided"}</Typography>
                    <Button onClick={() => queueWorkflow(workflow.id)}>
                        Move to Queue
                    </Button>
                    <WorkflowStepper workflow={transformGQLToWorkflow(workflow).nodes} key={workflow.id + Math.random}/>
                </div>
            </div>
        ))
    }
    </>
    
  )
}
function acceptWorkflowMutation(arg0: { variables: { updateWorkflowState: { workflowId: string; state: string; }; }; }) {
    throw new Error('Function not implemented.');
}

