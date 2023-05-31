import { useQuery, useMutation } from '@apollo/client';
import React, { useState } from 'react'
import { useParams } from 'react-router-dom';
import { GET_JOB_BY_ID } from '../gql/queries';
import { MUTATE_JOB_STATE } from '../gql/mutations';
import { Box, InputLabel, Typography } from '@mui/material';
import Button from '@mui/material/Button';
import WorkflowStepper from '../components/WorkflowStepper';
import Stepper from '@mui/material/Stepper';
import WorkflowSteps from '../components/WorkflowSteps';
import TrackingStepper from '../components/TrackingStepper';
import { Link } from "react-router-dom";

export default function Tracking() {

    const { id } = useParams();
    const [workflowName, setWorkflowName] = useState('');
    const [workflowState, setWorkflowState] = useState('');
    const [workflowUsername, setWorkflowUsername] = useState('');
    const [workflowInstitution, setWorkflowInstitution] = useState('');
    const [workflowEmail, setWorkflowEmail] = useState('');
    const [workflowNodes, setWorkflowNodes] = useState([]); // ▶ URLSearchParams {}
    const [workflows, setWorklows] = useState([]); // ▶ URLSearchParams {}
    // const [jobState, setJobState] = useState('');



    const { loading, error, data } = useQuery(GET_JOB_BY_ID, {
        variables: { id: id },
        onCompleted: (data) => {
            console.log('job successfully loaded: ', data);
            setWorkflowName(data.jobById.name);
            setWorkflowState(data.jobById.workflows[0].state);
            setWorkflowUsername(data.jobById.username);
            setWorkflowInstitution(data.jobById.institute);
            setWorkflowEmail(data.jobById.email);
            setWorklows(data.jobById.workflows);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
        }
    });

    const transformGQLToWorkflow = (workflow: any) => {
        console.log(workflow);
        let nodes = workflow.nodes.map((node: any) => {
            return {
                id: node.id,
                name: node.service.name,
                state: node.state,
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

        const val = {
            id: workflow.id,
            state: workflow.state,
            name: workflow.name,
            nodes: nodes,
            edges: edges
        }
        return val;
    }


    const [updateJobMutation] = useMutation(MUTATE_JOB_STATE, {
        variables: { ID: id, State: 'WAITING_FOR_SOW' },
        onCompleted: (data) => {
            console.log('successfully updated job state:', data);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log('error updated job state', error);
        }
    });


    return (
        <div style={{ textAlign: 'left', padding: '5vh' }}>
            <Typography variant="h3">Job Tracking</Typography>
            <Button 
                href={"/resubmission/" + id} 
                style={{marginLeft:8}}
                // onClick={updateJobMutation()}
            >Update job on Canvas...</Button>
            <Box sx={{ flexDirection: 'column', p: 1, m: 1, mb: 5}} key={Math.random().toString(36).substring(2, 9)}>
                <Typography variant="h5" style={{marginBottom: 10}}>Job Details</Typography>
                <Typography sx={{ml:2}}>Name        : {workflowName}</Typography>
                <Typography sx={{ml:2}}>State       : IN REVIEW</Typography>
                <Typography sx={{ml:2}}>Submitter   : {workflowUsername}</Typography>
                <Typography sx={{ml:2}}>Institution : {workflowInstitution}</Typography>
                <Typography sx={{ml:2}}>Email       : {workflowEmail}</Typography>
            </Box>
            <Box sx={{ p: 1, m: 1 }}>
                {workflows.map((workflow: any) => {return (
                    <div style={{marginBottom: 50}} key={Math.random().toString(36).substring(2, 9)}>
                        <Typography variant="h5" style={{marginBottom: 15}}>Workflow: {workflow.name}</Typography>
                        <div style={{marginLeft: 2}}>
                            {workflow.parent !== 'checkout' && (
                                <div style={{marginBottom: 8}}>
                                    <Button>Flag</Button>
                                    <Button>Validate</Button>
                                </div>
                            )}    
                        </div>
                        <Stepper>
                            <TrackingStepper 
                                workflow={transformGQLToWorkflow(workflow).nodes} 
                                key={workflow.id} 
                            />
                        </Stepper>
                    </div>
                    )
                })}
            </Box>

        </div>
    )
}
