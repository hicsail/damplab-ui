import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useApolloClient } from '@apollo/client';
import { PDFDownloadLink } from '@react-pdf/renderer';

import { Box, Button, Chip, Typography, Alert, Link as MuiLink, List, ListItem, ListItemText, FormControl, InputLabel, MenuItem, Select, Dialog, DialogActions, DialogContent, DialogTitle, Checkbox, FormControlLabel } from '@mui/material';
import PictureAsPdfIcon                               from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon                                from '@mui/icons-material/Description';
import RateReviewIcon                                 from '@mui/icons-material/RateReview';
import EditNoteIcon                                   from '@mui/icons-material/EditNote';
import { billedLineIndexes, buildInvoiceServiceSelections, toggleLineIndex, unbilledLineIndexes, type BillableServiceLine } from '../utils/invoiceSelection';
import { formatGqlError } from '../utils/gqlError';
import UndoIcon                                       from '@mui/icons-material/Undo';
import CancelIcon                                     from '@mui/icons-material/Cancel';
import ReceiptLongIcon                                from '@mui/icons-material/ReceiptLong';
import RefreshIcon                                    from '@mui/icons-material/Refresh';

import { GET_INVOICES_BY_JOB_ID, GET_JOB_BY_ID, GET_SOW_BY_JOB_ID, GET_SOW_EDITOR_STATE }         from '../gql/queries';
import { JobSubmitterSummary, summarizeJobSubmitter }                                              from '../utils/jobSubmitter';
import { CREATE_INVOICE, CREATE_SOW_FOR_JOB, MUTATE_JOB_STATE, CHANGE_JOB_CUSTOMER_CATEGORY, WITHDRAW_JOB_FROM_CUSTOMER, WITHDRAW_JOB_ACCEPTANCE, RESTORE_JOB_VERSION }  from '../gql/mutations';
import JobWorkflowCards, { getParameterFiles as getJobParameterFiles } from '../components/JobWorkflowCards';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import { diffJobGraphs, hasUnseenStaffEdits, jobVersionDisplayLabel, latestVersion, selectedDiffPair } from '../utils/jobGraphDiff';
import JobVersionHistory from '../components/JobVersionHistory';
import { versionWorkflowsAsCards } from '../controllers/jobGraphHydration';

import JobFeedbackModal           from '../components/JobFeedbackModal';
import { canRevertVersions, technicianCustomerActionCopy } from '../utils/jobEditing';
import JobPDFDocument             from '../components/JobPDFDocument';
import JobInvoiceDocument         from '../components/JobInvoiceDocument';
import SowEditorModal             from '../components/sow/SowEditorModal';
import { SowPdfDownloadButton, SowStatusDetails, SowStatusSummary, useSowStaffStatus } from '../components/sow/SowStatusCard';
import ProcessCard                from '../components/technician/ProcessCard';
import ReasonDialog               from '../components/ReasonDialog';
import { CommentsSection }        from '../components/CommentsSection';
import { UserContext }            from '../contexts/UserContext';
import { AppContext }             from '../contexts/App';
import { CUSTOMER_CATEGORY_OPTIONS, statusColor } from '../components/sow/sowTypes';
import { chipStatusBackground, invoiceVersionLabel, isJobProcessSettled, isSowProcessSettled, jobPartyStatus, jobStatusColor, jobStatusLabel, latestCustomerVisibleJobVersion, latestCustomerVisibleSowVersion, latestStaffVisibleJobVersion, latestStaffVisibleSowVersion, partyVersionLabel, sowPartyStatus, sowPartyVersionLabel } from '../utils/technicianProcessStatus';
import StatusPaneHeader from '../components/technician/StatusPaneHeader';
import { BIOSECURITY_SCREENINGS, PLACEHOLDER_BIOSECURITY, biosecurityStatusColor, biosecurityStatusLabel, compositeBiosecurityStatus } from '../components/technician/biosecurityStatus';

const stripTypename = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(stripTypename);
    if (!value || typeof value !== 'object') return value;
    const out: Record<string, unknown> = {};
    Object.entries(value as Record<string, unknown>).forEach(([k, v]) => {
        if (k === '__typename') return;
        out[k] = stripTypename(v);
    });
    return out;
};

const downloadJson = (filename: string, payload: unknown) => {
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // Let the browser start the download before revoking.
    setTimeout(() => URL.revokeObjectURL(url), 0);
};

