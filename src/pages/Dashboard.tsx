import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from "react-router";
import { useQuery } from '@apollo/client'
import { Box, Button, Typography} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { PDFDownloadLink } from '@react-pdf/renderer';

import { bodyText, StyledContainer } from "../styles/themes";
import { GET_WORKFLOWS_BY_STATE, GET_JOB_BY_WORKFLOW_ID } from "../gql/queries";
import JobPDFDocument from '../components/JobPDFDocument';


export default function Dashboard( {...props} ) {

    const [queuedWorkflows,     setQueuedWorkflows]     = useState([]);
    const [inProgressWorkflows, setInProgressWorkflows] = useState([]);
    const [completedWorkflows,  setCompletedWorkflows]  = useState([]);
    const [jobs,                setJobs]                = useState<any[]>([]);

    const useWorkflowQueries = ($state: string, $setterFunc: Function) => {
        useQuery(GET_WORKFLOWS_BY_STATE, {
            variables: { state: $state },
            onCompleted: (data) => {
                console.log($state, " workflows loaded successfully", data);
                $setterFunc(data.getWorkflowByState);
            },
            onError: (error: any) => {
                console.log(error.networkError?.result?.errors);
                console.log("error when loading ", $state, " workflows", error);
            },
        });
    }
    
    useWorkflowQueries("QUEUED",      setQueuedWorkflows);
    useWorkflowQueries("IN_PROGRESS", setInProgressWorkflows);
    useWorkflowQueries("COMPLETE",    setCompletedWorkflows);

    useEffect(() => {
        const fetchJobIDs = async () => {
            const allWorkflows = [...queuedWorkflows, ...inProgressWorkflows, ...completedWorkflows];
            const jobIDPromises = allWorkflows.map(async (workflow: any) => {
                try {
                    const result = await props.client.query({
                        query: GET_JOB_BY_WORKFLOW_ID,
                        variables: { id: workflow.id },
                    });
                    return result.data.jobByWorkflowId;
                } catch (error) {
                    console.log('error when loading job', error);
                    return null;
                }
            });
            const returnedJobs = await Promise.all(jobIDPromises);
            setJobs(returnedJobs.filter((id) => id !== null));
        };

        fetchJobIDs();
    }, [queuedWorkflows, inProgressWorkflows, completedWorkflows, props.client]);

    return (
        <div>
            <Typography variant="h4" sx={{ mt: 2, mb: 2 }}>Submitted Jobs</Typography>
                {jobs.map((job, index) => (
                    <Button key={index} variant="outlined" title={job.name}  sx={{boxShadow: 2}} 
                    style={{ textAlign: 'left', borderRadius: 5, margin: 20, padding: 5, display: 'flow', justifyContent: 'space-around' }}
                    component={Link} to={`/technician_view/${job.id}`}>
                        <p style={{fontWeight: 'bold', margin: 10}}>{job.name} ({job.id})</p>
                        <div style={{ color: 'black', margin: 10 }}>
                            State    : {job.state}     <br/>
                            Username : {job.username}  <br/>
                            Institute: {job.institute} <br/>
                            Email    : {job.email}     <br/>
                            {/* TODO: Fix these fields... */}
                            {/* Submitted: {new Date(job.submitted).toLocaleString('en-US', { timeZone: 'US/Eastern' })} <br/> */}
                            {/* Notes    : {job.notes}     <br/> */}
                            {/* Services : {job.workflow} */}
                        </div>
                    </Button>
                ))}
        </div>
    )
}
