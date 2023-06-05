import React, { useEffect, useState } from 'react'
import { useQuery, useMutation } from '@apollo/client';
import { useParams } from 'react-router-dom';
import { GET_JOB_BY_ID, } from '../gql/queries';
import { UPDATE_WORKFLOW_STATE } from '../gql/mutations';
import { Box, Button, Card, CardContent, Typography, colors } from '@mui/material';
import { AccessTime, NotInterested, Check } from '@mui/icons-material';
import WorkflowStepper from '../components/WorkflowStepper';
import JobFeedbackModal from '../components/JobFeedbackModal';
import { transformGQLToWorkflow } from '../controllers/GraphHelpers';


export default function Submitted() {

    const { id } = useParams();
    const [workflowName, setWorkflowName] = useState('');
    const [workflowState, setWorkflowState] = useState('');
    const [jobName, setJobName] = useState('');
    const [jobState, setJobState] = useState('');
    const [jobTime, setJobTime] = useState('');
    const [workflowUsername, setWorkflowUsername] = useState('');
    const [workflowInstitution, setWorkflowInstitution] = useState('');
    const [workflowEmail, setWorkflowEmail] = useState('');
    const [workflows, setWorkflows] = useState([]); // ▶ URLSearchParams {}

    const { loading, error, data } = useQuery(GET_JOB_BY_ID, {
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
            setWorkflows(data.jobById.workflows);
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

    const [modalOpen, setModalOpen] = useState(false);

    const handleOpenModal = () => {
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };



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

    const jobStatus = () => {
        switch (jobState) {
            case 'CREATING':
                return ['rgba(256, 256, 0, 0.5)', <AccessTime />]
            case 'ACCEPTED':
                return ['rgb(0, 256, 0, 0.5)', <Check />];
            case 'REJECTED':
                return ['rgb(256, 0, 0, 0.5)', <NotInterested />];
            default:
                return ['rgb(256, 256, 0, 0.5)', <NotInterested />];
        }
    }
    const jobStatusColor = jobStatus()[0];
    const jobStatusIcon = jobStatus()[1];

    const workflowCard = (
        <Card>
            <CardContent>
                <Typography sx={{ fontSize: 12 }} color="text.secondary" align="left">{workflowName}</Typography>
                <Typography sx={{ fontSize: 12 }} color="text.secondary" align="left">{workflowState}</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', p: 1, m: 1 }}>
                    {
                        workflows.map((workflow: any) => {
                            return (
                                <WorkflowStepper workflow={transformGQLToWorkflow(workflow).nodes}/>
                            )
                        })
                    }
                </Box>
            </CardContent>
        </Card>
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
            <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                <Button onClick={handleOpenModal} color="error" variant="contained">Review Job</Button>
            </Box>
            <JobFeedbackModal open={modalOpen} onClose={handleCloseModal} id={id}/>

        </div>


    )
}