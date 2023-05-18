import React, { useState } from 'react'
import { useLocation } from 'react-router-dom';

export default function JobSubmitted() {

  // get job id from navigation state
  const location = useLocation();
  const [jobId, setJobId] = useState(location.state.id);

  return (
    <div>
      <h1>Job Submitted</h1>
      <p>Job ID: {jobId}</p>
    </div>
  )
}
