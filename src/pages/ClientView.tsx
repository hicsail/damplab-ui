import React, { useState, useContext, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router';
import { useQuery } from '@apollo/client';
import { Box, Button, Chip, Typography, Link as MuiLink, List, ListItem, ListItemText } from '@mui/material';

import { PDFDownloadLink } from '@react-pdf/renderer';
import JobInvoiceDocument from '../components/JobInvoiceDocument';
import { GET_INVOICES_BY_JOB_ID, GET_OWN_JOB_BY_ID, GET_SOW_BY_JOB_ID } from '../gql/queries';
import SowCustomerView            from '../components/sow/SowCustomerView';
import CollapsibleStatusCard      from '../components/CollapsibleStatusCard';
import { CommentsSection }        from '../components/CommentsSection';
import ResubmitJobModal          from '../components/ResubmitJobModal';
import { diffJobGraphs, latestVersion, selectedDiffPair } from '../utils/jobGraphDiff';
import JobVersionHistory from '../components/JobVersionHistory';
import { versionWorkflowsAsCards } from '../controllers/jobGraphHydration';
import { AppContext } from '../contexts/App';
import { UserContext }            from '../contexts/UserContext';
import JobWorkflowCards, { getParameterFiles as getJobParameterFiles } from '../components/JobWorkflowCards';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SendIcon from '@mui/icons-material/Send';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ThumbUpIcon from '@mui/icons-material/ThumbUpAltOutlined';
import { deriveCustomerLifecycle, validResponseAction } from '../utils/customerLifecycle';
import type { CustomerActionRequired } from '../utils/jobReview';
import { chipStatusBackground, invoiceVersionLabel } from '../utils/technicianProcessStatus';

export default function Tracking() {

    const { id }                                        = useParams();
    const navigate                                      = useNavigate();
    const userContext                                   = useContext(UserContext);

    const [workflowName,        setWorkflowName]        = useState('');
    const [workflowState,       setWorkflowState]       = useState('');
    const [jobName,             setJobName]             = useState('');
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
    const [attachments, setAttachments] = useState<any[]>([]);
    const [responseAction, setResponseAction] = useState<CustomerActionRequired | null>(null);
    const sowSectionRef = useRef<HTMLDivElement>(null);

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
        setJobTime(job.submitted ?? '');
        setWorkflowUsername(job.clientDisplayName || job.username || '');
        setWorkflowInstitution(job.institute ?? '');
        setWorkflowEmail(job.email ?? '');
        setWorklows(job.workflows ?? []);
        setAttachments(job.attachments ?? []);
        const wfs = job.workflows ?? [];
        if (wfs.length > 0) {
            setWorkflowName(wfs[0].name ?? '');
            setWorkflowState(wfs[0].state ?? '');
        }
        const latest = latestVersion((job as any)?.versions ?? []);
        if (latest) setViewingVersion((prev) => prev ?? latest.versionNumber);
    }, [data?.ownJobById]);

    const { data: sowByJobIdResult, refetch: refetchSow } = useQuery(GET_SOW_BY_JOB_ID, {
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

    const job = data?.ownJobById;
    const activeSow = sowFullData?.activeVersion ?? null;
    const visibleActiveSow = activeSow?.visibleToCustomer === true ? activeSow : null;
    const lifecycle = deriveCustomerLifecycle({
        state: job?.state,
        customerActionRequired: job?.customerActionRequired,
        activeSow: visibleActiveSow,
        signBlockers: sowFullData?.actionGate?.signBlockers
    });

    useEffect(() => {
        setResponseAction(null);
    }, [id]);

    useEffect(() => {
        setResponseAction((current) => validResponseAction(current, lifecycle.primaryAction));
    }, [lifecycle.primaryAction]);

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

    // Highlight what changed since the last version written by the other side,
    // unless the reader has picked a different pair from the history.
    const versions = (data?.ownJobById as any)?.versions ?? [];
    const { current, baseline } = selectedDiffPair(versions, viewingVersion, baselineVersionNumber);
    const graphDiff = current && baseline && current !== baseline ? diffJobGraphs(baseline.workflows, current.workflows) : undefined;


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
                {/* View is permanent — the canvas is what a customer submitted, and
                    there is no state in which they should have to take the lab's word
                    for what it says. Every other affordance comes from the explicit
                    lifecycle primary action. */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 1 }}>
                    <Button
                        variant="outlined"
                        startIcon={<VisibilityIcon />}
                        onClick={() => navigate(`/job_editor/${id}`)}
                        sx={{ textTransform: 'none' }}
                    >
                        View workflow
                    </Button>
                    {lifecycle.primaryAction === 'REPLY' && (
                        <Button
                            variant="contained"
                            startIcon={<SendIcon />}
                            onClick={() => setResponseAction('REPLY')}
                            sx={{ textTransform: 'none' }}
                        >
                            Reply to lab
                        </Button>
                    )}
                    {lifecycle.primaryAction === 'EDIT_WORKFLOW' && (
                        <>
                            <Button
                                variant="outlined"
                                startIcon={<AccountTreeIcon sx={{ transform: 'rotate(90deg) scaleY(-1)' }} />}
                                onClick={() => navigate(`/job_editor/${id}`)}
                                sx={{ textTransform: 'none' }}
                            >
                                Edit Job
                            </Button>
                            <Button
                                variant="contained"
                                startIcon={<SendIcon />}
                                onClick={() => setResponseAction('EDIT_WORKFLOW')}
                                sx={{ textTransform: 'none' }}
                            >
                                Submit updated workflow
                            </Button>
                        </>
                    )}
                    {lifecycle.primaryAction === 'APPROVE_WORKFLOW' && (
                        <Button
                            variant="contained"
                            startIcon={<ThumbUpIcon />}
                            onClick={() => setResponseAction('APPROVE_WORKFLOW')}
                            sx={{ textTransform: 'none' }}
                        >
                            Approve workflow
                        </Button>
                    )}
                    {lifecycle.primaryAction === 'SIGN_SOW' && (
                        <Button
                            variant="contained"
                            onClick={() => {
                                sowSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                sowSectionRef.current?.focus({ preventScroll: true });
                            }}
                            sx={{ textTransform: 'none' }}
                        >
                            Review and sign SOW
                        </Button>
                    )}
                </Box>
                <Typography variant="h5" fontWeight="bold">
                    {jobName}
                </Typography>
                <Box sx={{ mx: 3, fontSize: 13, mb: 2 }}>
                    <p><b>Time:</b>         {jobTime.slice(0, 16).replace('T', ' ')}</p>
                    <p><b>User:</b>         {workflowUsername} ({workflowEmail})</p>
                    <p><b>Organization:</b> {workflowInstitution}</p>
                </Box>

                <CollapsibleStatusCard
                    title="Job"
                    defaultExpanded
                    titleExtra={id ? <Typography variant="body2" color="text.secondary">{id}</Typography> : undefined}
                    statusPaneSx={{
                        bgcolor: lifecycle.primaryAction
                            ? 'rgba(255, 152, 0, 0.4)'
                            : chipStatusBackground(job?.state === 'REJECTED' ? 'error' : 'info')
                    }}
                    statusPane={
                        <Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <Typography variant="subtitle1" fontWeight={600}>{lifecycle.title}</Typography>
                                {job?.state && <Chip label={job.state} size="small" variant="outlined" />}
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{lifecycle.body}</Typography>
                        </Box>
                    }
                    details={
                        <>
                            {attachments.length > 0 && (
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Attachments</Typography>
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
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Parameter Files</Typography>
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
                            {workflowCard}
                        </>
                    }
                />

                {visibleActiveSow && (
                    <Box ref={sowSectionRef} tabIndex={-1} sx={{ outline: 'none' }}>
                        <SowCustomerView jobId={id || ''} />
                    </Box>
                )}

                <CollapsibleStatusCard
                    title="Invoices"
                    defaultExpanded={invoices.length > 0}
                    statusPaneSx={{ bgcolor: chipStatusBackground(invoices.length ? 'info' : 'default') }}
                    statusPane={
                        invoices.length ? (
                            <Box>
                                <Typography variant="subtitle1" fontWeight={600}>
                                    {invoices.length === 1 ? '1 invoice' : `${invoices.length} invoices`}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    Latest {invoiceVersionLabel(invoices)}
                                    {invoices[invoices.length - 1]?.totalCost != null
                                        ? ` · $${Number(invoices[invoices.length - 1].totalCost).toFixed(2)}`
                                        : ''}
                                </Typography>
                            </Box>
                        ) : (
                            <Box>
                                <Typography variant="subtitle1" fontWeight={600}>No invoices yet</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                    No invoices have been generated for this job yet.
                                </Typography>
                            </Box>
                        )
                    }
                    details={
                        invoices.length ? (
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
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                Invoices will appear here when the lab issues them.
                            </Typography>
                        )
                    }
                />

                {/* Comments Section */}
                <CommentsSection
                    jobId={id || ''}
                    currentUser={{
                        email: workflowEmail,
                        isStaff: false
                    }}
                />
                {responseAction && (
                    <ResubmitJobModal
                        action={responseAction}
                        open
                        onClose={() => setResponseAction(null)}
                        jobId={id || ''}
                        onResubmitted={async () => {
                            await Promise.all([refetch(), refetchSow()]);
                            setResponseAction(null);
                        }}
                    />
                )}
            </div>
        </div>
    )
}
