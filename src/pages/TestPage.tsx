// This page is used solely for testing different features/screens. 

import React, { useEffect, useState } from 'react'

import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import { AccessTime, Publish, NotInterested, Check }  from '@mui/icons-material';

import JobFeedbackModal           from '../components/JobFeedbackModal';


export default function Test() {

    return (
    
        <>

            <div style={{color: 'red'}}>NOTE: THIS PAGE IS USED SOLELY FOR TESTING PURPOSES!</div><br/><br/>

            <TechnicianView />

        </>

    )
}

export function TechnicianView() {

    const [workflowName, setWorkflowName] = useState('');
    const [workflowState, setWorkflowState] = useState('');
    const [jobName, setJobName] = useState('');
    const [jobState, setJobState] = useState('');
    const [jobTime, setJobTime] = useState('');
    const [workflowUsername, setWorkflowUsername] = useState('');
    const [workflowInstitution, setWorkflowInstitution] = useState('');
    const [workflowEmail, setWorkflowEmail] = useState('');
    const [workflows, setWorklows] = useState([]); // ▶ URLSearchParams {}

    const [modalOpen, setModalOpen] = useState(false);
    const [submittedWorkflows, setSubmittedWorkflows] = useState<any>([]);

    const acceptWorkflow = (workflowId: string) => {
        let updateWorkflowState = {
            workflowId: workflowId,
            state: 'APPROVED'
        }
    }

    const handleOpenModal = () => {
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };

    const jobStatus = () => {
        const submitText = "The job was submitted to the DAMP lab and is awaiting review.";
        const createText = "The job is currently being created.";
        const acceptText = "The job was accepted by the DAMP Lab. The client will be asked to sign and return the SOW.";
        const rejectText=  "The job was rejected by the DAMP Lab. The client will be asked to resubmit the job with changes.";
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
    const jobStatusIcon = jobStatus()[1];
    const jobStatusText = jobStatus()[2];

    const workflowCard = (
        workflows.map((workflow: any, index: number) => {
            return (
                <Card key={index} sx={{m:1, boxShadow: 2}}>
                    <CardContent>
                        <Box sx={{display: 'flex', justifyContent: 'space-between'}}>
                            <Typography sx={{ fontSize: 15 }} color="text.secondary" align="left">{workflowName}</Typography>
                            <Typography sx={{ fontSize: 13 }} color="text.secondary" align="right">{workflow.id}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: 13 }} color="text.secondary" align="left">{workflow.state.replace('_', ' ')}</Typography>
                    </CardContent>
                </Card>
            )
        })
    );

    return (
        <div>
            <Typography variant="h4" sx={{ mt: 2 }}>Job Tracking</Typography>
            <div style={{ textAlign: 'left', padding: '5vh' }}>
                <Typography variant="h5" fontWeight="bold">
                    {jobName}
                </Typography>
                <Box sx={{ p: 3, my: 2, bgcolor: jobStatusColor as any, borderRadius: '8px' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', ml: -0.5 }}>
                        <Typography>
                            {jobStatusIcon}
                        </Typography>
                        <Typography style={{textAlign: 'right'}}>
                            <b>Job ID:</b> {1}
                        </Typography>
                    </Box>
                    <Typography>
                        <b>{jobState}</b>
                    </Typography>
                    <Typography sx={{ fontSize: 13, mt: 1 }}>
                        <i>{jobStatusText}</i>
                    </Typography>
                </Box>
                <Box sx={{ mx: 3, fontSize: 13 }}>
                    <p><b>Time:</b> {jobTime.slice(0, 16).replace('T', ' ')}</p>
                    <p><b>User:</b> {workflowUsername} ({workflowEmail})</p>
                    <p><b>Organization:</b> {workflowInstitution}</p>
                </Box>
                <Box>
                    <Box sx={{ flexDirection: 'column', pt: 1 }}>
                        {workflowCard}
                    </Box>
                </Box>
                <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: 30 }}>
                    {
                        <Button onClick={handleOpenModal} color={"error"} variant="contained">Review Job</Button>
                    }
                </Box>
                <JobFeedbackModal open={modalOpen} onClose={handleCloseModal} id={1}/>
            </div>
        </div>
    )
}
