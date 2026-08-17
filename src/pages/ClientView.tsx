import React, { useState, useContext, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@apollo/client';
import { Box, Button, Card, CardContent, Typography, Alert, Link as MuiLink, List, ListItem, ListItemText, Divider } from '@mui/material';
import { AccessTime, Publish, NotInterested, Check, CheckCircle as CheckCircleIcon } from '@mui/icons-material';

import { PDFDownloadLink } from '@react-pdf/renderer';
import JobInvoiceDocument from '../components/JobInvoiceDocument';
import { GET_INVOICES_BY_JOB_ID, GET_OWN_JOB_BY_ID, GET_SOW_BY_JOB_ID } from '../gql/queries';
import SowCustomerView            from '../components/sow/SowCustomerView';
import { CommentsSection }        from '../components/CommentsSection';
import ResubmitJobModal          from '../components/ResubmitJobModal';
import { diffJobGraphs, latestVersion, selectedDiffPair } from '../utils/jobGraphDiff';
import JobVersionHistory from '../components/JobVersionHistory';
import { versionWorkflowsAsCards } from '../controllers/jobGraphHydration';
import { AppContext } from '../contexts/App';
import { UserContext }            from '../contexts/UserContext';
import JobWorkflowCards, { getParameterFiles as getJobParameterFiles } from '../components/JobWorkflowCards';
import AccountTreeIcon from '@mui/icons-material/AccountTree';

export default function Tracking() {

    const { id }                                        = useParams();
    const navigate                                      = useNavigate();
    const userContext                                   = useContext(UserContext);

    const [workflowName,        setWorkflowName]        = useState('');
    const [workflowState,       setWorkflowState]       = useState('');
    const [jobName,             setJobName]             = useState('');
    const [jobState,            setJobState]            = useState('');
    const [jobTime,             setJobTime]             = useState('');
    const [workflowUsername,    setWorkflowUsername]    = useState('');
    const [workflowInstitution, setWorkflowInstitution] = useState('');
    const [workflowEmail,       setWorkflowEmail]       = useState('');  // ▶ URLSearchParams {}
    const [workflows,           setWorklows]            = useState([]);  // ▶ URLSearchParams {}
    // The catalogue, for re-attaching parameter definitions to a version snapshot.
    const { services }                                  = useContext(AppContext);
    // Which version of the graph is on screen, and what it is compared against.
    // Viewing starts unset and snaps to latest once versions load, matching
    // the job editor so Compare-to is a live controlled value on first paint.
    const [viewingVersion, setViewingVersion] = useState<number | null>(null);
    const [baselineVersionNumber, setBaselineVersionNumber] = useState<number | null | undefined>(undefined);
    const [sowData, setSowData] = useState<any>(null);
    const [attachments, setAttachments] = useState<any[]>([]);
    const [resubmitOpen, setResubmitOpen] = useState(false);

    const skipQuery = !id || !userContext?.userProps?.isAuthenticated;

    const { data, loading, error, refetch } = useQuery(GET_OWN_JOB_BY_ID, {
        variables: { id: id! },
        skip: skipQuery,
        fetchPolicy: 'network-only',
        errorPolicy: 'all',
    });

    useEffect(() => {
        const job = data?.ownJobById;
        if (!job) return;
        setJobName(job.name ?? '');
        setJobState(job.state ?? '');
        setJobTime(job.submitted ?? '');
        setWorkflowUsername(job.clientDisplayName || job.username || '');
        setWorkflowInstitution(job.institute ?? '');
        setWorkflowEmail(job.email ?? '');
        setWorklows(job.workflows ?? []);
        setSowData(job.sow ?? null);
        setAttachments(job.attachments ?? []);
        const wfs = job.workflows ?? [];
        if (wfs.length > 0) {
            setWorkflowName(wfs[0].name ?? '');
            setWorkflowState(wfs[0].state ?? '');
        }
        const latest = latestVersion((job as any)?.versions ?? []);
        if (latest) setViewingVersion((prev) => prev ?? latest.versionNumber);
    }, [data?.ownJobById]);

    const { data: sowByJobIdResult } = useQuery(GET_SOW_BY_JOB_ID, {
        variables: { jobId: id as string },
        skip: !id,
        fetchPolicy: 'network-only',
    });
    const sowFullData = sowByJobIdResult?.sowByJobId ?? null;

    const { data: invoicesResult } = useQuery(GET_INVOICES_BY_JOB_ID, {
        variables: { jobId: id as string },
        skip: !id,
        fetchPolicy: 'network-only',
    });
    const invoices = invoicesResult?.invoicesByJobId ?? [];

    if (skipQuery) return <p>Loading...</p>;
    if (loading) return <p>Loading...</p>;
    // When backend returns errors (e.g. not found, forbidden), treat as no access unless we have job data
    if (error && !data?.ownJobById) {
        const msg = error.graphQLErrors?.[0]?.message ?? error.message;
        return (
            <p>
                Job not found. You may not have access to this job.
                {import.meta.env.DEV && msg && (
                    <span style={{ display: 'block', marginTop: 8, fontSize: 12, color: '#666' }}>{msg}</span>
                )}
            </p>
        );
    }
    if (data && !data.ownJobById) return <p>Job not found. You may not have access to this job.</p>;

    const jobStatus = () => {
        const submitText = "Your job has been submitted to the DAMP lab and is awaiting review. Once the review is done, you will see the updated state over here.";
        const createText = "Your job is currently being created. Once the job is created, you will see the updated state over here.";
        const acceptText = "Your job has been reviewed by the DAMP lab and has been accepted. You will receive a SOW to review and sign here once it has been generated.";
        const rejectText = "Your job has been reviewed by the DAMP lab and has been accepted. Please complete any necessary modifications and resubmit your job.";
        const changesText = "The DAMP Lab has asked for changes to this job. Open the workflow editor from the comment below, make your edits, then resubmit.";
        const defaultText = "Invalid Case";

        switch (jobState) {
            case 'SUBMITTED':
                return ['rgba(256, 256, 0, 0.5)', <Publish />, submitText]
            case 'CREATING':
                return ['rgba(256, 256, 0, 0.5)', <AccessTime />, createText]
            case 'ACCEPTED':
                return ['rgb(0, 256, 0, 0.5)', <Check />, acceptText];
            case 'REJECTED':
                return ['rgb(256, 0, 0, 0.5)', <NotInterested />, rejectText];
            case 'CHANGES_REQUESTED':
                return ['rgba(255, 152, 0, 0.4)', <Publish />, changesText];
            default:
                return ['rgb(0, 0, 0, 0)', <NotInterested />, defaultText];
        }
    }

    const jobStatusColor = jobStatus()[0];
    const jobStatusIcon  = jobStatus()[1];
    const jobStatusText  = jobStatus()[2];

    // Highlight what changed since the last version written by the other side,
    // unless the reader has picked a different pair from the history.
    const versions = (data?.ownJobById as any)?.versions ?? [];
    const { current, baseline } = selectedDiffPair(versions, viewingVersion, baselineVersionNumber);
    const graphDiff = current && baseline && current !== baseline ? diffJobGraphs(baseline.workflows, current.workflows) : undefined;

    // The editor is offered only while the lab is waiting on the customer.
    const canEdit = jobState === 'CHANGES_REQUESTED';

    // After the server filter, `current` is the latest allowed version when View
    // is defaulted — including a visible Request Changes event. Live
    // `job.workflows` is no longer the customer graph source.
    const latest = latestVersion(versions);
    const cardWorkflows = current
        ? versionWorkflowsAsCards(current.workflows, services ?? [])
        : workflows;

    const workflowCard = (
        <>
            {versions.length > 1 && (
                <Box sx={{ mb: 1.5 }}>
                    <JobVersionHistory
                        versions={versions}
                        viewing={viewingVersion ?? latest?.versionNumber ?? 0}
                        baseline={baseline?.versionNumber ?? null}
                        onViewingChange={(v) => {
                            setViewingVersion(v);
                            setBaselineVersionNumber(undefined);
                        }}
                        onBaselineChange={setBaselineVersionNumber}
                    />
                </Box>
            )}
            <JobWorkflowCards workflows={cardWorkflows} diff={graphDiff} currentVersion={current} baselineVersion={baseline} />
        </>
    );

    const getParameterFiles = () => getJobParameterFiles(cardWorkflows);

    return (
        <div>
            <Typography variant="h4" sx={{ mt: 2 }}>Job Tracking</Typography>
            <div style={{ textAlign: 'left', padding: '5vh' }}>
                {sowData && (
                    <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircleIcon />}>
                        <strong>Statement of Work available.</strong> A Statement of Work has been generated for this job. View and download it in the section below.
                    </Alert>
                )}
                {canEdit && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 1 }}>
                        <Button
                            variant="contained"
                            startIcon={<AccountTreeIcon sx={{ transform: 'rotate(90deg) scaleY(-1)' }} />}
                            onClick={() => navigate(`/job_editor/${id}`)}
                            sx={{ textTransform: 'none' }}
                        >
                            Edit Job
                        </Button>
                    </Box>
                )}
                <Typography variant="h5" fontWeight="bold">
                    {jobName}
                </Typography>
                <Box sx={{ p: 3, my: 2, bgcolor: jobStatusColor as any, borderRadius: '8px' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', ml: -0.5 }}>
                        <Typography>                              {jobStatusIcon} </Typography>
                        <Typography style={{textAlign: 'right'}}> {id}            </Typography>
                    </Box>
                    <Typography>                             <b> {jobState}      </b></Typography>
                    <Typography sx={{ fontSize: 13, mt: 1 }}><i> {jobStatusText} </i></Typography>
                </Box>
                <Box sx={{ mx: 3, fontSize: 13 }}>
                    <p><b>Time:</b>         {jobTime.slice(0, 16).replace('T', ' ')}</p>
                    <p><b>User:</b>         {workflowUsername} ({workflowEmail})</p>
                    <p><b>Organization:</b> {workflowInstitution}</p>
                </Box>
                {attachments.length > 0 && (
                    <Box sx={{ mx: 3, my: 2 }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Attachments</Typography>
                        <List dense>
                            {attachments.map((att, idx) => (
                                <ListItem key={`${att.filename}-${idx}`} sx={{ pl: 0 }}>
                                    <ListItemText
                                        primary={
                                            att.url ? (
                                                <MuiLink href={att.url} target="_blank" rel="noopener noreferrer">
                                                    {att.filename}
                                                </MuiLink>
                                            ) : (
                                                att.filename
                                            )
                                        }
                                        secondary={
                                            att.uploadedAt
                                                ? new Date(att.uploadedAt).toLocaleString()
                                                : undefined
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}
                {getParameterFiles().length > 0 && (
                    <Box sx={{ mx: 3, my: 2 }}>
                        <Typography variant="h6" sx={{ mb: 1 }}>Parameter Files</Typography>
                        <List dense>
                            {getParameterFiles().map((f, idx) => (
                                <ListItem key={`${f.label}-${f.filename}-${idx}`} sx={{ pl: 0 }}>
                                    <ListItemText
                                        primary={
                                            f.url ? (
                                                <MuiLink href={f.url} target="_blank" rel="noopener noreferrer">
                                                    {f.filename}
                                                </MuiLink>
                                            ) : (
                                                f.filename
                                            )
                                        }
                                        secondary={f.label}
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}
                <Box>
                    <Box sx={{ flexDirection: 'column', pt: 1 }}>
                        {workflowCard}
                    </Box>
                </Box>

                {/* SOW Status Indicator and Viewer */}
                {sowData && <SowCustomerView jobId={id || ''} />}

                {/* Invoices */}
                <Box sx={{ mx: 3, my: 2 }}>
                    <Typography variant="h6" sx={{ mb: 1 }}>Invoices</Typography>
                    {!invoices?.length ? (
                        <Typography variant="body2" color="text.secondary">
                            No invoices have been generated for this job yet.
                        </Typography>
                    ) : (
                        <List dense>
                            {invoices.map((inv: any, idx: number) => (
                                <ListItem key={inv.id || idx} sx={{ pl: 0 }}>
                                    <ListItemText
                                        primary={
                                            id && sowFullData ? (
                                                <PDFDownloadLink
                                                    document={
                                                        <JobInvoiceDocument
                                                            jobId={id}
                                                            jobDisplayId={data?.ownJobById?.jobId ?? null}
                                                            jobName={jobName}
                                                            customerCategory={data?.ownJobById?.customerCategory ?? undefined}
                                                            sow={sowFullData}
                                                            invoice={inv}
                                                        />
                                                    }
                                                    fileName={`Invoice-${inv.invoiceNumber || inv.id || id}.pdf`}
                                                >
                                                    {({ loading }) =>
                                                        loading ? 'Loading...' : `Invoice ${inv.invoiceNumber || ''}`.trim()
                                                    }
                                                </PDFDownloadLink>
                                            ) : (
                                                `Invoice ${inv.invoiceNumber || inv.id || ''}`.trim()
                                            )
                                        }
                                        secondary={
                                            `${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleString() : ''}${inv.totalCost != null ? ` • $${Number(inv.totalCost).toFixed(2)}` : ''}`
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    )}
                </Box>

                {/* Comments Section */}
                <CommentsSection
                    jobId={id || ''}
                    currentUser={{
                        email: workflowEmail,
                        isStaff: false
                    }}
                    headerAction={canEdit ? (
                        <Button variant="contained" size="small" onClick={() => setResubmitOpen(true)} sx={{ textTransform: 'none' }}>
                            Resubmit job
                        </Button>
                    ) : undefined}
                />
                <ResubmitJobModal
                    open={resubmitOpen}
                    onClose={() => setResubmitOpen(false)}
                    jobId={id || ''}
                    onResubmitted={() => refetch()}
                />
            </div>
        </div>
    )
}
