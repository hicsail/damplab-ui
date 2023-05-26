import { useQuery } from '@apollo/client';
import React, { useState } from 'react'
import { useParams } from 'react-router-dom';
import { GET_JOB_BY_ID } from '../gql/queries';
import { Box, Button, Card, CardContent, CardActions, InputLabel, Typography } from '@mui/material';
import WorkflowStepper from '../components/WorkflowStepper';
import WorkflowSteps from '../components/WorkflowSteps';

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

    const card = (
        <Card>
          <CardContent>
            <Box sx={{display: 'flex', justifyContent: 'space-between'}}>
                <Typography sx={{ fontSize: 12 }} color="text.secondary" align="left">
                  IN REVIEW
                </Typography>
                <Typography sx={{ fontSize: 12 }} color="text.secondary" align="right">
                  {workflowInstitution}
                </Typography>
            </Box>
            <Typography variant="h5" component="div">
              {workflowName}
            </Typography>
            <Typography sx={{ fontSize:12 }} color="text.secondary" display = {{ marginBottom: 50}} >
              {workflowUsername} ({workflowEmail})
            </Typography>
            <Box>
                {
                    workflows.map((workflow: any) => {
                        return (
                            <WorkflowSteps workflow={transformGQLToWorkflow(workflow).nodes} key={workflow.id} />
                        )
                    })
                }
            </Box>
          </CardContent>
        </Card>
      );

    return (
        <div style={{ textAlign: 'left', padding: '5vh' }}>
            <Typography variant="h3">Job Tracking</Typography>
            <Box sx={{ flexDirection: 'column', p: 1, m: 1 }}>
                {card}
            </Box>
        </div>
    )
}
