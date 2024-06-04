import React, { useState }    from 'react'
import        { useLocation } from 'react-router-dom';
// import QRCode from "react-qr-code";


export default function JobSubmitted() {

  // get job id from navigation state
  const location = useLocation();

  const [jobId, setJobId] = useState(location.state.id);
  const [value, setValue] = useState(`https://damplab.sail.codes/client_view/${jobId}`);

  return (

    <div>

      <h1>
        Job Submitted
      </h1>

      <p>
        Job ID: {jobId}
      </p>

      {/* Functional but disabled for now... */}
      {/* <div style={{ height: "auto", margin: "0 auto", maxWidth: 256, width: "100%" }}>
        <QRCode
          size={512}
          style={{ height: "auto", maxWidth: "100%", width: "100%" }}
          value={value}
          viewBox={`0 0 256 256`}
        />
      </div> */}
      
    </div>

  )
}
