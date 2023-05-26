import { useQuery } from '@apollo/client';
import React, { useState } from 'react'
import { useParams } from 'react-router-dom';
import { GET_JOB_BY_ID } from '../gql/queries';
import { Box, Button, Card, CardContent, InputLabel, Typography } from '@mui/material';
import WorkflowStepper from '../components/WorkflowStepper';
import WorkflowSteps from '../components/WorkflowSteps';

export default function Tracking() {

    const { id } = useParams();
    const [workflowName, setWorkflowName] = useState('');
    const [workflowState, setWorkflowState] = useState('');
    const [jobState, setJobState] = useState('');
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
            setJobState(data.jobById.state);
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

    const jobStatusColor = () => {
        switch (jobState) {
            case 'CREATING':
                return 'rgba(256, 256, 0, 0.5)'
            case 'ACCEPTED':
                return 'rgb(0, 256, 0, 0.5)';
            case 'REJECTED':
                return 'rgb(256, 0, 0, 0.5)';
            default:
                return 'rgb(0, 0, 0, 0)';
        }
    }

    const jobCard = (
        <Card>
          <CardContent>
          <Typography sx={{ fontSize:12 }} color="text.secondary" align="left">{workflowName}</Typography> 
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', p: 1, m: 1 }}>
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
            <Typography variant="h3" sx={{mb: 3}}>Job Tracking</Typography>

            <Box sx={{display:'flex', justifyContent: 'space-between'}}>
                <Typography variant="h4" align='left'>
                  {workflowName}
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <Typography sx={{ fontSize:12 }} align="right">
                      {workflowUsername} ({workflowEmail})
                    </Typography>
                    <Typography sx={{ fontSize:12 }} display={{ marginBottom: 20 }} align="right">
                      {workflowInstitution}
                    </Typography>
                </Box>
            </Box>

            <Box sx={{display: 'flex', justifyContent: 'space-between', py: 3, my: 2, bgcolor:jobStatusColor(), borderRadius: '8px'}}>
                <Typography sx={{ fontSize: 15}} display = {{marginLeft: 20}} align="left">
                  {jobState}
                </Typography>
                <Typography sx={{ fontSize: 15 }} display = {{marginRight: 20}} align="right">
                  {id}
                </Typography>
            </Box>

            <Box>
                <Typography sx = {{ fontsize: 18}}> 
                Workflows
                </Typography>
                <Box sx={{ flexDirection: 'column', p: 1, m: 1 }}>
                    {jobCard}
                </Box>
            </Box>      
        </div>
    )
}
