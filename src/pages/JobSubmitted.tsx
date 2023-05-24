import React, { useState } from 'react'
import { useLocation } from 'react-router-dom';
import QRCode from "react-qr-code";

export default function JobSubmitted() {

  // get job id from navigation state
  const location = useLocation();
  const [jobId, setJobId] = useState(location.state.id);
  const [value, setValue] = useState(`https://www.google.com/`);

  return (
    <div>
      <h1>Job Submitted</h1>
      <p>Job ID: {jobId}</p>
      <div style={{ height: "auto", margin: "0 auto", maxWidth: 64, width: "100%" }}>
        <QRCode
          size={256}
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          value={value}
          viewBox={`0 0 256 256`}
        />
      </div>
    </div>
  )
}
