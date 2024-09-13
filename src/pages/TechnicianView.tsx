import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@apollo/client';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { Box, Button, Card, CardContent, Typography } from '@mui/material';
import { AccessTime, Publish, NotInterested, Check } from '@mui/icons-material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import FileDownloadIcon from '@mui/icons-material/FileDownload'; // Import the download icon
import { saveAs } from 'file-saver'; // Import file-saver to save the file (you may need to install this package)

import { GET_JOB_BY_ID } from '../gql/queries';
import { UPDATE_WORKFLOW_STATE, UPDATE_JOB } from '../gql/mutations';
import { transformGQLToWorkflow } from '../controllers/GraphHelpers';

import WorkflowStepper from '../components/WorkflowStepper';
import JobFeedbackModal from '../components/JobFeedbackModal';
import JobPDFDocument from '../components/JobPDFDocument';

export default function TechnicianView() {
  const { id } = useParams();

  const [workflowName, setWorkflowName] = useState('');
  const [workflowState, setWorkflowState] = useState('');
  const [jobName, setJobName] = useState('');
  const [jobState, setJobState] = useState('');
  const [jobTime, setJobTime] = useState('');
  const [jobUsername, setJobUsername] = useState('');
  const [jobInstitution, setJobInstitution] = useState('');
  const [jobEmail, setJobEmail] = useState('');
  const [jobNotes, setJobNotes] = useState('');
  const [workflows, setWorklows] = useState([]); // ▶ URLSearchParams {}

  const { loading, error, data } = useQuery(GET_JOB_BY_ID, {
    variables: { id: id },
    onCompleted: (data) => {
      console.log('job successfully loaded: ', data);
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

  const [updateJobMutation] = useMutation(UPDATE_JOB, {
    onCompleted: (data) => {
      console.log('Job organization updated successfully:', data);
      setJobInstitution(data.updateJob.institute);
    },
    onError: (error: any) => {
      console.log('Error updating job organization:', error);
    }
  });

  const updateOrganizationName = () => {
    updateJobMutation({
      variables: {
        id: id,
        updateJobInput: {
          institute: 'New_Org_Name'
        }
      }
    });
  };

  const acceptWorkflow = (workflowId: string) => {
    let updateWorkflowState = {
      workflowId: workflowId,
      state: 'APPROVED'
    };

    acceptWorkflowMutation({
      variables: { updateWorkflowState: updateWorkflowState }
    });
  };

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
    const submitText = 'The job was submitted to the DAMP lab and is awaiting review.';
    const createText = 'The job is currently being created.';
    const acceptText = 'The job was accepted by the DAMP Lab. The client will be asked to sign and return the SOW.';
    const rejectText = 'The job was rejected by the DAMP Lab. The client will be asked to resubmit the job with changes.';
    const defaultText = 'Invalid Case';
    switch (jobState) {
      case 'SUBMITTED':
        return ['rgba(256, 256, 0, 0.5)', <Publish />, submitText];
      case 'CREATING':
        return ['rgba(256, 256, 0, 0.5)', <AccessTime />, createText];
      case 'ACCEPTED':
        return ['rgb(0, 256, 0, 0.5)', <Check />, acceptText];
      case 'REJECTED':
        return ['rgb(256, 0, 0, 0.5)', <NotInterested />, rejectText];
      default:
        return ['rgb(0, 0, 0, 0)', <NotInterested />, defaultText];
    }
  };
  const jobStatusColor = jobStatus()[0];
  const jobStatusIcon = jobStatus()[1];
  const jobStatusText = jobStatus()[2];

  const workflowCard = workflows.map((workflow: any, index: number) => {
    return (
      <Card key={index} sx={{ m: 1, boxShadow: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography sx={{ fontSize: 15 }} color="text.secondary" align="left">
              {workflowName}
            </Typography>
            <Typography sx={{ fontSize: 13 }} color="text.secondary" align="right">
              {workflow.id}
            </Typography>
          </Box>
          <Typography sx={{ fontSize: 13 }} color="text.secondary" align="left">
            {workflow.state.replace('_', ' ')}
          </Typography>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              flexDirection: 'column',
              p: 1,
              m: 1
            }}
          >
            <WorkflowStepper workflow={transformGQLToWorkflow(workflow).nodes} key={workflow.id} />
          </Box>
        </CardContent>
      </Card>
    );
  });

  const downloadFile = async () => {
    if (!jobNotes) {
      console.error('No file ID provided in job notes.');
      return;
    }

    try {
      const response = await fetch(`http://localhost:5200/data/download/${jobNotes}`, {
        method: 'GET',
        headers: {
          Accept: '*/*'
        }
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const blob = await response.blob();
      const filename =
        response.headers.get('Content-Disposition')?.split('filename=')[1] || `${id}.txt`;

      saveAs(blob, filename);
      console.log('File downloaded successfully');
    } catch (error) {
      console.error('Error downloading the file:', error);
    }
  };

  return (
    <div>
      <Typography variant="h4" sx={{ mt: 2 }}>
        Job Tracking
      </Typography>
      <div style={{ textAlign: 'left', padding: '5vh' }}>
        <Typography variant="h5" fontWeight="bold">
          {jobName}&nbsp;&nbsp;
          <Button color="primary" sx={{ alignContent: 'right', ml: 3 }}>
            <PictureAsPdfIcon />
            &nbsp;
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
              {({ blob, url, loading, error }) =>
                loading ? 'Loading document...' : 'Download Summary'
              }
            </PDFDownloadLink>
          </Button>
          <Button
            sx={{ml:3}}
            color="primary"
            onClick={downloadFile}
            startIcon={<FileDownloadIcon />}
          >
            Download Attachment
          </Button>
        </Typography>
        <Box sx={{ p: 3, my: 2, bgcolor: jobStatusColor as any, borderRadius: '8px' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', ml: -0.5 }}>
            <Typography>{jobStatusIcon}</Typography>
            <Typography style={{ textAlign: 'right' }}>
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
          <p>
            <b>Time:</b> {jobTime.slice(0, 16).replace('T', ' ')}
          </p>
          <p>
            <b>User:</b> {jobUsername} ({jobEmail})
          </p>
          <p>
            <b>Organization:</b> {jobInstitution}
          </p>
          <p>
            <b>Notes:</b> {jobNotes}
          </p>
        </Box>
        <Box>
          <Box sx={{ flexDirection: 'column', pt: 1 }}>{workflowCard}</Box>
        </Box>
        <Box
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            margin: 30
          }}
        >
          {jobState === 'SUBMITTED' ? (
            <Button onClick={handleOpenModal} color={'error'} variant="contained">
              Review Job
            </Button>
          ) : (
            <p></p>
          )}
        </Box>
        <JobFeedbackModal open={modalOpen} onClose={handleCloseModal} id={id} workflows={workflows} />
      </div>
    </div>
  );
}