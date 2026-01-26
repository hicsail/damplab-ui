import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router';
import { useQuery, useMutation } from '@apollo/client';
import { PDFDownloadLink } from '@react-pdf/renderer';

import { Box, Button, Card, CardContent, Typography, Alert, Chip } from '@mui/material';
import { AccessTime, Publish, NotInterested, Check, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import PictureAsPdfIcon                               from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon                                from '@mui/icons-material/Description';

import { GET_JOB_BY_ID, }         from '../gql/queries';
import { UPDATE_WORKFLOW_STATE }  from '../gql/mutations';
import { transformGQLToWorkflow } from '../controllers/GraphHelpers';

import WorkflowStepper            from '../components/WorkflowStepper';
import JobFeedbackModal           from '../components/JobFeedbackModal';
import JobPDFDocument             from '../components/JobPDFDocument';
import SOWGeneratorModal          from '../components/SOWGeneratorModal';
import { SOWViewer }              from '../components/SOWViewer';
import { CommentsSection }        from '../components/CommentsSection';


export default function TechnicianView() {

    const { id }                              = useParams();

    const [workflowName, setWorkflowName]     = useState('');
    const [workflowState, setWorkflowState]   = useState('');
    const [jobName, setJobName]               = useState('');
    const [jobState, setJobState]             = useState('');
    const [jobTime, setJobTime]               = useState('');
    const [jobUsername, setJobUsername]       = useState('');
    const [jobInstitution, setJobInstitution] = useState('');
    const [jobEmail, setJobEmail]             = useState('');
    const [jobNotes, setJobNotes] = useState('');
    const [workflows, setWorklows]            = useState([]);  // ▶ URLSearchParams {}
    const [sowData, setSowData] = useState<any>(null);

    const { loading, error, data } = useQuery(GET_JOB_BY_ID, {
        variables: { id: id },
        onCompleted: (data) => {
            setWorkflowName(data.jobById.workflows[0].name);
            setWorkflowState(data.jobById.workflows[0].state);
            setJobName(data.jobById.name);
            setJobState(data.jobById.state);
            setJobTime(data.jobById.submitted);
            setJobUsername(data.jobById.username);
            setJobInstitution(data.jobById.institute);
            setJobEmail(data.jobById.email);
            setJobNotes(data.jobById.notes);
            setWorklows(data.jobById.workflows);
            setJobData(data.jobById); // Store complete job data for SOW generation
            setSowData(data.jobById.sow); // Store SOW data if it exists
        },
        onError: (error: any) => {
            // Error handled by error state
        }
    });

    const [acceptWorkflowMutation] = useMutation(UPDATE_WORKFLOW_STATE, {
        onCompleted: (data) => {
            // Workflow accepted successfully
        },
        onError: (error: any) => {
            // Error handled by error state
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
    const [sowModalOpen, setSowModalOpen] = useState(false);
    const [jobData, setJobData] = useState<any>(null);

    const handleOpenModal = () => {
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };

    const handleOpenSOWModal = () => {
        setSowModalOpen(true);
    };

    const handleCloseSOWModal = () => {
        setSowModalOpen(false);
    };



    const [submittedWorkflows, setSubmittedWorkflows] = useState<any>([]);

    // useEffect(() => {
    //     console.log(fetch('https://plasmapper.ca/api/features', {
    //         body: '{"sequence":"gacggatcgggagatctcccgatcccctatggtgcactctcagtacaatctgctctgatgccgcatagttaagccagtatctgctccctgcttgtgtgttggaggtcgctgagtagtgcgcgagcaaaatttaagctacaacaaggcaaggcttgaccgacaattgcatgaagaatctgcttagggttaggcgttttgcgctgcttcgcgatgtacgggccagatatacgcgttgacattgattattgactagttattaatagtaatcaattacggggtcattagttcatagcccatatatggagttccgcgttacataacttacggtaaatggcccgcctggctgaccgcccaacgacccccgcccattgacgtcaataatgacgtatgttcccatagtaacgccaatagggactttccattgacgtcaatgggtggagtatttacggtaaactgcccacttggcagtacatcaagtgtatcatatgccaagtacgccccctattgacgtcaatgacggtaaatggcccgcctggcattatgcccagtacatgaccttatgggactttcctacttggcagtacatctacgtattagtcatcgctattaccatggtgatgcggttttggcagtacatcaatgggcgtggatagcggtttgactcacggggatttccaagtctccaccccattgacgtcaatgggagtttgttttggcaccaaaatcaacgggactttccaaaatgtcgtaacaactccgccccattgacgcaaatgggcggtaggcgtgtacggtgggaggtctatataagcagagctctctggctaactagagaacccactgcttactggcttatcgaaattaatacgactcactatagggagacccaagctggctagcgtttaaacttaagcttggtaccgagctcggatccactagtccagtgtggtggaattctgcagatatccagcacagtggcggccgctcgagtctagagggcccgtttaaacccgctgatcagcctcgactgtgccttctagttgccagccatctgttgtttgcccctcccccgtgccttccttgaccctggaaggtgccactcccactgtcctttcctaataaaatgaggaaattgcatcgcattgtctgagtaggtgtcattctattctggggggtggggtggggcaggacagcaagggggaggattgggaagacaatagcaggcatgctggggatgcggtgggctctatggcttctgaggcggaaagaaccagctggggctctagggggtatccccacgcgccctgtagcggcgcattaagcgcggcgggtgtggtggttacgcgcagcgtgaccgctacacttgccagcgccctagcgcccgctcctttcgctttcttcccttcctttctcgccacgttcgccggctttccccgtcaagctctaaatcgggggctccctttagggttccgatttagtgctttacggcacctcgaccccaaaaaacttgattagggtgatggttcacgtagtgggccatcgccctgatagacggtttttcgccctttgacgttggagtccacgttctttaatagtggactcttgttccaaactggaacaacactcaaccctatctcggtctattcttttgatttataagggattttgccgatttcggcctattggttaaaaaatgagctgatttaacaaaaatttaacgcgaattaattctgtggaatgtgtgtcagttagggtgtggaaagtccccaggctccccagcaggcagaagtatgcaaagcatgcatctcaattagtcagcaaccaggtgtggaaagtccccaggctccccagcaggcagaagtatgcaaagcatgcatctcaattagtcagcaaccatagtcccgcccctaactccgcccatcccgcccctaactccgcccagttccgcccattctccgccccatggctgactaattttttttatttatgcagaggccgaggccgcctctgcctctgagctattccagaagtagtgaggaggcttttttggaggcctaggcttttgcaaaaagctcccgggagcttgtatatccattttcggatctgatcaagagacaggatgaggatcgtttcgcatgattgaacaagatggattgcacgcaggttctccggccgcttgggtggagaggctattcggctatgactgggcacaacagacaatcggctgctctgatgccgccgtgttccggctgtcagcgcaggggcgcccggttctttttgtcaagaccgacctgtccggtgccctgaatgaactgcaggacgaggcagcgcggctatcgtggctggccacgacgggcgttccttgcgcagctgtgctcgacgttgtcactgaagcgggaagggactggctgctattgggcgaagtgccggggcaggatctcctgtcatctcaccttgctcctgccgagaaagtatccatcatggctgatgcaatgcggcggctgcatacgcttgatccggctacctgcccattcgaccaccaagcgaaacatcgcatcgagcgagcacgtactcggatggaagccggtcttgtcgatcaggatgatctggacgaagagcatcaggggctcgcgccagccgaactgttcgccaggctcaaggcgcgcatgcccgacggcgaggatctcgtcgtgacccatggcgatgcctgcttgccgaatatcatggtggaaaatggccgcttttctggattcatcgactgtggccggctgggtgtggcggaccgctatcaggacatagcgttggctacccgtgatattgctgaagagcttggcggcgaatgggctgaccgcttcctcgtgctttacggtatcgccgctcccgattcgcagcgcatcgccttctatcgccttcttgacgagttcttctgagcgggactctggggttcgaaatgaccgaccaagcgacgcccaacctgccatcacgagatttcgattccaccgccgccttctatgaaaggttgggcttcggaatcgttttccgggacgccggctggatgatcctccagcgcggggatctcatgctggagttcttcgcccaccccaacttgtttattgcagcttataatggttacaaataaagcaatagcatcacaaatttcacaaataaagcatttttttcactgcattctagttgtggtttgtccaaactcatcaatgtatcttatcatgtctgtataccgtcgacctctagctagagcttggcgtaatcatggtcatagctgtttcctgtgtgaaattgttatccgctcacaattccacacaacatacgagccggaagcataaagtgtaaagcctggggtgcctaatgagtgagctaactcacattaattgcgttgcgctcactgcccgctttccagtcgggaaacctgtcgtgccagctgcattaatgaatcggccaacgcgcggggagaggcggtttgcgtattgggcgctcttccgcttcctcgctcactgactcgctgcgctcggtcgttcggctgcggcgagcggtatcagctcactcaaaggcggtaatacggttatccacagaatcaggggataacgcaggaaagaacatgtgagcaaaaggccagcaaaaggccaggaaccgtaaaaaggccgcgttgctggcgtttttccataggctccgcccccctgacgagcatcacaaaaatcgacgctcaagtcagaggtggcgaaacccgacaggactataaagataccaggcgtttccccctggaagctccctcgtgcgctctcctgttccgaccctgccgcttaccggatacctgtccgcctttctcccttcgggaagcgtggcgctttctcatagctcacgctgtaggtatctcagttcggtgtaggtcgttcgctccaagctgggctgtgtgcacgaaccccccgttcagcccgaccgctgcgccttatccggtaactatcgtcttgagtccaacccggtaagacacgacttatcgccactggcagcagccactggtaacaggattagcagagcgaggtatgtaggcggtgctacagagttcttgaagtggtggcctaactacggctacactagaagaacagtatttggtatctgcgctctgctgaagccagttaccttcggaaaaagagttggtagctcttgatccggcaaacaaaccaccgctggtagcggtttttttgtttgcaagcagcagattacgcgcagaaaaaaaggatctcaagaagatcctttgatcttttctacggggtctgacgctcagtggaacgaaaactcacgttaagggattttggtcatgagattatcaaaaaggatcttcacctagatccttttaaattaaaaatgaagttttaaatcaatctaaagtatatatgagtaaacttggtctgacagttaccaatgcttaatcagtgaggcacctatctcagcgatctgtctatttcgttcatccatagttgcctgactccccgtcgtgtagataactacgatacgggagggcttaccatctggccccagtgctgcaatgataccgcgagacccacgctcaccggctccagatttatcagcaataaaccagccagccggaagggccgagcgcagaagtggtcctgcaactttatccgcctccatccagtctattaattgttgccgggaagctagagtaagtagttcgccagttaatagtttgcgcaacgttgttgccattgctacaggcatcgtggtgtcacgctcgtcgtttggtatggcttcattcagctccggttcccaacgatcaaggcgagttacatgatcccccatgttgtgcaaaaaagcggttagctccttcggtcctccgatcgttgtcagaagtaagttggccgcagtgttatcactcatggttatggcagcactgcataattctcttactgtcatgccatccgtaagatgcttttctgtgactggtgagtactcaaccaagtcattctgagaatagtgtatgcggcgaccgagttgctcttgcccggcgtcaatacgggataataccgcgccacatagcagaactttaaaagtgctcatcattggaaaacgttcttcggggcgaaaactctcaaggatcttaccgctgttgagatccagttcgatgtaacccactcgtgcacccaactgatcttcagcatcttttactttcaccagcgtttctgggtgagcaaaaacaggaaggcaaaatgccgcaaaaaagggaataagggcgacacggaaatgttgaatactcatactcttcctttttcaatattattgaagcatttatcagggttattgtctcatgagcggatacatatttgaatgtatttagaaaaataaacaaataggggttccgcgcacatttccccgaaaagtgccacctgacgtc"}',
    //         headers: {
    //             Accept: 'application/json, text/plain, */*',
    //             'Origin': 'https://plasmapper.wishartlab.com',
    //             'Referer': 'https://plasmapper.wishartlab.com/',
    //             'Content-Type': 'application/json'
    //         },
    //         method: "POST"
    //     }))
    // })

    useEffect(() => {
        if (workflows.length > 0) {
            workflows.map((workflow: any) => {
                // add workflow to submitted workflows state
                setSubmittedWorkflows([...submittedWorkflows, transformGQLToWorkflow(workflow)]);
            });
        }
    }, [workflows]);


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

    // const workflowCard = (
    //     <Card>
    //         <CardContent>
    //             <Typography sx={{ fontSize: 12 }} color="text.secondary" align="left">{workflowName}</Typography>
    //             <Typography sx={{ fontSize: 12 }} color="text.secondary" align="left">{workflowState}</Typography>
    //             <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', p: 1, m: 1 }}>
    //                 {
    //                     workflows.map((workflow: any) => {
    //                         return (
    //                             <WorkflowStepper workflow={transformGQLToWorkflow(workflow).nodes} key={workflow.id} />
    //                         )
    //                     })
    //                 }
    //             </Box>
    //         </CardContent>
    //     </Card>
    // );

    const workflowCard = (
        workflows.map((workflow: any, index: number) => {
            return (
                <Card key={workflow.id || `workflow-${index}`} sx={{m:1, boxShadow: 2}}>
                    <CardContent>
                        <Box sx={{display: 'flex', justifyContent: 'space-between'}}>
                            <Typography sx={{ fontSize: 15 }} color="text.secondary" align="left">{workflowName}</Typography>
                            <Typography sx={{ fontSize: 13 }} color="text.secondary" align="right">{workflow.id}</Typography>
                        </Box>
                        <Typography sx={{ fontSize: 13 }} color="text.secondary" align="left">{workflow.state.replace('_', ' ')}</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', p: 1, m: 1 }}>
                            <WorkflowStepper workflow={transformGQLToWorkflow(workflow).nodes} />
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
                        <strong>Statement of Work generated.</strong> This job has an SOW. You can view, edit, or regenerate it below.
                    </Alert>
                )}
                <Typography variant="h5" fontWeight="bold">
                    {jobName}
                    {sowData && (
                        <Chip label="SOW generated" color="success" size="small" sx={{ ml: 1.5, fontWeight: 600 }} />
                    )}
                    &nbsp;&nbsp;
                    <Button color='primary' sx={{alignContent: 'right', mr: 1}}>
                        <PictureAsPdfIcon/>&nbsp;
                        <PDFDownloadLink
                            document={
                                <JobPDFDocument
                                    jobId={id}
                                    jobName={jobName}
                                    jobUsername={jobUsername}
                                    jobEmail={jobEmail}
                                    jobInstitution={jobInstitution}
                                    jobNotes={jobNotes}
                                    jobTime={jobTime}
                                    workflows={workflows}
                                />
                            }
                            fileName={`DAMP-Order-${id}.pdf`}
                        >
                            {({ blob, url, loading, error }) => (loading ? 'Loading document...' : 'Download Summary')}
                        </PDFDownloadLink>
                    </Button>
                    <Button 
                        color={sowData ? 'primary' : 'secondary'}
                        variant='contained'
                        startIcon={<DescriptionIcon />}
                        onClick={handleOpenSOWModal}
                        disabled={!jobData}
                    >
                        {sowData ? 'View / Edit SOW' : 'Generate SOW'}
                    </Button>
                </Typography>
                <Box sx={{ p: 3, my: 2, bgcolor: jobStatusColor as any, borderRadius: '8px' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', ml: -0.5 }}>
                        <Typography>
                            {jobStatusIcon}
                        </Typography>
                        <Typography style={{textAlign: 'right'}}>
                            <b>Job ID:</b> {id}
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
                    <p><b>User:</b> {jobUsername} ({jobEmail})</p>
                    <p><b>Organization:</b> {jobInstitution}</p>
                </Box>
                <Box>
                    <Box sx={{ flexDirection: 'column', pt: 1 }}>
                        {workflowCard}
                    </Box>
                </Box>
                {/* SOW Status Indicator */}
                {sowData && (
                    <SOWViewer 
                        jobId={id || ''} 
                        sowData={sowData}
                    />
                )}

                <Box style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', margin: 30 }}>
                    {
                        jobState === 'SUBMITTED' 
                        ? <Button onClick={handleOpenModal} color={"error"} variant="contained">Review Job</Button>
                        : <p></p>
                    }
                </Box>

                {/* Comments Section */}
                <CommentsSection 
                    jobId={id || ''}
                    currentUser={{
                        email: 'technician@bu.edu', // TODO: Get from auth context
                        isStaff: true
                    }}
                />

                <JobFeedbackModal open={modalOpen} onClose={handleCloseModal} id={id}/>
                <SOWGeneratorModal 
                    open={sowModalOpen} 
                    onClose={handleCloseSOWModal} 
                    jobData={jobData}
                />
            </div>
        </div>
    )
}
