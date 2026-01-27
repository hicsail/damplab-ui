import React, { useState, useContext } from 'react'
import { useParams } from 'react-router';
import { useQuery } from '@apollo/client';
import { Box, Card, CardContent, Typography, Alert } from '@mui/material';
import { AccessTime, Publish, NotInterested, Check, CheckCircle as CheckCircleIcon } from '@mui/icons-material';

import { GET_OWN_JOB_BY_ID } from '../gql/queries';
import { transformGQLToWorkflow } from '../controllers/GraphHelpers';
import TrackingStepper            from '../components/TrackingStepper';
import { SOWViewer }              from '../components/SOWViewer';
import { CommentsSection }        from '../components/CommentsSection';
import { UserContext }            from '../contexts/UserContext';


export default function Tracking() {

    const { id }                                        = useParams();
    const userContext                                   = useContext(UserContext);

    const [workflowName,        setWorkflowName]        = useState('');
    const [workflowState,       setWorkflowState]       = useState('');
    const [jobName,             setJobName]             = useState('');
    const [jobState,            setJobState]            = useState('');
    const [jobTime,             setJobTime]             = useState('');
    const [workflowUsername,    setWorkflowUsername]    = useState('');
    const [workflowInstitution, setWorkflowInstitution] = useState('');
    const [workflowEmail,       setWorkflowEmail]       = useState('');  // ▶ URLSearchParams {}
    const [workflows,           setWorklows]            = useState([]);  // ▶ URLSearchParams {}
    const [sowData, setSowData] = useState<any>(null);

    const skipQuery = !id || !userContext?.userProps?.isAuthenticated;

    const { data, loading, error } = useQuery(GET_OWN_JOB_BY_ID, {
        variables: { id: id! },
        skip: skipQuery,
        errorPolicy: 'all',
        onCompleted: (data) => {
            const job = data?.ownJobById;
            if (!job?.workflows?.length) return;
            setWorkflowName(       job.workflows[0].name);
            setWorkflowState(      job.workflows[0].state);
            setJobName(            job.name);
            setJobState(           job.state);
            setJobTime(            job.submitted);
            setWorkflowUsername(   job.username);
            setWorkflowInstitution(job.institute);
            setWorkflowEmail(      job.email);
            setWorklows(           job.workflows);
            setSowData(job.sow ?? null);
        },
    });

    if (skipQuery) return <p>Loading...</p>;
    if (loading) return <p>Loading...</p>;
    // When backend returns errors (e.g. not found, forbidden), treat as no access unless we have job data
    if (error && !data?.ownJobById) {
        const msg = error.graphQLErrors?.[0]?.message ?? error.message;
        return (
            <p>
                Job not found. You may not have access to this job.
                {import.meta.env.DEV && msg && (
                    <span style={{ display: 'block', marginTop: 8, fontSize: 12, color: '#666' }}>{msg}</span>
                )}
            </p>
        );
    }
    if (data && !data.ownJobById) return <p>Job not found. You may not have access to this job.</p>;

    const jobStatus = () => {
        const submitText = "Your job has been submitted to the DAMP lab and is awaiting review. Once the review is done, you will see the updated state over here.";
        const createText = "Your job is currently being created. Once the job is created, you will see the updated state over here.";
        const acceptText = "Your job has been reviewed by the DAMP lab and has been accepted. You will receive a SOW to review and sign here once it has been generated.";
        const rejectText = "Your job has been reviewed by the DAMP lab and has been accepted. Please complete any necessary modifications and resubmit your job.";
        const defaultText = "Invalid Case";

        switch (jobState) {
            case 'SUBMITTED':
                return ['rgba(256, 256, 0, 0.5)', <Publish />, submitText]
            case 'CREATING':
                return ['rgba(256, 256, 0, 0.5)', <AccessTime />, createText]
            case 'ACCEPTED':
                return ['rgb(0, 256, 0, 0.5)', <Check />, acceptText];
            case 'REJECTED':
                return ['rgb(256, 0, 0, 0.5)', <NotInterested />, rejectText];
            default:
                return ['rgb(0, 0, 0, 0)', <NotInterested />, defaultText];
        }
    }

    const jobStatusColor = jobStatus()[0];
    const jobStatusIcon  = jobStatus()[1];
    const jobStatusText  = jobStatus()[2];

    const workflowCard = (
        workflows.map((workflow: any, index: number) => {
            return (
                <Card key={workflow.id || `workflow-${index}`} sx={{m:1, boxShadow: 2}}>
                    <CardContent>
                        <Box sx={{display: 'flex', justifyContent: 'space-between'}}>
                            <Typography sx={{ fontSize: 15 }} color="text.secondary" align="left">{workflow.name}</Typography>
                            <Typography sx={{ fontSize: 13 }} color="text.secondary" align="right">{workflow.id}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: 13 }} color="text.secondary" align="left">{workflow.state.replace('_', ' ')}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', p: 1, m: 1 }}>
                            <TrackingStepper workflow={transformGQLToWorkflow(workflow).nodes} />
                        </Box>
                    </CardContent>
                </Card>
            )
        })
    );

    return (
        <div>
            <Typography variant="h4" sx={{ mt: 2 }}>Job Tracking</Typography>
            <div style={{ textAlign: 'left', padding: '5vh' }}>
                {sowData && (
                    <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
                        <strong>Statement of Work available.</strong> A Statement of Work has been generated for this job. View and download it in the section below.
                    </Alert>
                )}
                <Typography variant="h5" fontWeight="bold">
                    {jobName}
                </Typography>
                <Box sx={{ p: 3, my: 2, bgcolor: jobStatusColor as any, borderRadius: '8px' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', ml: -0.5 }}>
                        <Typography>                              {jobStatusIcon} </Typography>
                        <Typography style={{textAlign: 'right'}}> {id}            </Typography>
                    </Box>
                    <Typography>                             <b> {jobState}      </b></Typography>
                    <Typography sx={{ fontSize: 13, mt: 1 }}><i> {jobStatusText} </i></Typography>
                </Box>
                <Box sx={{ mx: 3, fontSize: 13 }}>
                    <p><b>Time:</b>         {jobTime.slice(0, 16).replace('T', ' ')}</p>
                    <p><b>User:</b>         {workflowUsername} ({workflowEmail})</p>
                    <p><b>Organization:</b> {workflowInstitution}</p>
                </Box>
                <Box>
                    <Box sx={{ flexDirection: 'column', pt: 1 }}>
                        {workflowCard}
                    </Box>
                </Box>

                {/* SOW Status Indicator and Viewer */}
                {sowData && (
                    <SOWViewer 
                        jobId={id || ''} 
                        sowData={sowData}
                        currentUser={{ email: workflowEmail, name: workflowUsername, isStaff: false }}
                    />
                )}

                {/* Comments Section */}
                <CommentsSection 
                    jobId={id || ''}
                    currentUser={{
                        email: workflowEmail,
                        isStaff: false
                    }}
                />
            </div>
        </div>
    )
}
