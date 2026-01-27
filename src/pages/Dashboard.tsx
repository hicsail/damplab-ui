import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useApolloClient, useQuery } from '@apollo/client';
import SubmittedJobsList, { type JobListItem } from '../components/SubmittedJobsList';
import { GET_WORKFLOWS_BY_STATE, GET_JOB_BY_WORKFLOW_ID } from '../gql/queries';

export default function Dashboard() {
  const navigate = useNavigate();
  const apolloClient = useApolloClient();
  const [queuedWorkflows, setQueuedWorkflows] = useState<{ id: string }[]>([]);
  const [inProgressWorkflows, setInProgressWorkflows] = useState<{ id: string }[]>([]);
  const [completedWorkflows, setCompletedWorkflows] = useState<{ id: string }[]>([]);
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  useQuery(GET_WORKFLOWS_BY_STATE, {
    variables: { state: 'QUEUED' },
    onCompleted: (data: { getWorkflowByState: { id: string }[] }) => {
      setQueuedWorkflows(data?.getWorkflowByState ?? []);
    },
    onError: (err: Error) => {
      console.error('Dashboard: error loading QUEUED workflows', err);
    },
  });
  useQuery(GET_WORKFLOWS_BY_STATE, {
    variables: { state: 'IN_PROGRESS' },
    onCompleted: (data: { getWorkflowByState: { id: string }[] }) => {
      setInProgressWorkflows(data?.getWorkflowByState ?? []);
    },
    onError: (err: Error) => {
      console.error('Dashboard: error loading IN_PROGRESS workflows', err);
    },
  });
  useQuery(GET_WORKFLOWS_BY_STATE, {
    variables: { state: 'COMPLETE' },
    onCompleted: (data: { getWorkflowByState: { id: string }[] }) => {
      setCompletedWorkflows(data?.getWorkflowByState ?? []);
    },
    onError: (err: Error) => {
      console.error('Dashboard: error loading COMPLETE workflows', err);
    },
  });

  const allWorkflows = useMemo(
    () => [...queuedWorkflows, ...inProgressWorkflows, ...completedWorkflows],
    [queuedWorkflows, inProgressWorkflows, completedWorkflows]
  );

  useEffect(() => {
    let cancelled = false;
    setJobsLoading(true);

    const fetchJobs = async () => {
      if (allWorkflows.length === 0) {
        setJobs([]);
        setJobsLoading(false);
        return;
      }
      const results = await Promise.all(
        allWorkflows.map(async (wf) => {
          try {
            const { data } = await apolloClient.query({
              query: GET_JOB_BY_WORKFLOW_ID,
              variables: { id: wf.id },
            });
            return data?.jobByWorkflowId ?? null;
          } catch (e) {
            console.error('Dashboard: error loading job for workflow', wf.id, e);
            return null;
          }
        })
      );
      if (cancelled) return;
      const raw = results.filter(Boolean) as Array<{
        id: string;
        name: string;
        username?: string;
        institute?: string;
        email?: string;
        submitted?: string;
        state?: string;
        sow?: { id: string; sowNumber: string; status: string } | null;
      }>;
      const byId = new Map<string, JobListItem>();
      for (const j of raw) {
        if (!byId.has(j.id)) {
          byId.set(j.id, {
            id: j.id,
            name: j.name,
            state: j.state ?? '',
            submitted: j.submitted ?? '',
            sow: j.sow ?? null,
            username: j.username,
            institute: j.institute,
            email: j.email,
          });
        }
      }
      setJobs(Array.from(byId.values()));
      setJobsLoading(false);
    };

    fetchJobs();
    return () => {
      cancelled = true;
    };
  }, [allWorkflows, apolloClient]);

  return (
    <SubmittedJobsList
      jobs={jobs}
      isStaff
      getJobLink={(j) => `/technician_view/${j.id}`}
      loading={jobsLoading}
      emptyMessage="No submitted jobs yet."
      title="Submitted Jobs"
      subtitle="All submitted jobs. Click a job to open the technician view."
      onBack={() => navigate('/')}
      backLabel="Back to Home"
      showHasSowFilter
    />
  );
}
