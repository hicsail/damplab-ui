import React, { useState, useContext, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router';
import { useApolloClient, useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Button, Chip, Typography, Link as MuiLink, List, ListItem, ListItemText } from '@mui/material';

import { PDFDownloadLink } from '@react-pdf/renderer';
import JobInvoiceDocument from '../components/JobInvoiceDocument';
import { GET_INVOICES_BY_JOB_ID, GET_OWN_JOB_BY_ID, GET_SOW_BY_JOB_ID, GET_SOW_EDITOR_STATE } from '../gql/queries';
import { CANCEL_JOB, REJECT_JOB_REVIEW } from '../gql/mutations';
import { buildReasonedJobInput, retryOperationId } from '../utils/jobReview';
import { formatGqlError } from '../utils/gqlError';
import { JobSubmitterSummary, summarizeJobSubmitter } from '../utils/jobSubmitter';
import SowCustomerView            from '../components/sow/SowCustomerView';
import ProcessCard                from '../components/technician/ProcessCard';
import StatusPaneHeader           from '../components/technician/StatusPaneHeader';
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
import ThumbUpIcon from '@mui/icons-material/ThumbUpAltOutlined';
import ThumbDownIcon from '@mui/icons-material/ThumbDownAltOutlined';
import EditNoteIcon from '@mui/icons-material/EditNote';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { deriveCustomerLifecycle, validResponseAction } from '../utils/customerLifecycle';
import type { CustomerActionRequired } from '../utils/jobReview';
import { chipStatusBackground, invoiceVersionLabel, isJobProcessSettled, jobPartyStatus, jobStatusColor, jobStatusLabel, latestCustomerVisibleJobVersion, partyVersionLabel } from '../utils/technicianProcessStatus';

export default function Tracking() {

    const { id }                                        = useParams();
    const navigate                                      = useNavigate();
    const apolloClient                                  = useApolloClient();
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
        await Promise.all([
            refetch(),
            refetchSow(),
            refetchInvoices(),
            // The SOW card runs its own query. Without this, Refresh Job reloaded
            // the job and left the Statement of Work showing whatever it had —
            // including a version that had since been superseded.
            apolloClient.refetchQueries({ include: [GET_SOW_EDITOR_STATE] })
        ]);
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

    // The same rail metrics the staff job page uses, so the two pages line up.
    const railBtnSx = { textTransform: 'none' as const, width: '100%', justifyContent: 'flex-start', whiteSpace: 'nowrap' as const };
    // Who holds the job. Derived from its state alone — nothing here reads a
    // version number, which is what keeps a staff draft invisible.
    const jobParties = jobPartyStatus(job?.state);
    // The chip in the status pane, from the same helper the staff card uses, so
    // both pages name the same version. Safe to show: it is the newest version
    // the *customer* can see, and the server has already filtered this list to
    // exactly that. The rail labels stay hidden — those would name the lab's.
    const customerJobVersion = partyVersionLabel(latestCustomerVisibleJobVersion(versions));

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
                {/* The job's name and the commands that act on it, on one line —
                    the same header the staff page uses. Viewing the canvas is not
                    here: it is permanent rather than a response to a prompt, so it
                    lives in the Job card's rail. Everything in this row either
                    reloads the page or answers the lifecycle's primary action. */}
                <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5, mb: 1 }}>
                    <Typography variant="h5" fontWeight="bold">
                        {jobName}
                    </Typography>
                    <Box sx={{ flexGrow: 1 }} />
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
                    {/* Opening the editor is the Job card's rail button, which
                        turns solid in this state; this row keeps the submit. */}
                    {lifecycle.primaryAction === 'EDIT_WORKFLOW' && (
                        <Button
                            variant="contained"
                            startIcon={<SendIcon />}
                            onClick={() => setResponseAction('EDIT_WORKFLOW')}
                            sx={{ textTransform: 'none' }}
                        >
                            Submit updated workflow
                        </Button>
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
                    {/* Standing commands rather than answers to the prompt above, so
                        they come after it — but in the same row and at the same size.
                        A second, smaller row read as a footnote and pushed the job's
                        details away from its title. Cancel is last, where the staff
                        header keeps Close job. */}
                    {canRequestEditAccess && (
                        <Button
                            variant="outlined"
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
                            variant="outlined"
                            color="error"
                            startIcon={<CancelOutlinedIcon />}
                            onClick={() => setCancelling(true)}
                            sx={{ textTransform: 'none' }}
                        >
                            Cancel job
                        </Button>
                    )}
                </Box>
                {commandError && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setCommandError(null)}>
                        {commandError}
                    </Alert>
                )}
                <Box sx={{ fontSize: 13, mb: 2, textAlign: 'left', '& p:first-of-type': { mt: 0 } }}>
                    <p><b>Time:</b> {jobTime.slice(0, 16).replace('T', ' ')}</p>
                    <p><b>User:</b> {submitter.user}</p>
                    {submitter.onBehalfOf && <p>{submitter.onBehalfOf}</p>}
                    <p><b>Organization:</b> {submitter.organization}</p>
                </Box>

                <ProcessCard
                    title="Job"
                    defaultExpanded={!isJobProcessSettled(job?.state)}
                    customerBadge={jobParties.customer}
                    staffBadge={jobParties.staff}
                    // Same status, same chip, same colour as the staff card. The two
                    // pages were reporting this job differently — "Accepted / v5.3"
                    // against "Statement of Work withdrawn / Accepted" — which makes
                    // the lab and the client unable to describe a job to each other.
                    // The lifecycle line survives as the description, which is the one
                    // place the two pages should differ: it is addressed to the reader.
                    statusPaneSx={{ bgcolor: chipStatusBackground(jobStatusColor(job?.state)) }}
                    statusPane={
                        <StatusPaneHeader
                            status={jobStatusLabel(job?.state)}
                            chips={
                                customerJobVersion === '—' ? undefined : (
                                    <Chip size="small" label={customerJobVersion} color={jobStatusColor(job?.state)} />
                                )
                            }
                            reference={<><b>Job ID:</b> {job?.jobId ?? id}</>}
                            description={lifecycle.body}
                        />
                    }
                    actions={
                        /* Contained, like the staff card's own View/Edit Job: it is the
                           one thing this card does, and an outlined button alone in an
                           otherwise empty rail reads as disabled. */
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<AccountTreeIcon sx={{ transform: 'rotate(90deg) scaleY(-1)' }} />}
                            onClick={() => navigate(`/job_editor/${id}`)}
                            sx={railBtnSx}
                        >
                            {lifecycle.primaryAction === 'EDIT_WORKFLOW' ? 'View/Edit Job' : 'View workflow'}
                        </Button>
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

                {/* Always rendered, like the staff page's SOW card: "the lab has not
                    sent you one" is a status, and a card that appears out of nowhere
                    partway through a job is harder to follow than one that changes
                    colour. No Biosecurity card — that one is staff-only. */}
                <Box ref={sowSectionRef} tabIndex={-1} sx={{ outline: 'none' }}>
                    <SowCustomerView jobId={id || ''} onDeclined={refreshJobPage} />
                </Box>

                <ProcessCard
                    title="Invoices"
                    defaultExpanded={invoices.length > 0}
                    customerBadge={null}
                    staffBadge={null}
                    statusPaneSx={{ bgcolor: chipStatusBackground(invoices.length ? 'info' : 'default') }}
                    statusPane={
                        invoices.length ? (
                            <StatusPaneHeader
                                status={invoices.length === 1 ? '1 invoice' : `${invoices.length} invoices`}
                                reference={invoiceVersionLabel(invoices) !== '—' ? invoiceVersionLabel(invoices) : undefined}
                                description={
                                    invoices[invoices.length - 1]?.totalCost != null
                                        ? `Latest invoice · $${Number(invoices[invoices.length - 1].totalCost).toFixed(2)}`
                                        : undefined
                                }
                            />
                        ) : (
                            <StatusPaneHeader
                                status="No invoices yet"
                                description="The lab has not invoiced this job yet. Invoices appear here when they do."
                            />
                        )
                    }
                    actions={
                        invoices.length && id && sowFullData ? (
                            <PDFDownloadLink
                                document={
                                    <JobInvoiceDocument
                                        jobId={id}
                                        jobDisplayId={data?.ownJobById?.jobId ?? null}
                                        jobName={jobName}
                                        customerCategory={data?.ownJobById?.customerCategory ?? undefined}
                                        sow={sowFullData}
                                        invoice={invoices[invoices.length - 1]}
                                    />
                                }
                                fileName={`Invoice-${(invoices[invoices.length - 1]?.invoiceNumber ?? id) || id}.pdf`}
                                style={{ textDecoration: 'none', width: '100%' }}
                            >
                                {({ loading: pdfLoading }) => (
                                    <Button size="small" variant="outlined" disabled={pdfLoading} sx={railBtnSx}>
                                        {pdfLoading ? 'Loading invoice…' : 'Download Latest Invoice'}
                                    </Button>
                                )}
                            </PDFDownloadLink>
                        ) : undefined
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
