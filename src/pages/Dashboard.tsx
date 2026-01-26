import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from "react-router";
import { useQuery } from "@apollo/client";
import { Box, Button, Typography} from '@mui/material';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { PDFDownloadLink } from '@react-pdf/renderer';

import { bodyText, StyledContainer } from "../styles/themes";
import { GET_JOBS } from "../gql/queries";
import JobPDFDocument from '../components/JobPDFDocument';


export default function Dashboard( {...props} ) {
    const { loading, error, data } = useQuery(GET_JOBS);
    if (loading) return 'Loading...';
    if (error) return `Error: ${error.message}`;

    return (
        <div>
            <Typography variant="h4" sx={{ mt: 2, mb: 2 }}>Submitted Jobs</Typography>
                {data.jobs.map((job, index) => (
                    <Button key={index} variant="outlined" title={job.name}  sx={{boxShadow: 2}} 
                    style={{ textAlign: 'left', borderRadius: 5, margin: 20, padding: 5, display: 'flow', justifyContent: 'space-around' }}
                    component={Link} to={`/technician_view/${job.id}`}>
                        <p style={{fontWeight: 'bold', margin: 10}}>{job.name} ({job.id})</p>
                        <div style={{ color: 'black', margin: 10 }}>
                            State    : {job.state}     <br/>
                            Username : {job.username}  <br/>
                            Institute: {job.institute} <br/>
                            Email    : {job.email}     <br/>
                            Submitted: {new Date(job.submitted).toLocaleString('en-US', { timeZone: 'US/Eastern' })} <br/>
                            Notes    : {job.notes}     <br/>
                        </div>
                    </Button>
                ))}
        </div>
    )
}
