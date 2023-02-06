import React, { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@apollo/client';
import { useParams } from 'react-router-dom';
import { GET_JOB_BY_ID, } from '../gql/queries';
import { UPDATE_WORKFLOW_STATE } from '../gql/mutations';
import { Button, Typography } from '@mui/material';
import WorkflowStepper from '../components/WorkflowStepper';

export default function Submitted() {

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

    const [acceptWorkflowMutation] = useMutation(UPDATE_WORKFLOW_STATE, {
        onCompleted: (data) => {
            console.log('successfully accepted workflow:', data);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
            console.log('error accepting workflow', error);
        }
    });


    const acceptWorkflow = (workflowId: string) => {

        let updateWorkflowState = {
            workflowId: workflowId,
            state: 'APPROVED'
        }

        acceptWorkflowMutation({
            variables: { updateWorkflowState: updateWorkflowState }
        });

    }

    const transformGQLToWorkflow = (workflow: any) => {
        console.log(workflow);
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
            name: workflow.name,
            nodes: nodes,
            edges: edges
        }
        console.log(val);
        return val;
    }

    const [submittedWorkflows, setSubmittedWorkflows] = useState<any>([]);

    useEffect(() => {
        if (workflows.length > 0) {
            workflows.map((workflow: any) => {
                // add workflow to submitted workflows state
                setSubmittedWorkflows([...submittedWorkflows, transformGQLToWorkflow(workflow)]);
            });
        }
    }, [workflows]);

    useEffect(() => {
        console.log('submitted workflows: ', submittedWorkflows);
    }, [submittedWorkflows]);




    return (
        <>
            <div>Submitted</div>
            <div>
                <h1>Name : {workflowName}</h1>
                <h1>State : IN REVIEW</h1>
                <h1>Submitter: {workflowUsername}</h1>
                <h1>Institution: {workflowInstitution}</h1>
                <h1>Email: {workflowEmail}</h1>
            </div>
            {workflows.map((workflow: any) => (
                <div key={workflow.id} style={{ textAlign: 'start', border: '1px solid grey', borderRadius: 5, margin: 5, padding: 5 }}>
                    <div>
                        <Typography variant="h6">Workflow Name: {workflow.name}</Typography>
                        <Typography variant="h6">Workflow State: {workflow.state}</Typography>
                        <Typography variant="h6">Workflow Submitted at: {workflow.submitted || Date.now().toString()}</Typography>
                        <WorkflowStepper workflow={transformGQLToWorkflow(workflow).nodes} id={workflow.id} />
                    </div>
                    
                </div>
            ))}
        </>
    )
}
