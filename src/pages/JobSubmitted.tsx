import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router';
import { useQuery } from '@apollo/client';
import { GET_OWN_JOB_BY_ID } from '../gql/queries';
import { Workflow } from '../gql/graphql';
import { PDFDownloadLink, PDFViewer } from '@react-pdf/renderer';
import { Box, Alert } from '@mui/material';
import JobPDFDocument from '../components/JobPDFDocument';

export default function JobSubmitted() {
  const { jobId } = useParams<{ jobId: string }>();
  const [value, setValue] = useState(`https://damplab.sail.codes/client_view/${jobId}`);

  const { loading, error, data } = useQuery(GET_OWN_JOB_BY_ID, { variables: { id: jobId } });

  if (loading) return <p>Loading...</p>;
  if (error) {
    console.log("GraphQL error:", error);
    return <Alert severity="error">Invalid Job ID.</Alert>;
  }
  if (!data || !data.ownJobById) return <p>No job found.</p>;

  return (
    <Box>
      <h1>Job Submitted</h1>
      <p>Job ID: {jobId}</p>
      <p>Job submitted at: {data.ownJobById.submitted}</p>
      <p>
        <PDFDownloadLink
          document={
            <JobPDFDocument
              jobId={jobId}
              jobName={data.ownJobById.name}
              jobUsername={data.ownJobById.username}
              jobEmail={data.ownJobById.email}
              jobInstitution={data.ownJobById.institute}
              jobNotes={data.ownJobById.notes}
              jobTime={data.ownJobById.submitted}
              workflows={data.ownJobById.workflows}
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
          jobName={data.ownJobById.name}
          jobUsername={data.ownJobById.username}
          jobEmail={data.ownJobById.email}
          jobInstitution={data.ownJobById.institute}
          jobNotes={data.ownJobById.notes}
          jobTime={data.ownJobById.submitted}
          workflows={data.ownJobById.workflows}
        />
      </PDFViewer>
    </Box>
  );
}