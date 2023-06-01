import { useQuery } from '@apollo/client';
import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom';
import { GET_JOB_BY_ID } from '../gql/queries';
import { Box, Card, CardContent, Typography } from '@mui/material';
import { AccessTime, NotInterested, Check } from '@mui/icons-material';
import WorkflowSteps from '../components/WorkflowSteps';
import { transformGQLToWorkflow } from '../controllers/GraphHelpers';
import TrackingStepper from '../components/TrackingStepper';

export default function Tracking() {

  const { id } = useParams();
  const [workflowName, setWorkflowName] = useState('');
  const [workflowState, setWorkflowState] = useState('');
  const [jobName, setJobName] = useState('');
  const [jobState, setJobState] = useState('');
  const [jobTime, setJobTime] = useState('');
  const [workflowUsername, setWorkflowUsername] = useState('');
  const [workflowInstitution, setWorkflowInstitution] = useState('');
  const [workflowEmail, setWorkflowEmail] = useState('');// ▶ URLSearchParams {}
  const [workflows, setWorklows] = useState([]); // ▶ URLSearchParams {}

  const { loading, error } = useQuery(GET_JOB_BY_ID, {
    variables: { id: id },
    onCompleted: (data) => {
      console.log('job successfully loaded: ', data);
      setWorkflowName(data.jobById.workflows[0].name);
      setWorkflowState(data.jobById.workflows[0].state);
      setJobName(data.jobById.name);
      setJobState(data.jobById.state);
      setJobTime(data.jobById.submitted);
      setWorkflowUsername(data.jobById.username);
      setWorkflowInstitution(data.jobById.institute);
      setWorkflowEmail(data.jobById.email);
      setWorklows(data.jobById.workflows);
    },
    onError: (error: any) => {
      console.log(error.networkError?.result?.errors);
    }
  });

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error :(</p>;

  const jobStatus = () => {
    switch (jobState) {
      case 'CREATING':
        return ['rgba(256, 256, 0, 0.5)', <AccessTime />]
      case 'ACCEPTED':
        return ['rgb(0, 256, 0, 0.5)', <Check />];
      case 'REJECTED':
        return ['rgb(256, 0, 0, 0.5)', <NotInterested />];
      default:
        return ['rgb(0, 0, 0, 0)', <NotInterested />];
    }
  }

  const jobStatusColor = jobStatus()[0];
  const jobStatusIcon = jobStatus()[1];

  const workflowCard = (
    workflows.map((workflow: any) => {
          return (
            <Card>
            <CardContent>
                <Typography sx={{ fontSize: 12 }} color="text.secondary" align="left">{workflow.name}</Typography>
                <Typography sx={{ fontSize: 12 }} color="text.secondary" align="left">{workflow.state}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', p: 1, m: 1 }}>
                        <WorkflowSteps workflow={transformGQLToWorkflow(workflow).nodes} key={workflow.id} />
                </Box>
            </CardContent>
            </Card>
        )
    })
  );

  return (
    <div style={{ textAlign: 'left', padding: '5vh' }}>
      <Typography variant="h3" sx={{ mb: 3 }}>Job Tracking</Typography>
      <Box sx={{ py: 3, px: 3, my: 2, mb: 1, bgcolor: jobStatusColor as any, borderRadius: '8px' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography sx={{ fontSize: 15 }} display={{ marginLeft: '20' }} align="left">
            {jobStatusIcon} <b>{jobState}</b>
          </Typography>
          <Typography sx={{ fontSize: 15 }} display={{ marginRight: '20' }} align="right">
            <b>{id}</b>
          </Typography>
        </Box>
        <Typography sx={{ fontSize: 12 }} display={{ marginTop: '5', marginLeft: '20', marginRight: '20' }} align="left" >
          <i>This is a description of what the current state means.</i>
        </Typography>
      </Box>
      <Box>
        <Typography variant="h4" align='left'>
          {jobName}
        </Typography>
        <Typography sx={{ fontSize: 12 }}>
          <b>Time: </b>{jobTime}
        </Typography>
        <Typography sx={{ fontSize: 12 }}>
          <b>User: </b>{workflowUsername} ({workflowEmail})
        </Typography>
        <Typography sx={{ fontSize: 12 }} display={{ marginBottom: '20' }}>
          <b>Organization: </b>{workflowInstitution}
        </Typography>
      </Box>
      <Box>
        <Box sx={{ flexDirection: 'column', p: 1, m: 1 }}>
          {workflowCard}
        </Box>
      </Box>
    </div>
  )
}