export default function TechnicianView() {

    const { id }                              = useParams();
    const navigate                            = useNavigate();
    const apolloClient                        = useApolloClient();
    const userContext                         = useContext(UserContext);
    // The catalogue, for re-attaching parameter definitions to a version snapshot.
    const { services }                        = useContext(AppContext);

    const [workflowName, setWorkflowName]     = useState('');
    const [workflowState, setWorkflowState]   = useState('');
    const [jobName, setJobName]               = useState('');
    const [jobState, setJobState]             = useState('');
    const [jobTime, setJobTime]               = useState('');
    const [submitter, setSubmitter] = useState<JobSubmitterSummary>({ user: '', onBehalfOf: null, organization: '' });
    // Kept as their own slots because the job PDF and the feedback modal take them
    // as separate props; the header reads `submitter` instead.
    const [jobUsername, setJobUsername]       = useState('');
    const [jobInstitution, setJobInstitution] = useState('');
    const [jobEmail, setJobEmail]             = useState('');
    const [jobNotes, setJobNotes] = useState('');
    const [workflows, setWorklows]            = useState<any[]>([]);
    // Which version of the graph is on screen, and what it is compared against.
    // Viewing starts unset and snaps to latest once versions load, matching
    // the job editor so Compare-to is a live controlled value on first paint.
    const [viewingVersion, setViewingVersion] = useState<number | null>(null);
    const [baselineVersionNumber, setBaselineVersionNumber] = useState<number | null | undefined>(undefined);
    const [attachments, setAttachments] = useState<any[]>([]);

    const { loading, error, data, refetch: refetchJob } = useQuery(GET_JOB_BY_ID, {
        variables: { id: id },
        skip: !id,
        fetchPolicy: 'network-only',
        onError: (error: any) => {
            // Error handled by error state
        }
    });

    // Keep local UI in sync on every fetch/refetch (onCompleted alone does not always run on refetch).
    useEffect(() => {
        const job = data?.jobById;
        if (!job) return;
        setJobName(job.name ?? '');
        setJobState(job.state ?? '');
        setJobTime(job.submitted ?? '');
        setSubmitter(summarizeJobSubmitter(job));
        setJobUsername(job.clientDisplayName || job.username || '');
        setJobInstitution(job.institute ?? '');
        setJobEmail(job.email ?? '');
        setJobNotes(job.notes ?? '');
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
        //
        // The newest *row*, not the newest edit: this was `latestContentVersion`,
        // which skips state-change events, so a job whose last row is "Accepted"
        // (5.3) reopened on the draft below it (5.1) and reported the job as still
        // being drafted. Accepting is the thing the reader most wants to see, and
        // the automatic baseline still skips events, so the diff below is
        // unaffected — it resolves to the last version written by the other side.
        const latest = latestVersion((job as any)?.versions ?? []);
        if (latest) {
            setViewingVersion(latest.versionNumber);
            setBaselineVersionNumber(undefined);
        }
    }, [data?.jobById]);

    const { data: sowByJobIdResult, loading: sowLoading, refetch: refetchSow } = useQuery(GET_SOW_BY_JOB_ID, {
        variables: { jobId: id as string },
        skip: !id,
        fetchPolicy: 'network-only',
    });

    const { data: invoicesResult, loading: invoicesLoading, refetch: refetchInvoices } = useQuery(GET_INVOICES_BY_JOB_ID, {
        variables: { jobId: id as string },
        skip: !id,
        fetchPolicy: 'network-only',
    });
    const invoices = invoicesResult?.invoicesByJobId ?? [];
    const sowStatus = useSowStaffStatus(id || '');

    // Derive from Apollo cache so refetches (e.g. after SOW upsert) update without a full page reload.
    const jobData = data?.jobById ?? null;
    const sowData = jobData?.sow ?? null;
    const sowFullData = sowByJobIdResult?.sowByJobId ?? null;

    const [createSowForJob] = useMutation(CREATE_SOW_FOR_JOB);
    const [creatingSow, setCreatingSow] = useState(false);
    const [sowCreateError, setSowCreateError] = useState<string | null>(null);

    const [changeJobCustomerCategory, { loading: categoryUpdating }] = useMutation(CHANGE_JOB_CUSTOMER_CATEGORY);
    const [changeJobStateMutation, { loading: closingJob }] = useMutation(MUTATE_JOB_STATE);
    const [withdrawFromCustomer] = useMutation(WITHDRAW_JOB_FROM_CUSTOMER);
    const [withdrawAcceptance] = useMutation(WITHDRAW_JOB_ACCEPTANCE);
    const [restoreJobVersion] = useMutation(RESTORE_JOB_VERSION);
    const [restoringVersion, setRestoringVersion] = useState(false);
    const [withdrawing, setWithdrawing] = useState(false);

    /**
     * Taking a job back so the lab can edit it again.
     *
     * Two shapes of the same intent. Both undo something the client can see, so
     * both state what is lost and require a reason — which is posted to the
     * client, and is the only account they get of why their job moved.
     */
    const [withdrawKind, setWithdrawKind] = useState<'customer' | 'acceptance' | null>(null);

    const withdrawCopy = {
        customer: {
            title: 'Withdraw this job from the client?',
            warning:
                'The workflow will be restored to the version the client was sent.\n\nEdits they saved but did not submit stay in the job history, but will no longer be the current version — they will see the workflow revert.',
            confirmLabel: 'Withdraw from client'
        },
        acceptance: {
            title: 'Withdraw the acceptance on this job?',
            warning:
                'The spec stops being agreed, so its Statement of Work cannot be sent or signed until you accept the job again.\n\nThe document itself is left alone — cancel it separately if it is not going ahead.',
            confirmLabel: 'Withdraw acceptance'
        }
    } as const;

    const handleWithdraw = async (reason: string) => {
        if (!id || !withdrawKind) return;
        setWithdrawing(true);
        try {
            const input = { operationId: crypto.randomUUID(), jobId: id, reason };
            if (withdrawKind === 'customer') await withdrawFromCustomer({ variables: { input } });
            else await withdrawAcceptance({ variables: { input } });
            await handleReviewSubmitted();
            setWithdrawKind(null);
        } catch (e: any) {
            window.alert(e?.message ?? 'Could not withdraw the job.');
        } finally {
            setWithdrawing(false);
        }
    };

    const handleCloseJob = async () => {
        if (!id) return;
        const ok = window.confirm(
            'Close this job? It will be marked CLOSED and removed from the lab monitor. This action is meant for jobs that are fully wrapped up.'
        );
        if (!ok) return;
        try {
            await changeJobStateMutation({ variables: { ID: id, State: 'CLOSED' } });
            await refreshJobPage();
        } catch (e) {
            console.error('Failed to close job:', e);
            window.alert('Could not close the job. Please try again.');
        }
    };

    /**
     * Restore the version currently being viewed.
     *
     * Server-side, like the editor's copy: withdrawing a job from the customer
     * restores the same way, and the gate deciding who may write lives there.
     * No picker bookkeeping afterwards — the effect on `data.jobById` already
     * snaps the view to the newest row on every refetch.
     */
    const handleRestoreVersion = async () => {
        if (!id || viewingVersion == null) return;
        const label = jobVersionDisplayLabel(viewingVersion);
        if (!window.confirm(`Restore version ${label}? This becomes the current workflow, saved as a new version. Nothing already in the history is lost.`)) return;
        setRestoringVersion(true);
        try {
            await restoreJobVersion({ variables: { jobId: id, versionNumber: viewingVersion, note: `Restored version ${label}` } });
            await refreshJobPage();
        } catch (e: any) {
            window.alert(e?.message ?? 'Could not restore that version.');
        } finally {
            setRestoringVersion(false);
        }
    };

    const [createInvoice, { loading: creatingInvoice }] = useMutation(CREATE_INVOICE);

    const [modalOpen, setModalOpen] = useState(false);
    const [sowModalOpen, setSowModalOpen] = useState(false);

    const handleOpenModal = () => {
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
    };

    const [refreshing, setRefreshing] = useState(false);

    const refreshJobPage = async () => {
        await Promise.all([
            refetchJob(),
            refetchSow(),
            refetchInvoices(),
            apolloClient.refetchQueries({ include: [GET_SOW_EDITOR_STATE] })
        ]);
    };

    const handleReviewSubmitted = () => refreshJobPage();

    /**
     * "Generate SOW" on a job that has none creates it first, then opens the
     * editor on it — the editor edits an existing document and has nothing to
     * show until one exists. The mutation returns the existing SOW when there
     * already is one, so a double click is harmless.
     */
    const handleOpenSOWModal = async () => {
        if (!id) return;
        if (sowData) {
            setSowModalOpen(true);
            return;
        }

        setSowCreateError(null);
        setCreatingSow(true);
        try {
            await createSowForJob({
                variables: { jobId: id },
                refetchQueries: [
                    { query: GET_JOB_BY_ID, variables: { id } },
                    { query: GET_SOW_BY_JOB_ID, variables: { jobId: id } }
                ],
                awaitRefetchQueries: true
            });
            setSowModalOpen(true);
        } catch (error: any) {
            setSowCreateError(error?.message ?? 'Could not generate the Statement of Work.');
        } finally {
            setCreatingSow(false);
        }
    };

    const handleCloseSOWModal = () => {
        setSowModalOpen(false);
        void refreshJobPage();
    };

    const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
    // Positions in billableServices, not service ids: a job can use the same
    // service twice, and those two lines have to be tickable independently.
    const [selectedInvoiceLines, setSelectedInvoiceLines] = useState<number[]>([]);
    const [invoiceError, setInvoiceError] = useState<string | null>(null);

    // The lines the server will bill, which is what the picker has to list — the
    // live `services` above can have drifted from the version in force.
    const billableServices: BillableServiceLine[] = sowFullData?.billableServices ?? [];

    // Lines an earlier invoice for this job already covers. The server refuses a
    // second invoice for the same line — billing it twice also credited the
    // discount twice — so the picker shows them rather than letting staff walk
    // into the refusal.
    const billedLines = billedLineIndexes(invoices, sowFullData?.activeVersion?.versionNumber ?? null);

    useEffect(() => {
        setSelectedInvoiceLines(unbilledLineIndexes(billableServices, billedLineIndexes(invoices, sowFullData?.activeVersion?.versionNumber ?? null)));
    }, [sowFullData?.billableServices, sowFullData?.activeVersion?.versionNumber, invoices]);

    const openInvoiceDialog = () => {
        if (!sowFullData) return;
        setInvoiceError(null);
        setInvoiceDialogOpen(true);
    };
    const closeInvoiceDialog = () => setInvoiceDialogOpen(false);

    const toggleInvoiceService = (index: number) => {
        setSelectedInvoiceLines((prev) => toggleLineIndex(prev, index));
    };

    const submitCreateInvoice = async () => {
        if (!id || selectedInvoiceLines.length === 0) return;
        setInvoiceError(null);
        try {
            const services = buildInvoiceServiceSelections(billableServices, selectedInvoiceLines);
            await createInvoice({ variables: { input: { jobId: id as string, services } } });
            await refetchInvoices();
            setInvoiceDialogOpen(false);
        } catch (err) {
            // The server refuses a selection it cannot place exactly — most often
            // because a workflow edit re-synced the SOW while this was open.
            setInvoiceError(formatGqlError(err, 'Could not create the invoice.'));
            await refetchSow();
        }
    };

    const getParameterFiles = () => getJobParameterFiles(workflows);

    // useEffect(() => {
    //     console.log(fetch('https://plasmapper.ca/api/features', {
    //         body: '{"sequence":"gacggatcgggagatctcccgatcccctatggtgcactctcagtacaatctgctctgatgccgcatagttaagccagtatctgctccctgcttgtgtgttggaggtcgctgagtagtgcgcgagcaaaatttaagctacaacaaggcaaggcttgaccgacaattgcatgaagaatctgcttagggttaggcgttttgcgctgcttcgcgatgtacgggccagatatacgcgttgacattgattattgactagttattaatagtaatcaattacggggtcattagttcatagcccatatatggagttccgcgttacataacttacggtaaatggcccgcctggctgaccgcccaacgacccccgcccattgacgtcaataatgacgtatgttcccatagtaacgccaatagggactttccattgacgtcaatgggtggagtatttacggtaaactgcccacttggcagtacatcaagtgtatcatatgccaagtacgccccctattgacgtcaatgacggtaaatggcccgcctggcattatgcccagtacatgaccttatgggactttcctacttggcagtacatctacgtattagtcatcgctattaccatggtgatgcggttttggcagtacatcaatgggcgtggatagcggtttgactcacggggatttccaagtctccaccccattgacgtcaatgggagtttgttttggcaccaaaatcaacgggactttccaaaatgtcgtaacaactccgccccattgacgcaaatgggcggtaggcgtgtacggtgggaggtctatataagcagagctctctggctaactagagaacccactgcttactggcttatcgaaattaatacgactcactatagggagacccaagctggctagcgtttaaacttaagcttggtaccgagctcggatccactagtccagtgtggtggaattctgcagatatccagcacagtggcggccgctcgagtctagagggcccgtttaaacccgctgatcagcctcgactgtgccttctagttgccagccatctgttgtttgcccctcccccgtgccttccttgaccctggaaggtgccactcccactgtcctttcctaataaaatgaggaaattgcatcgcattgtctgagtaggtgtcattctattctggggggtggggtggggcaggacagcaagggggaggattgggaagacaatagcaggcatgctggggatgcggtgggctctatggcttctgaggcggaaagaaccagctggggctctagggggtatccccacgcgccctgtagcggcgcattaagcgcggcgggtgtggtggttacgcgcagcgtgaccgctacacttgccagcgccctagcgcccgctcctttcgctttcttcccttcctttctcgccacgttcgccggctttccccgtcaagctctaaatcgggggctccctttagggttccgatttagtgctttacggcacctcgaccccaaaaaacttgattagggtgatggttcacgtagtgggccatcgccctgatagacggtttttcgccctttgacgttggagtccacgttctttaatagtggactcttgttccaaactggaacaacactcaaccctatctcggtctattcttttgatttataagggattttgccgatttcggcctattggttaaaaaatgagctgatttaacaaaaatttaacgcgaattaattctgtggaatgtgtgtcagttagggtgtggaaagtccccaggctccccagcaggcagaagtatgcaaagcatgcatctcaattagtcagcaaccaggtgtggaaagtccccaggctccccagcaggcagaagtatgcaaagcatgcatctcaattagtcagcaaccatagtcccgcccctaactccgcccatcccgcccctaactccgcccagttccgcccattctccgccccatggctgactaattttttttatttatgcagaggccgaggccgcctctgcctctgagctattccagaagtagtgaggaggcttttttggaggcctaggcttttgcaaaaagctcccgggagcttgtatatccattttcggatctgatcaagagacaggatgaggatcgtttcgcatgattgaacaagatggattgcacgcaggttctccggccgcttgggtggagaggctattcggctatgactgggcacaacagacaatcggctgctctgatgccgccgtgttccggctgtcagcgcaggggcgcccggttctttttgtcaagaccgacctgtccggtgccctgaatgaactgcaggacgaggcagcgcggctatcgtggctggccacgacgggcgttccttgcgcagctgtgctcgacgttgtcactgaagcgggaagggactggctgctattgggcgaagtgccggggcaggatctcctgtcatctcaccttgctcctgccgagaaagtatccatcatggctgatgcaatgcggcggctgcatacgcttgatccggctacctgcccattcgaccaccaagcgaaacatcgcatcgagcgagcacgtactcggatggaagccggtcttgtcgatcaggatgatctggacgaagagcatcaggggctcgcgccagccgaactgttcgccaggctcaaggcgcgcatgcccgacggcgaggatctcgtcgtgacccatggcgatgcctgcttgccgaatatcatggtggaaaatggccgcttttctggattcatcgactgtggccggctgggtgtggcggaccgctatcaggacatagcgttggctacccgtgatattgctgaagagcttggcggcgaatgggctgaccgcttcctcgtgctttacggtatcgccgctcccgattcgcagcgcatcgccttctatcgccttcttgacgagttcttctgagcgggactctggggttcgaaatgaccgaccaagcgacgcccaacctgccatcacgagatttcgattccaccgccgccttctatgaaaggttgggcttcggaatcgttttccgggacgccggctggatgatcctccagcgcggggatctcatgctggagttcttcgcccaccccaacttgtttattgcagcttataatggttacaaataaagcaatagcatcacaaatttcacaaataaagcatttttttcactgcattctagttgtggtttgtccaaactcatcaatgtatcttatcatgtctgtataccgtcgacctctagctagagcttggcgtaatcatggtcatagctgtttcctgtgtgaaattgttatccgctcacaattccacacaacatacgagccggaagcataaagtgtaaagcctggggtgcctaatgagtgagctaactcacattaattgcgttgcgctcactgcccgctttccagtcgggaaacctgtcgtgccagctgcattaatgaatcggccaacgcgcggggagaggcggtttgcgtattgggcgctcttccgcttcctcgctcactgactcgctgcgctcggtcgttcggctgcggcgagcggtatcagctcactcaaaggcggtaatacggttatccacagaatcaggggataacgcaggaaagaacatgtgagcaaaaggccagcaaaaggccaggaaccgtaaaaaggccgcgttgctggcgtttttccataggctccgcccccctgacgagcatcacaaaaatcgacgctcaagtcagaggtggcgaaacccgacaggactataaagataccaggcgtttccccctggaagctccctcgtgcgctctcctgttccgaccctgccgcttaccggatacctgtccgcctttctcccttcgggaagcgtggcgctttctcatagctcacgctgtaggtatctcagttcggtgtaggtcgttcgctccaagctgggctgtgtgcacgaaccccccgttcagcccgaccgctgcgccttatccggtaactatcgtcttgagtccaacccggtaagacacgacttatcgccactggcagcagccactggtaacaggattagcagagcgaggtatgtaggcggtgctacagagttcttgaagtggtggcctaactacggctacactagaagaacagtatttggtatctgcgctctgctgaagccagttaccttcggaaaaagagttggtagctcttgatccggcaaacaaaccaccgctggtagcggtttttttgtttgcaagcagcagattacgcgcagaaaaaaaggatctcaagaagatcctttgatcttttctacggggtctgacgctcagtggaacgaaaactcacgttaagggattttggtcatgagattatcaaaaaggatcttcacctagatccttttaaattaaaaatgaagttttaaatcaatctaaagtatatatgagtaaacttggtctgacagttaccaatgcttaatcagtgaggcacctatctcagcgatctgtctatttcgttcatccatagttgcctgactccccgtcgtgtagataactacgatacgggagggcttaccatctggccccagtgctgcaatgataccgcgagacccacgctcaccggctccagatttatcagcaataaaccagccagccggaagggccgagcgcagaagtggtcctgcaactttatccgcctccatccagtctattaattgttgccgggaagctagagtaagtagttcgccagttaatagtttgcgcaacgttgttgccattgctacaggcatcgtggtgtcacgctcgtcgtttggtatggcttcattcagctccggttcccaacgatcaaggcgagttacatgatcccccatgttgtgcaaaaaagcggttagctccttcggtcctccgatcgttgtcagaagtaagttggccgcagtgttatcactcatggttatggcagcactgcataattctcttactgtcatgccatccgtaagatgcttttctgtgactggtgagtactcaaccaagtcattctgagaatagtgtatgcggcgaccgagttgctcttgcccggcgtcaatacgggataataccgcgccacatagcagaactttaaaagtgctcatcattggaaaacgttcttcggggcgaaaactctcaaggatcttaccgctgttgagatccagttcgatgtaacccactcgtgcacccaactgatcttcagcatcttttactttcaccagcgtttctgggtgagcaaaaacaggaaggcaaaatgccgcaaaaaagggaataagggcgacacggaaatgttgaatactcatactcttcctttttcaatattattgaagcatttatcagggttattgtctcatgagcggatacatatttgaatgtatttagaaaaataaacaaataggggttccgcgcacatttccccgaaaagtgccacctgacgtc"}',
    //         headers: {
    //             Accept: 'application/json, text/plain, */*',
    //             'Origin': 'https://plasmapper.wishartlab.com',
    //             'Referer': 'https://plasmapper.wishartlab.com/',
    //             'Content-Type': 'application/json'
    //         },
    //         method: "POST"
    //     }))
    // })

    // Copy only: the pane's colour comes from jobStatusColor(), the one table
    // shared with the Statement of Work.
    const jobStatusText = (() => {
        switch (jobState) {
            case 'CREATING':
                return "The job is currently being created.";
            case 'SUBMITTED':
                return "The job was submitted to the DAMP lab and is awaiting review.";
            case 'CHANGES_REQUESTED':
                return technicianCustomerActionCopy(jobData);
            case 'ACCEPTED':
                return "The job was accepted by the DAMP Lab. The client will be asked to sign and return the SOW.";
            case 'WAITING_FOR_SOW':
                return "The job is waiting on its Statement of Work before lab work can start.";
            case 'QUEUED':
                return "The job is queued for lab work.";
            case 'IN_PROGRESS':
                return "Lab work on this job is under way.";
            case 'COMPLETE':
                return "Lab work on this job is finished. It can be invoiced and closed out.";
            case 'REJECTED':
                return "The job was rejected by the DAMP Lab. The client will be asked to resubmit the job with changes.";
            case 'CLOSED':
                return "This job has been closed out. It is no longer active in the lab monitor.";
            case 'CANCELLED':
                return "The client cancelled this job. Any Statement of Work was cancelled with it, and it is no longer active in the lab monitor.";
            default:
                return "This job's state is not recognised.";
        }
    })();

    const handleExportJobJson = () => {
        if (!id || !jobData) return;
        const exportPayload = stripTypename({
            exportedAt: new Date().toISOString(),
            job: jobData,
            sow: sowFullData,
            invoices,
        });
        const displayId = (jobData as any)?.jobId ?? id;
        downloadJson(`DAMP-Job-${displayId}.json`, exportPayload);
    };

    // const workflowCard = (
    //     <Card>
    //         <CardContent>
    //             <Typography sx={{ fontSize: 12 }} color="text.secondary" align="left">{workflowName}</Typography>
    //             <Typography sx={{ fontSize: 12 }} color="text.secondary" align="left">{workflowState}</Typography>
    //             <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', p: 1, m: 1 }}>
    //                 {
    //                     workflows.map((workflow: any) => {
    //                         return (
    //                             <WorkflowStepper workflow={transformGQLToWorkflow(workflow).nodes} key={workflow.id} />
    //                         )
    //                     })
    //                 }
    //             </Box>
    //         </CardContent>
    //     </Card>
    // );

    // Highlight what changed since the last version written by the other side,
    // unless the reader has picked a different pair from the history.
    const versions = (jobData as any)?.versions ?? [];
    const { current: currentVersion, baseline: baselineVersion } = selectedDiffPair(versions, viewingVersion, baselineVersionNumber);
    const graphDiff = currentVersion && baselineVersion && currentVersion !== baselineVersion
        ? diffJobGraphs(baselineVersion.workflows, currentVersion.workflows)
        : undefined;

    // Paging back shows that version's own graph; the newest one is the live job.
    //
    // Keyed off the same newest row the picker lands on. Keying it off the newest
    // *content* version instead would flip every accepted job to "historic" the
    // moment the default landed on its trailing event row, quietly swapping the
    // live graph for a snapshot that only happens to match it.
    const latest = latestVersion(versions);
    const isHistoricVersion = latest != null && viewingVersion != null && viewingVersion !== latest.versionNumber;

    // Whether accepting would bind the customer to edits they have never seen.
    // The three conditions this turns on are spelled out at hasUnseenStaffEdits.
    const customerHasNotSeenEdits = hasUnseenStaffEdits(versions);
    const cardWorkflows = isHistoricVersion ? versionWorkflowsAsCards(currentVersion?.workflows, services ?? []) : workflows;

    const workflowCard = (
        <>
            {versions.length > 1 && (
                <Box sx={{ mb: 1.5 }}>
                    <JobVersionHistory
                        versions={versions}
                        viewing={viewingVersion ?? latest?.versionNumber ?? 0}
                        baseline={baselineVersion?.versionNumber ?? null}
                        onViewingChange={(v) => {
                            setViewingVersion(v);
                            setBaselineVersionNumber(undefined);
                        }}
                        onBaselineChange={setBaselineVersionNumber}
                        onRestore={canRevertVersions(jobData, true) ? handleRestoreVersion : undefined}
                        restoring={restoringVersion}
                    />
                </Box>
            )}
            <JobWorkflowCards
                workflows={cardWorkflows}
                fallbackName={workflowName}
                diff={graphDiff}
                currentVersion={currentVersion}
                baselineVersion={baselineVersion}
            />
        </>
    );

    const currentCustomerCategory = jobData?.customerCategory ?? 'EXTERNAL_CUSTOMER_MARKET';
    const jobParties = jobPartyStatus(jobState);
    const sowParties = sowPartyStatus({
        currentStatus: sowStatus.current?.status,
        activeStatus: sowStatus.active?.status ?? sowStatus.sow?.activeVersion?.status
    });
    const jobCustomerVersion = partyVersionLabel(latestCustomerVisibleJobVersion(versions));
    const jobStaffVersion = partyVersionLabel(latestStaffVisibleJobVersion(versions));
    const sowCustomerVersion = sowPartyVersionLabel(latestCustomerVisibleSowVersion(sowStatus.sow?.versions ?? []));
    const sowStaffVersion = sowPartyVersionLabel(latestStaffVisibleSowVersion(sowStatus.sow?.versions ?? []));
    const invoiceLabel = invoiceVersionLabel(invoices);
    const sowStatusPaneColor = chipStatusBackground(
        sowStatus.sow ? statusColor(sowStatus.active?.status ?? sowStatus.current?.status) : 'default'
    );
    const invoiceStatusPaneColor = chipStatusBackground(invoices.length ? 'info' : 'default');
    const jobStatusPaneColor = chipStatusBackground(jobData ? jobStatusColor(jobState) : 'default');
    const biosecurity = PLACEHOLDER_BIOSECURITY;
    const biosecurityComposite = compositeBiosecurityStatus(biosecurity);
    const railBtnSx = { textTransform: 'none' as const, width: '100%', justifyContent: 'flex-start', whiteSpace: 'nowrap' as const };

    const handleCustomerCategoryChange = async (nextCategory: string) => {
        if (!id) return;
        try {
            await changeJobCustomerCategory({
                variables: { jobId: id as string, customerCategory: nextCategory },
            });
            await Promise.all([
                refetchJob(),
                refetchSow(),
                apolloClient.refetchQueries({ include: [GET_SOW_EDITOR_STATE] }),
            ]);
        } catch (e) {
            console.error('Failed to update job customer category:', e);
        }
    };

    return (
        <div>
            <Typography variant="h4" sx={{ mt: 2 }}>Job Tracking</Typography>
            <div style={{ textAlign: 'left', padding: '5vh' }}>
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
                    <Button
                        variant="outlined"
                        onClick={handleExportJobJson}
                        disabled={!jobData}
                        sx={{ textTransform: 'none' }}
                    >
                        Export job JSON
                    </Button>
                    <Button
                        variant="outlined"
                        color="warning"
                        onClick={handleCloseJob}
                        disabled={!jobData || jobState === 'CLOSED' || jobState === 'CANCELLED' || closingJob}
                        sx={{ textTransform: 'none' }}
                    >
                        {jobState === 'CLOSED' ? 'Job closed' : closingJob ? 'Closing…' : 'Close job'}
                    </Button>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 2 }}>
                    {/* Drop the stray top margin on the first <p> so this column starts
                        flush, leaving the mt on the pricing control as the only offset. */}
                    <Box sx={{ fontSize: 13, textAlign: 'left', '& p:first-of-type': { mt: 0 } }}>
                        <p><b>Time:</b> {jobTime.slice(0, 16).replace('T', ' ')}</p>
                        <p><b>User:</b> {submitter.user}</p>
                        {submitter.onBehalfOf && <p>{submitter.onBehalfOf}</p>}
                        <p><b>Organization:</b> {submitter.organization}</p>
                    </Box>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5, mt: 1 }}>
                        <FormControl size="small" sx={{ minWidth: 260 }} disabled={categoryUpdating || !jobData}>
                            <InputLabel id="pricing-category-label">Pricing category</InputLabel>
                            <Select
                                labelId="pricing-category-label"
                                value={currentCustomerCategory}
                                label="Pricing category"
                                onChange={(e) => handleCustomerCategoryChange(String(e.target.value))}
                            >
                                {CUSTOMER_CATEGORY_OPTIONS.map((opt) => (
                                    <MenuItem key={opt.value} value={opt.value}>
                                        {opt.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 260, textAlign: 'right' }}>
                            Updates this customer&apos;s category globally (signed SOWs remain static snapshots).
                        </Typography>
                    </Box>
                </Box>

                {sowCreateError && (
                    <Box sx={{ mb: 2 }}>
                        <Alert severity="error" onClose={() => setSowCreateError(null)}>
                            {sowCreateError}
                        </Alert>
                    </Box>
                )}

                <ProcessCard
                    title="Job"
                    defaultExpanded={!isJobProcessSettled(jobState)}
                    customerBadge={jobParties.customer}
                    staffBadge={jobParties.staff}
                    customerVersion={jobCustomerVersion}
                    staffVersion={jobStaffVersion}
                    statusPaneSx={{ bgcolor: jobStatusPaneColor }}
                    statusPane={
                        jobData ? (
                            <StatusPaneHeader
                                status={jobStatusLabel(jobState)}
                                chips={
                                    // partyVersionLabel returns '—' when the customer has seen
                                    // nothing yet; a chip reading "—" is worse than no chip.
                                    jobCustomerVersion === '—' ? undefined : (
                                        <Chip size="small" label={jobCustomerVersion} color={jobStatusColor(jobState)} />
                                    )
                                }
                                reference={<><b>Job ID:</b> {jobData?.jobId ?? id}</>}
                                description={jobStatusText}
                            />
                        ) : (
                            <StatusPaneHeader
                                status="Job not loaded"
                                description="This job could not be loaded. Check the ID or try again."
                            />
                        )
                    }
                    actions={
                        <>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<AccountTreeIcon sx={{ transform: 'rotate(90deg) scaleY(-1)' }} />}
                                onClick={() => navigate(`/job_editor/${id}`)}
                                disabled={jobState === 'CLOSED' || jobState === 'CANCELLED'}
                                sx={railBtnSx}
                            >
                                View/Edit Job
                            </Button>
                            <Button
                                variant="contained"
                                size="small"
                                color="error"
                                startIcon={<RateReviewIcon />}
                                onClick={handleOpenModal}
                                disabled={!['SUBMITTED', 'CHANGES_REQUESTED', 'ACCEPTED'].includes(jobState ?? '')}
                                sx={railBtnSx}
                            >
                                Review Job
                            </Button>
                            {/* The client asked for the editor. Granting it is an
                                ordinary review decision (Request edits), so this
                                only says a request is outstanding — it is cleared
                                by the next decision, whatever that decision is. */}
                            {jobData?.editAccessRequestedAt && (
                                <Chip
                                    size="small"
                                    color="warning"
                                    variant="outlined"
                                    icon={<EditNoteIcon />}
                                    label="Client requested edit access"
                                    sx={{ alignSelf: 'stretch' }}
                                />
                            )}
                            {jobState === 'CHANGES_REQUESTED' && (
                                <Button variant="contained" size="small" color="warning" startIcon={<UndoIcon />} onClick={() => setWithdrawKind('customer')} disabled={withdrawing} sx={railBtnSx}>
                                    {withdrawing ? 'Withdrawing…' : 'Withdraw from customer'}
                                </Button>
                            )}
                            {jobState === 'ACCEPTED' && (
                                <Button variant="contained" size="small" color="warning" startIcon={<UndoIcon />} onClick={() => setWithdrawKind('acceptance')} disabled={withdrawing} sx={railBtnSx}>
                                    {withdrawing ? 'Withdrawing…' : 'Withdraw acceptance'}
                                </Button>
                            )}
                            {id ? (
                                <PDFDownloadLink
                                    document={
                                        <JobPDFDocument
                                            jobId={id}
                                            jobName={jobName}
                                            jobUsername={jobUsername}
                                            jobEmail={jobEmail}
                                            jobInstitution={jobInstitution}
                                            jobNotes={jobNotes}
                                            jobTime={jobTime}
                                            workflows={workflows}
                                        />
                                    }
                                    fileName={`DAMP-Order-${id}.pdf`}
                                    style={{ textDecoration: 'none', width: '100%' }}
                                >
                                    {({ loading }) => (
                                        <Button color="primary" size="small" variant="outlined" startIcon={<PictureAsPdfIcon />} sx={railBtnSx}>
                                            {loading ? 'Loading document...' : 'Download Summary'}
                                        </Button>
                                    )}
                                </PDFDownloadLink>
                            ) : (
                                <Button color="primary" size="small" variant="outlined" startIcon={<PictureAsPdfIcon />} disabled sx={railBtnSx}>
                                    Download Summary
                                </Button>
                            )}
                        </>
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
                            {attachments.length === 0 && getParameterFiles().length === 0 && cardWorkflows.length === 0 && (
                                <Typography variant="body2" color="text.secondary">
                                    No workflow details to show yet.
                                </Typography>
                            )}
                            {workflowCard}
                        </>
                    }
                />

                <ProcessCard
                    title="Biosecurity"
                    customerBadge={null}
                    staffBadge={null}
                    customerVersion="—"
                    staffVersion="—"
                    statusPaneSx={{ bgcolor: chipStatusBackground(biosecurityStatusColor(biosecurityComposite)) }}
                    statusPane={
                        <StatusPaneHeader
                            status={biosecurityStatusLabel(biosecurityComposite)}
                            description="Metadata, homology, and customer screening have not run yet."
                        >
                            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 1 }}>
                                {BIOSECURITY_SCREENINGS.map((screening) => (
                                    <Chip
                                        key={screening.key}
                                        size="small"
                                        variant="outlined"
                                        color={biosecurityStatusColor(biosecurity[screening.key])}
                                        label={`${screening.label}: ${biosecurityStatusLabel(biosecurity[screening.key])}`}
                                    />
                                ))}
                            </Box>
                        </StatusPaneHeader>
                    }
                    actions={
                        <Button variant="outlined" size="small" disabled sx={railBtnSx}>
                            Run screening
                        </Button>
                    }
                    details={
                        <Typography variant="body2" color="text.secondary">
                            Biosecurity screening is not wired up yet. Metadata, homology, and customer screening will
                            report here once they run.
                        </Typography>
                    }
                />

                <ProcessCard
                    title="Statement of Work"
                    defaultExpanded={!isSowProcessSettled(sowStatus.active?.status ?? sowStatus.current?.status)}
                    customerBadge={sowParties.customer}
                    staffBadge={sowParties.staff}
                    customerVersion={sowCustomerVersion}
                    staffVersion={sowStaffVersion}
                    statusPaneSx={{ bgcolor: sowStatusPaneColor }}
                    statusPane={
                        <SowStatusSummary
                            sow={sowStatus.sow}
                            active={sowStatus.active}
                            current={sowStatus.current}
                            hasUnsentDraft={sowStatus.hasUnsentDraft}
                        />
                    }
                    actions={
                        <>
                            <Button
                                color={sowData ? 'primary' : 'secondary'}
                                variant="contained"
                                size="small"
                                startIcon={<DescriptionIcon />}
                                onClick={handleOpenSOWModal}
                                disabled={!jobData || creatingSow || sowStatus.outWithCustomer}
                                sx={railBtnSx}
                            >
                                {creatingSow ? 'Generating…' : sowData ? 'Manage SOW' : 'Generate SOW'}
                            </Button>
                            {sowStatus.outWithCustomer && (
                                <Button variant="contained" size="small" color="warning" startIcon={<UndoIcon />} onClick={sowStatus.requestWithdraw} disabled={sowStatus.busy} sx={railBtnSx}>
                                    Withdraw from client
                                </Button>
                            )}
                            {sowStatus.everIssued && !sowStatus.alreadyCancelled && (
                                <Button variant="contained" size="small" color="error" startIcon={<CancelIcon />} onClick={sowStatus.requestCancel} disabled={sowStatus.busy} sx={railBtnSx}>
                                    Cancel SOW
                                </Button>
                            )}
                            {sowStatus.sow && sowStatus.forPdf && (
                                <SowPdfDownloadButton
                                    sowNumber={sowStatus.sow.sowNumber}
                                    version={sowStatus.forPdf}
                                    button={(label, loading) => (
                                        <Button variant="outlined" size="small" startIcon={<PictureAsPdfIcon />} disabled={loading} sx={railBtnSx}>
                                            {label}
                                        </Button>
                                    )}
                                />
                            )}
                        </>
                    }
                    details={
                        sowStatus.sow ? (
                            <SowStatusDetails
                                repair={sowStatus.repair}
                                missingFields={sowStatus.missingFields}
                                active={sowStatus.active}
                            />
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                No Statement of Work has been generated for this job yet.
                            </Typography>
                        )
                    }
                />

                <ProcessCard
                    title="Invoices"
                    defaultExpanded
                    customerBadge={null}
                    staffBadge={null}
                    customerVersion={invoiceLabel}
                    staffVersion={invoiceLabel}
                    statusPaneSx={{ bgcolor: invoiceStatusPaneColor }}
                    statusPane={
                        invoices.length ? (
                            <StatusPaneHeader
                                status={invoices.length === 1 ? '1 invoice' : `${invoices.length} invoices`}
                                reference={invoiceLabel !== '—' ? invoiceLabel : undefined}
                                description={
                                    // The number itself is in the reference slot now, so this
                                    // line carries only what that does not say.
                                    invoices[invoices.length - 1]?.totalCost != null
                                        ? `Latest invoice · $${Number(invoices[invoices.length - 1].totalCost).toFixed(2)}`
                                        : undefined
                                }
                            />
                        ) : (
                            <StatusPaneHeader
                                status="No invoices yet"
                                description="Create an invoice from the Statement of Work services when you are ready to bill."
                            />
                        )
                    }
                    actions={
                        <>
                            <Button
                                color={sowFullData ? 'primary' : 'secondary'}
                                variant="contained"
                                size="small"
                                startIcon={<ReceiptLongIcon />}
                                disabled={!sowFullData || sowLoading}
                                onClick={openInvoiceDialog}
                                sx={railBtnSx}
                            >
                                Create Invoice
                            </Button>
                            {invoices?.length && id && sowFullData ? (
                                <PDFDownloadLink
                                    document={
                                        <JobInvoiceDocument
                                            jobId={id}
                                            jobDisplayId={jobData?.jobId ?? null}
                                            jobName={jobName}
                                            customerCategory={jobData?.customerCategory ?? undefined}
                                            sow={sowFullData}
                                            invoice={invoices[invoices.length - 1]}
                                        />
                                    }
                                    fileName={`Invoice-${(invoices[invoices.length - 1]?.invoiceNumber ?? id) || id}.pdf`}
                                    style={{ textDecoration: 'none', width: '100%' }}
                                >
                                    {({ loading }) => (
                                        <Button color="primary" size="small" variant="outlined" startIcon={<PictureAsPdfIcon />} sx={railBtnSx}>
                                            {loading ? 'Loading invoice...' : 'Download Latest Invoice'}
                                        </Button>
                                    )}
                                </PDFDownloadLink>
                            ) : (
                                <Button color="secondary" size="small" variant="outlined" startIcon={<PictureAsPdfIcon />} disabled sx={railBtnSx}>
                                    Download Latest Invoice
                                </Button>
                            )}
                        </>
                    }
                    details={
                        !invoices?.length ? (
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
                                                                jobDisplayId={jobData?.jobId ?? null}
                                                                jobName={jobName}
                                                                customerCategory={jobData?.customerCategory ?? undefined}
                                                                sow={sowFullData}
                                                                invoice={inv}
                                                            />
                                                        }
                                                        fileName={`Invoice-${inv.invoiceNumber || inv.id || id}.pdf`}
                                                    >
                                                        {({ loading }) =>
                                                            loading
                                                                ? 'Loading...'
                                                                : `Invoice ${inv.invoiceNumber || ''}`.trim()
                                                        }
                                                    </PDFDownloadLink>
                                                ) : (
                                                    `Invoice ${inv.invoiceNumber || inv.id || ''}`.trim()
                                                )
                                            }
                                            secondary={
                                                <>
                                                    {`${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleString() : ''}${inv.totalCost != null ? ` • $${Number(inv.totalCost).toFixed(2)}` : ''}`}
                                                    {/* Overlaps the server could prove are refused outright. These
                                                        are the ones it could not check — an earlier invoice that
                                                        predates line tracking, or one billed from a different
                                                        version — where silence would imply a guarantee nobody made. */}
                                                    {Array.isArray(inv.billingWarnings) && inv.billingWarnings.length > 0 && (
                                                        <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                                                            {inv.billingWarnings.map((warning: string, i: number) => (
                                                                <Typography key={i} component="span" variant="caption" color="warning.main" sx={{ display: 'block' }}>
                                                                    {warning}
                                                                </Typography>
                                                            ))}
                                                        </Box>
                                                    )}
                                                </>
                                            }
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        )
                    }
                />

                <CommentsSection 
                    jobId={id || ''}
                    currentUser={{
                        email: userContext.userProps?.idTokenParsed?.email ?? 'technician@bu.edu',
                        isStaff: true
                    }}
                />

                {sowStatus.dialog}
                {withdrawKind && (
                    <ReasonDialog
                        open
                        title={withdrawCopy[withdrawKind].title}
                        warning={withdrawCopy[withdrawKind].warning}
                        confirmLabel={withdrawCopy[withdrawKind].confirmLabel}
                        busy={withdrawing}
                        onCancel={() => setWithdrawKind(null)}
                        onConfirm={handleWithdraw}
                    />
                )}
                <JobFeedbackModal
                    open={modalOpen}
                    onClose={handleCloseModal}
                    onSubmitted={handleReviewSubmitted}
                    id={id}
                    jobName={jobName}
                    jobUsername={jobUsername}
                    jobEmail={jobEmail}
                    jobInstitution={jobInstitution}
                    jobTime={jobTime}
                    jobState={jobState}
                    customerHasNotSeenEdits={customerHasNotSeenEdits}
                />
                <SowEditorModal
                    open={sowModalOpen}
                    onClose={handleCloseSOWModal}
                    jobId={id ?? ''}
                    jobName={jobData?.name}
                />

                <Dialog open={invoiceDialogOpen} onClose={closeInvoiceDialog} maxWidth="sm" fullWidth>
                    <DialogTitle>Create invoice (select services)</DialogTitle>
                    <DialogContent>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Choose which SOW services to include on this invoice. This will create a saved invoice visible to the client.
                        </Typography>
                        {/* The prices below come from the Statement of Work in force
                            with the client, which is what an invoice bills. When the
                            job has been edited since, they will not match the Fee
                            Schedule figures shown elsewhere on this page. */}
                        {sowFullData?.documentStale && (
                            <Alert severity="info" sx={{ mb: 2 }}>
                                The job has changed since this Statement of Work was issued. These are the figures the client agreed to, which is what the invoice bills — not the job&rsquo;s current prices.
                            </Alert>
                        )}
                        {invoiceError && (
                            <Alert severity="error" sx={{ mb: 2 }} onClose={() => setInvoiceError(null)}>
                                {invoiceError}
                            </Alert>
                        )}
                        {billableServices.length === 0 && (
                            <Alert severity="warning">This Statement of Work has no service lines to invoice.</Alert>
                        )}
                        {billableServices.map((s: BillableServiceLine, idx: number) => {
                            const checked = selectedInvoiceLines.includes(idx);
                            const billedOn = billedLines.get(idx);
                            // Keyed on position, not on serviceId — two lines of the
                            // same service share an id and would collide as keys.
                            return (
                                <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, py: 0.5 }}>
                                    <FormControlLabel
                                        control={<Checkbox checked={checked} disabled={billedOn !== undefined} onChange={() => toggleInvoiceService(idx)} />}
                                        label={
                                            <Box>
                                                <Typography variant="subtitle2" color={billedOn !== undefined ? 'text.disabled' : undefined}>
                                                    {s?.name ?? 'Service'}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {s?.description ?? ''}
                                                    {s?.cost != null ? ` • $${Number(s.cost).toFixed(2)}` : ''}
                                                    {billedOn !== undefined ? ` • already invoiced${billedOn ? ` on ${billedOn}` : ''}` : ''}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </Box>
                            );
                        })}
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={closeInvoiceDialog} disabled={creatingInvoice}>Cancel</Button>
                        <Button
                            variant="contained"
                            onClick={submitCreateInvoice}
                            disabled={creatingInvoice || selectedInvoiceLines.length === 0}
                        >
                            {creatingInvoice ? 'Creating...' : 'Create Invoice'}
                        </Button>
                    </DialogActions>
                </Dialog>
            </div>
        </div>
    )
}
