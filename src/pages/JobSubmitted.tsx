import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@apollo/client';
import { GET_JOB_BY_ID } from '../gql/queries';
import { Workflow } from '../gql/graphql';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { Box, Alert } from '@mui/material';
import JobPDFDocument from '../components/JobPDFDocument';

export default function JobSubmitted() {
  const { jobId } = useParams<{ jobId: string }>();
  const [value, setValue] = useState(`https://damplab.sail.codes/client_view/${jobId}`);

  const [workflowName, setWorkflowName] = useState('');
  const [workflowState, setWorkflowState] = useState('');
  const [jobName, setJobName] = useState('');
  const [jobState, setJobState] = useState('');
  const [jobTime, setJobTime] = useState('');
  const [jobUsername, setJobUsername] = useState('');
  const [jobInstitution, setJobInstitution] = useState('');
  const [jobEmail, setJobEmail] = useState('');
  const [jobNotes, setJobNotes] = useState('');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);

  const { loading, error, data } = useQuery(GET_JOB_BY_ID, { //should later check logged in user token to access
    variables: { id: jobId },
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
      setWorkflows(data.jobById.workflows);
    },
    onError: (error: any) => {
      console.log(error.networkError?.result?.errors);
    }
  });

  useEffect(() => {
    console.log(workflows);
  }, [workflows]);

  if (loading) return <p>Loading...</p>;
  if (error) {
    console.log("GraphQL error:", error);
    return <Alert severity="error">Invalid Job ID.</Alert>;
  }
  if (!data || !data.jobById) return <p>No job found.</p>;

  return (
    <Box>
      <h1>Job Submitted</h1>
      <p>Job ID: {jobId}</p>
      <p>Job submitted at: {jobTime}</p>
      <p>
        <PDFDownloadLink
          document={
            <JobPDFDocument
              jobId={jobId}
              jobName={jobName}
              jobUsername={jobUsername}
              jobEmail={jobEmail}
              jobInstitution={jobInstitution}
              jobNotes={jobNotes}
              jobTime={jobTime}
              workflows={workflows}
            />
          }
          fileName={`DAMP-Order-${jobId}.pdf`}
        >
          {({ blob, url, loading, error }) => (loading ? 'Loading document...' : 'Download a PDF summary for your records!')}
        </PDFDownloadLink>
      </p>
      <br />
      <PDFViewer width="75%" height="1000px">
        <JobPDFDocument
          jobId={jobId}
          jobName={jobName}
          jobUsername={jobUsername}
          jobEmail={jobEmail}
          jobInstitution={jobInstitution}
          jobNotes={jobNotes}
          jobTime={jobTime}
          workflows={workflows}
        />
      </PDFViewer>
    </Box>
  );
}