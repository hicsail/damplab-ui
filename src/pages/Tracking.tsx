import { useQuery } from '@apollo/client';
import React, { useState } from 'react'
import { useParams } from 'react-router-dom';
import { GET_JOB_BY_ID } from '../gql/queries';
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

    // const acceptJob = () => {
    //     let updateWorkflowState = {
    //         workflowId: workflow.id,
    //         state: 'APPROVED'
    //     }
    //     updateJobMutation({
    //         variables: { updateWorkflowState: updateWorkflowState }
    //     });
    // }

    // const returnJob = () => {
    //     let updateWorkflowState = {
    //         workflowId: workflow.id,
    //         state: 'WAITING_FOR_SOW'  // TODO: Will need to change; temporary
    //     }
    //     updateJobMutation({
    //         variables: { updateWorkflowState: updateWorkflowState }
    //     });
    // }

    // const rejectJob = () => {
    //     let updateWorkflowState = {
    //         workflowId: workflow.id,
    //         state: 'REJECTED'
    //     }
    //     updateJobMutation({
    //         variables: { updateWorkflowState: updateWorkflowState }
    //     });
    // }

    // const [updateJobMutation] = useMutation(MUTATE_WORKFLOW_STATE, {
    //     onCompleted: (data) => {
    //         console.log('successfully updated workflow state:', data);
    //     },
    //     onError: (error: any) => {
    //         console.log(error.networkError?.result?.errors);
    //         console.log('error updated workflow state', error);
    //     }
    // });



    return (
        <div style={{ textAlign: 'left', padding: '5vh' }}>
            <Typography variant="h3">Job Tracking</Typography>
            {/* // TODO: Mutate state */}
            <Button><Link to={"/resubmission/" + id}>Return to submitter...</Link></Button>
            <Button><Link to={"/"}>Accept as is</Link></Button>
            <Box sx={{ flexDirection: 'column', p: 1, m: 1 }}>
                <Typography variant="h5" style={{marginBottom: 15}}>Details</Typography>
                <Typography>Name        : {workflowName}</Typography>
                <Typography>State       : IN REVIEW</Typography>
                <Typography>Submitter   : {workflowUsername}</Typography>
                <Typography>Institution : {workflowInstitution}</Typography>
                <Typography>Email       : {workflowEmail}</Typography>
            </Box>
            <Box>
                {workflows.map((workflow: any) => {return (
                    <div style={{marginBottom: 50}}>
                        <Typography variant="h5" style={{marginBottom: 15}}>Workflow: {workflow.name}</Typography>
                        <div>
                            {/* {workflow.parent !== 'checkout' && (
                                <div>
                                    <Button onClick={}>Flag</Button>
                                    <Button onClick={acceptJob}>Validate</Button>
                                </div>
                            )}     */}
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
