import React, { useState } from 'react'
import { useQuery, gql } from '@apollo/client';
import { useSearchParams, useParams } from 'react-router-dom';

export default function Submitted() {

    const {name} = useParams();
    console.log(name);

    const [workflowName, setWorkflowName] = useState(name);
    const [workflowState, setWorkflowState] = useState('');
    const [workflowUsername, setWorkflowUsername] = useState('');
    const [workflowInstitution, setWorkflowInstitution] = useState('');
    const [workflowNodes, setWorkflowNodes] = useState([]); // ▶ URLSearchParams {}


    const GET_WORKFLOW = gql`
    query GetWorkflow($name: String!) {
        workflow(name: $name) {
            name
            state
            username
            institution
            nodes {
            id
            label
            }
        }
        }
    `;

    const { loading, error, data } = useQuery(GET_WORKFLOW, {
        variables: { name: name },
        onCompleted: (data) => {
            // handle success
            console.log('success');
            console.log(data);
            setWorkflowName(data.workflow.name);
            setWorkflowState(data.workflow.state);
            setWorkflowUsername(data.workflow.username);
            setWorkflowInstitution(data.workflow.institution);
            setWorkflowNodes(data.workflow.nodes);
        },
        onError: (error: any) => {
            console.log(error.networkError?.result?.errors);
        }
    });

    return (
        <>
            <div>Submitted</div>
            <div>
                <h1>Name : {workflowName}</h1>
                <h1>State : {workflowState}</h1>
                <h1>Submitter: {workflowUsername}</h1>
                <h1>Institution: {workflowInstitution}</h1>
            </div>
            <div className='nodes' style={{display: 'flex'}}>
                {workflowNodes.map((node: any) => (
                    <div key={node.id} style={{ borderStyle: 'solid', margin: 5 }}>
                        <h4>Node ID: {node.id}</h4>
                        <h4>Node Label: {node.label}</h4>
                    </div>
                ))}
            </div>
        </>

    )
}
