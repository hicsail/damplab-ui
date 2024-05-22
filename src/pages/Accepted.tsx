import React, { useState } from 'react'
import { gql, useMutation, useQuery } from '@apollo/client'
import TextField              from '@mui/material/TextField';
import { Button, Typography } from '@mui/material';

import { GET_SERVICES }          from '../gql/queries';
import { UPDATE_WORKFLOW_STATE } from '../gql/mutations';
import WorkflowStepper from '../components/WorkflowStepper';


export default function Accepted() {

    const [workflows, setWorkflows] = useState([]);
    const [displayWorkflows, setDisplayWorkflows] = useState([]);

    const [updateWorkflowMutation] = useMutation(UPDATE_WORKFLOW_STATE, {
        onCompleted: (data) => {
            console.log('successfully accepted workflow:', data);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log('error accepting workflow', error);
        }
    });

    // TODO: Replce with reference to queries.tsx object; use design pattern from Dashboard and elsewhere...
    // get workflows from gql
    const GET_WORKFLOWS_BY_STATE = gql`
        query GetWorkflowsByState {
            getWorkflowByState(state: APPROVED) {
                    id
                    state
                    name
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

    useQuery(GET_WORKFLOWS_BY_STATE, {
        variables: { state: "APPROVED" },
        onCompleted: (data) => {
            console.log('workflows loaded successfully on accepted', data);
            setWorkflows(data.getWorkflowByState);
            setDisplayWorkflows(data.getWorkflowByState);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log('error when loading workflows on accepted', error);
        }
    });

    const transformGQLToWorkflow = (workflow: any) => {
        let nodes = workflow.nodes.map((node: any) => {
            return {
                id:   node.service.id,
                name: node.service.name,
                data: {
                    icon    : node.service.icon,
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
            id   : workflow.id,
            state: workflow.state,
            name : workflow.name,
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

    const searchWorkflows = (searchTerm: string) => {
        console.log('searching for workflows with term', searchTerm);
        let filteredWorkflows = workflows.filter((workflow: any) => {
            return workflow.name.includes(searchTerm);
        });
        console.log('filtered workflows', filteredWorkflows);
        setDisplayWorkflows(filteredWorkflows);
    }
    

  return (
    <>
        <h4>Accepted Workflows</h4>
        <TextField onChange={(e)=> searchWorkflows(e.target.value)} id="outlined-basic" label="Search workflows" variant="outlined" fullWidth />
        {
            workflows.map((workflow: any) => (
                <div key={workflow.id + Math.random} style={{ textAlign: 'left',border: '1px solid grey', borderRadius: 5, margin: 5, padding: 5 }}>
                    <div key={workflow.id + Math.random} className='nodes'>

                        <Typography variant='body1'>Workflow ID:    {workflow.id}                         </Typography>
                        <Typography variant='body1'>Workflow State: {workflow.state}                      </Typography>
                        <Typography variant='body1'>Workflow Name:  {workflow.name || "Name not provided"}</Typography>

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
