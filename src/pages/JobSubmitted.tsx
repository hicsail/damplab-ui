import React, { useState }    from 'react'
import        { useLocation } from 'react-router-dom';
import { useQuery }           from '@apollo/client';
import { GET_JOB_BY_ID }      from '../gql/queries';

import { Workflow } from '../gql/graphql';

// import QRCode from "react-qr-code";


export default function JobSubmitted() {

  // get job id from navigation state
  const location = useLocation();

  const [jobId, setJobId] = useState(location.state.id);
  const [value, setValue] = useState(`https://damplab.sail.codes/client_view/${jobId}`);

  const [workflowName, setWorkflowName]               = useState('');
  const [workflowState, setWorkflowState]             = useState('');
  const [jobName, setJobName]                         = useState('');
  const [jobState, setJobState]                       = useState('');
  const [jobTime, setJobTime]                         = useState('');
  const [workflowUsername, setWorkflowUsername]       = useState('');
  const [workflowInstitution, setWorkflowInstitution] = useState('');
  const [workflowEmail, setWorkflowEmail]             = useState('');
  const [workflows, setWorklows]                      = useState<Workflow[]>([]);

  const { loading, error, data } = useQuery(GET_JOB_BY_ID, {
    variables: { id: jobId },
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
        setWorklows(data.jobById.workflows);
    },
    onError: (error: any) => {
        console.log(error.networkError?.result?.errors);
    }
});

  return (

    <div>

      <h1>
        Job Submitted
      </h1>

      <p>
        Job ID: {jobId}
      </p>

      <p>
        {workflows[0].name}
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
