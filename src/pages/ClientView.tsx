import React, { useState, useContext, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Chip, Typography, Link as MuiLink, List, ListItem, ListItemText } from '@mui/material';

import { PDFDownloadLink } from '@react-pdf/renderer';
import JobInvoiceDocument from '../components/JobInvoiceDocument';
import { GET_INVOICES_BY_JOB_ID, GET_OWN_JOB_BY_ID, GET_SOW_BY_JOB_ID } from '../gql/queries';
import { CANCEL_JOB, REJECT_JOB_REVIEW } from '../gql/mutations';
import { buildReasonedJobInput, retryOperationId } from '../utils/jobReview';
import { formatGqlError } from '../utils/gqlError';
import { JobSubmitterSummary, summarizeJobSubmitter } from '../utils/jobSubmitter';
import SowCustomerView            from '../components/sow/SowCustomerView';
import CollapsibleStatusCard      from '../components/CollapsibleStatusCard';
import { CommentsSection }        from '../components/CommentsSection';
import ResubmitJobModal          from '../components/ResubmitJobModal';
import RequestEditAccessModal    from '../components/RequestEditAccessModal';
import ReasonDialog              from '../components/ReasonDialog';
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
import ThumbDownIcon from '@mui/icons-material/ThumbDownAltOutlined';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
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
    const [submitter, setSubmitter] = useState<JobSubmitterSummary>({ user: '', onBehalfOf: null, organization: '' });
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
        setSubmitter(summarizeJobSubmitter(job));
        setWorkflowEmail(job.email ?? '');
        setWorklows(job.workflows ?? []);
        setAttachments(job.attachments ?? []);
        const wfs = job.workflows ?? [];
        if (wfs.length > 0) {
            setWorkflowName(wfs[0].name ?? '');
            setWorkflowState(wfs[0].state ?? '');
        }
        // Land on the newest version, with its default comparison, every time the
        // job reloads. This was `prev ?? latest`, which pinned the view to
        // whatever was newest on first load: acting on the job and refreshing
        // left the reader still looking at a superseded version, and a baseline
        // they had picked by hand stayed selected against it.
        //
        // Safe to reset unconditionally because nothing polls this query — the
        // data only changes when the reader refreshes or acts on the job, and in
        // both cases the newest version is what they are asking to see.
        const latest = latestVersion((job as any)?.versions ?? []);
        if (latest) {
            setViewingVersion(latest.versionNumber);
            setBaselineVersionNumber(undefined);
        }
    }, [data?.ownJobById]);

    const { data: sowByJobIdResult, refetch: refetchSow } = useQuery(GET_SOW_BY_JOB_ID, {
        variables: { jobId: id as string },
        skip: !id,
        fetchPolicy: 'network-only',
    });
    const sowFullData = sowByJobIdResult?.sowByJobId ?? null;

    const { data: invoicesResult, refetch: refetchInvoices } = useQuery(GET_INVOICES_BY_JOB_ID, {
        variables: { jobId: id as string },
        skip: !id,
        fetchPolicy: 'network-only',
    });
    const invoices = invoicesResult?.invoicesByJobId ?? [];
    const [refreshing, setRefreshing] = useState(false);

    const refreshJobPage = async () => {
        await Promise.all([refetch(), refetchSow(), refetchInvoices()]);
    };

    const job = data?.ownJobById;
    const activeSow = sowFullData?.activeVersion ?? null;
    const visibleActiveSow = activeSow?.visibleToCustomer === true ? activeSow : null;
    const lifecycle = deriveCustomerLifecycle({
        state: job?.state,
        customerActionRequired: job?.customerActionRequired,
        activeSow: visibleActiveSow,
        signBlockers: sowFullData?.actionGate?.signBlockers
    });

    // The three commands a customer can issue outside a prompt. Each owns only
    // its dialog's open state; the payload builders and the mutations do the rest.
    const [rejecting, setRejecting] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [requestingEditAccess, setRequestingEditAccess] = useState(false);
    const [commandBusy, setCommandBusy] = useState(false);
    const [commandError, setCommandError] = useState<string | null>(null);
    const [rejectJobReview] = useMutation(REJECT_JOB_REVIEW);
    const [cancelJob] = useMutation(CANCEL_JOB);

    useEffect(() => {
        setResponseAction(null);
        setCommandError(null);
    }, [id]);

    useEffect(() => {
        setResponseAction((current) => validResponseAction(current, lifecycle.primaryAction));
    }, [lifecycle.primaryAction]);

    // A fresh operation id per dialog opening, so a retried submit resumes the
    // same command and a second, deliberate one never does.
    const commandOperationId = useRef<string | null>(null);
    const runCommand = async (send: (operationId: string) => Promise<unknown>, close: () => void, failure: string): Promise<void> => {
        setCommandBusy(true);
        setCommandError(null);
        try {
            commandOperationId.current = retryOperationId(commandOperationId.current, { type: 'submit', candidate: crypto.randomUUID() });
            await send(commandOperationId.current);
            await refreshJobPage();
            commandOperationId.current = retryOperationId(commandOperationId.current, { type: 'success' });
            close();
        } catch (err) {
            commandOperationId.current = retryOperationId(commandOperationId.current, { type: 'failure' });
            setCommandError(formatGqlError(err, failure));
        } finally {
            setCommandBusy(false);
        }
    };

    const sowStatus = visibleActiveSow?.status ?? null;
    // "Before the SOW is signed by both parties" — a document the client has
    // signed but the lab has not is still not an agreement, so only FINAL closes
    // the door. CLOSED and CANCELLED are already terminal.
    const canCancelJob = !!job && job.state !== 'CLOSED' && job.state !== 'CANCELLED' && sowStatus !== 'FINAL';
    // Tighter than cancelling on purpose: once the client has signed, the spec is
    // what was priced, and reopening it is the lab's call via a withdrawal.
    const canRequestEditAccess =
        !!job &&
        job.state !== 'CLOSED' &&
        job.state !== 'CANCELLED' &&
        sowStatus !== 'SIGNED' &&
        sowStatus !== 'FINAL' &&
        !(job.state === 'CHANGES_REQUESTED' && job.customerActionRequired === 'EDIT_WORKFLOW');
    const editAccessRequested = !!job?.editAccessRequestedAt;

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
                        startIcon={<RefreshIcon />}
                        onClick={async () => {
                            setRefreshing(true);
                            try {
                                await refreshJobPage();
                            } finally {
                                setRefreshing(false);
                            }
                        }}
                        disabled={!id || refreshing}
                        sx={{ textTransform: 'none' }}
                    >
                        {refreshing ? 'Refreshing…' : 'Refresh Job'}
                    </Button>
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
                                View/Edit Job
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
                        <>
                            <Button
                                variant="contained"
                                startIcon={<ThumbUpIcon />}
                                onClick={() => setResponseAction('APPROVE_WORKFLOW')}
                                sx={{ textTransform: 'none' }}
                            >
                                Approve workflow
                            </Button>
                            {/* Paired with Approve rather than hidden behind it: an
                                approval request with only one answer is not a request. */}
                            <Button
                                variant="outlined"
                                color="warning"
                                startIcon={<ThumbDownIcon />}
                                onClick={() => setRejecting(true)}
                                sx={{ textTransform: 'none' }}
                            >
                                Reject
                            </Button>
                        </>
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
                {/* A second row, deliberately: these two are available across many
                    states rather than answering the prompt above, and mixing them
                    into the primary row would read as alternatives to it. */}
                {(canRequestEditAccess || canCancelJob) && (
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mb: 2 }}>
                        {canRequestEditAccess && (
                            <Button
                                variant="text"
                                size="small"
                                startIcon={<EditNoteIcon />}
                                onClick={() => setRequestingEditAccess(true)}
                                disabled={editAccessRequested}
                                sx={{ textTransform: 'none' }}
                            >
                                {editAccessRequested ? 'Edit access requested' : 'Request Job Edit Access'}
                            </Button>
                        )}
                        {canCancelJob && (
                            <Button
                                variant="text"
                                size="small"
                                color="error"
                                startIcon={<CancelOutlinedIcon />}
                                onClick={() => setCancelling(true)}
                                sx={{ textTransform: 'none' }}
                            >
                                Cancel job
                            </Button>
                        )}
                    </Box>
                )}
                {commandError && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setCommandError(null)}>
                        {commandError}
                    </Alert>
                )}
                <Typography variant="h5" fontWeight="bold">
                    {jobName}
                </Typography>
                <Box sx={{ fontSize: 13, mb: 2, textAlign: 'left' }}>
                    <p><b>Time:</b> {jobTime.slice(0, 16).replace('T', ' ')}</p>
                    <p><b>User:</b> {submitter.user}</p>
                    {submitter.onBehalfOf && <p>{submitter.onBehalfOf}</p>}
                    <p><b>Organization:</b> {submitter.organization}</p>
                </Box>

                <CollapsibleStatusCard
                    title="Job"
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
                        <SowCustomerView jobId={id || ''} onDeclined={refreshJobPage} />
                    </Box>
                )}

                <CollapsibleStatusCard
                    title="Invoices"
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

                <ReasonDialog
                    open={rejecting}
                    title="Reject this workflow?"
                    warning={
                        'The lab will be told you are not approving these changes, and the job goes back to them for revision.\n\n' +
                        'This does not cancel your job.'
                    }
                    fieldLabel="Reason (the lab sees this)"
                    confirmLabel="Reject workflow"
                    busy={commandBusy}
                    onCancel={() => setRejecting(false)}
                    onConfirm={(reason) =>
                        runCommand(
                            (operationId) => rejectJobReview({ variables: { input: buildReasonedJobInput({ operationId, jobId: id || '', reason }, 'rejecting') } }),
                            () => setRejecting(false),
                            'Could not reject this workflow.'
                        )
                    }
                />

                <ReasonDialog
                    open={cancelling}
                    title="Cancel this job?"
                    warning={
                        'This ends the job. The lab stops work on it, any Statement of Work is cancelled with it, and you cannot undo this yourself.\n\n' +
                        'If you only want changes made, use Request Job Edit Access instead.'
                    }
                    fieldLabel="Reason (the lab sees this)"
                    confirmLabel="Cancel job"
                    busy={commandBusy}
                    onCancel={() => setCancelling(false)}
                    onConfirm={(reason) =>
                        runCommand(
                            (operationId) => cancelJob({ variables: { input: buildReasonedJobInput({ operationId, jobId: id || '', reason }, 'cancelling') } }),
                            () => setCancelling(false),
                            'Could not cancel this job.'
                        )
                    }
                />

                <RequestEditAccessModal
                    open={requestingEditAccess}
                    onClose={() => setRequestingEditAccess(false)}
                    jobId={id || ''}
                    onRequested={refreshJobPage}
                />
            </div>
        </div>
    )
}
