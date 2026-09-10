import React, { useContext, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router';
import { useQuery, useMutation, useApolloClient } from '@apollo/client';
import { PDFDownloadLink } from '@react-pdf/renderer';
import { addDays, format } from 'date-fns';

import { Box, Button, Chip, Typography, Alert, Link as MuiLink, List, ListItem, ListItemText, FormControl, IconButton, InputLabel, MenuItem, Select, Tooltip } from '@mui/material';
import PictureAsPdfIcon                               from '@mui/icons-material/PictureAsPdf';
import DescriptionIcon                                from '@mui/icons-material/Description';
import RateReviewIcon                                 from '@mui/icons-material/RateReview';
import EditNoteIcon                                   from '@mui/icons-material/EditNote';
import { formatGqlError, formatSaveError } from '../utils/gqlError';
import { invoiceCountLabel } from '../utils/invoiceCounts';
import { invoiceBlockedMessage } from '../utils/invoiceGate';
import { dueDateLabel, formatMoney, invoiceKindLabel, invoiceKindOf, isLegacyInvoice } from '../utils/equipmentBilling';
import { buildReleaseRows, buildReleaseSelections, chargeKindLabel, defaultCheckedRows, sortChargesForDisplay } from '../utils/jobCharges';
import UndoIcon                                       from '@mui/icons-material/Undo';
import CancelIcon                                     from '@mui/icons-material/Cancel';
import ReceiptLongIcon                                from '@mui/icons-material/ReceiptLong';
import RefreshIcon                                    from '@mui/icons-material/Refresh';
import AddCardIcon                                    from '@mui/icons-material/AddCard';

import { GET_INVOICES_BY_JOB_ID, GET_JOB_BY_ID, GET_SOW_BY_JOB_ID, GET_SOW_EDITOR_STATE, GET_JOB_EQUIPMENT_BOOKING, GET_INVENTORY_AVAILABILITY, GET_JOB_BALANCE, GET_JOB_CHARGES, GET_JOB_PAYMENTS } from '../gql/queries';
import { JobSubmitterSummary, summarizeJobSubmitter }                                              from '../utils/jobSubmitter';
import { ADD_JOB_CHARGE, CREATE_INVOICE, CREATE_SOW_FOR_JOB, MUTATE_JOB_STATE, CHANGE_JOB_CUSTOMER_CATEGORY, VOID_JOB_CHARGE, WITHDRAW_JOB_FROM_CUSTOMER, WITHDRAW_JOB_ACCEPTANCE, RESTORE_JOB_VERSION, VOID_INVOICE }  from '../gql/mutations';
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
import JobEquipmentBookingPanel from '../components/booking/JobEquipmentBookingPanel';
import JobPaymentsPanel from '../components/billing/JobPaymentsPanel';
import { AddChargeDialog, GenerateInvoiceDialog } from '../components/billing/JobChargeDialogs';
import ReasonDialog               from '../components/ReasonDialog';
import Can                        from '../components/PermissionGate';
import { PERMISSIONS }            from '../hooks/usePermissions';
import { CommentsSection }        from '../components/CommentsSection';
import { UserContext }            from '../contexts/UserContext';
import { AppContext }             from '../contexts/App';
import { CUSTOMER_CATEGORY_OPTIONS, statusColor } from '../components/sow/sowTypes';
import { chipStatusBackground, invoiceVersionLabel, isJobProcessSettled, isSowProcessSettled, jobPartyStatus, jobStatusColor, jobStatusLabel, latestCustomerVisibleJobVersion, latestCustomerVisibleSowVersion, latestInvoice, latestStaffVisibleJobVersion, latestStaffVisibleSowVersion, partyVersionLabel, sowPartyStatus, sowPartyVersionLabel } from '../utils/technicianProcessStatus';
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

    // The statement's own view of what it carries beyond the SOW lines: the
    // release checklist reads `charges` to know which positions already have
    // a live SERVICE_LINE charge, and the Generate invoice dialog's summary
    // and the Charges block below both read `balance` / `charges` directly.
    const { data: chargesResult, loading: chargesLoading, error: chargesError } = useQuery(GET_JOB_CHARGES, {
        variables: { jobId: id as string },
        skip: !id,
        fetchPolicy: 'cache-and-network',
    });
    const charges: any[] = chargesResult?.jobCharges ?? [];

    const { data: balanceResult, loading: balanceLoading, error: balanceError } = useQuery(GET_JOB_BALANCE, {
        variables: { jobId: id as string },
        skip: !id,
        fetchPolicy: 'cache-and-network',
    });
    const balance = balanceResult?.jobBalance ?? null;
    // Newest first from the server, so the last element is the OLDEST — see latestInvoice.
    //
    // Two bindings, because "most recent record" and "the figure that stands" stop
    // being the same thing once an invoice can be voided. The summary's dollar
    // amount and the Download button must never quote a voided invoice: on the
    // client's page that line reads as what they owe.
    const liveInvoices = invoices.filter((inv: any) => !inv?.voidedAt);
    const newestLiveInvoice = latestInvoice<any>(liveInvoices);
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

    /**
     * Voiding an invoice.
     *
     * The double-billing guard refuses a line an earlier invoice already covers,
     * which without a void makes a mis-generated invoice permanent. Voiding keeps
     * the record — numbering is derived from a per-job count, so nothing may ever
     * be deleted — and releases its lines back into the picker.
     *
     * Held by id rather than by a boolean: the list can show several invoices, and
     * the dialog has to know which one it is confirming.
     */
    const [voidInvoice] = useMutation(VOID_INVOICE);
    const [voidTarget, setVoidTarget] = useState<{ id: string; invoiceNumber: string } | null>(null);
    const [voiding, setVoiding] = useState(false);

    const handleVoidInvoice = async (reason: string) => {
        if (!voidTarget) return;
        setVoiding(true);
        try {
            await voidInvoice({ variables: { invoiceId: voidTarget.id, reason } });
            // Refetched rather than relying on the cache write: voiding changes
            // which lines the Create Invoice dialog may tick, and that is computed
            // from this same list.
            await refetchInvoices();
            setVoidTarget(null);
        } catch (err: any) {
            window.alert(formatGqlError(err, 'Could not void the invoice.'));
        } finally {
            setVoiding(false);
        }
    };

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
            apolloClient.refetchQueries({ include: [GET_SOW_EDITOR_STATE, GET_JOB_EQUIPMENT_BOOKING, GET_INVENTORY_AVAILABILITY, GET_JOB_BALANCE, GET_JOB_CHARGES, GET_JOB_PAYMENTS] })
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

    // The lines the server will bill, which is what the release checklist has to
    // list — the live `services` above can have drifted from the version in force.
    const billableServices: any[] = sowFullData?.billableServices ?? [];

    // One row per SOW position, marked with whatever the charge ledger already
    // knows about it — released and locked, or open to release now.
    const releaseRows = buildReleaseRows(billableServices, charges);

    const [invoiceDialogOpen, setInvoiceDialogOpen] = useState(false);
    const [checkedRows, setCheckedRows] = useState<number[]>([]);
    const [invoiceError, setInvoiceError] = useState<string | null>(null);
    const [dueDate, setDueDate] = useState('');

    // Ticked by default whenever the ledger or the SOW positions change —
    // released rows stay checked (and locked) in the dialog regardless, so this
    // only matters for which unreleased rows start on.
    useEffect(() => {
        setCheckedRows(defaultCheckedRows(releaseRows));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sowFullData?.billableServices, chargesResult?.jobCharges]);

    const openInvoiceDialog = () => {
        if (!sowFullData) return;
        setInvoiceError(null);
        setDueDate(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
        setInvoiceDialogOpen(true);
    };
    const closeInvoiceDialog = () => setInvoiceDialogOpen(false);

    const toggleReleaseRow = (index: number) => {
        setCheckedRows((prev) => (prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]));
    };

    const submitCreateInvoice = async () => {
        if (!id || !dueDate) return;
        setInvoiceError(null);
        try {
            await createInvoice({
                variables: {
                    input: {
                        jobId: id as string,
                        releaseServiceLines: buildReleaseSelections(releaseRows, checkedRows),
                        // Noon, not midnight — a date-only string parsed as UTC midnight
                        // renders as the previous day in every negative-offset timezone,
                        // which is where this lab is (same reason JobPaymentsPanel gives).
                        dueDate: new Date(`${dueDate}T12:00:00`).toISOString()
                    }
                }
            });
            await refreshJobPage();
            setInvoiceDialogOpen(false);
        } catch (err) {
            // Stays open with the refusal visible in the dialog itself — most often
            // the SOW is not yet countersigned, there is nothing new to release, or
            // a workflow edit re-synced the SOW while this was open.
            setInvoiceError(formatSaveError(err, 'this invoice'));
        }
    };

    const [addJobCharge, { loading: addingCharge }] = useMutation(ADD_JOB_CHARGE);
    const [addChargeOpen, setAddChargeOpen] = useState(false);
    const [addChargeError, setAddChargeError] = useState<string | null>(null);

    const openAddCharge = () => {
        setAddChargeError(null);
        setAddChargeOpen(true);
    };
    const closeAddCharge = () => setAddChargeOpen(false);

    const submitAddCharge = async (input: { kind: 'CUSTOM' | 'DEPOSIT'; label: string; amount: number }) => {
        if (!id) return;
        setAddChargeError(null);
        try {
            await addJobCharge({ variables: { input: { jobId: id as string, ...input } } });
            await refreshJobPage();
            setAddChargeOpen(false);
        } catch (err) {
            setAddChargeError(formatSaveError(err, 'this charge'));
        }
    };

    /**
     * Voiding a charge.
     *
     * Held by id + label rather than a boolean, matching `voidTarget` above —
     * the dialog's title names the charge it is about to void.
     */
    const [voidJobCharge, { loading: voidingCharge }] = useMutation(VOID_JOB_CHARGE);
    const [chargeVoidTarget, setChargeVoidTarget] = useState<{ id: string; label: string } | null>(null);

    const handleVoidCharge = async (reason: string) => {
        if (!chargeVoidTarget) return;
        try {
            await voidJobCharge({ variables: { id: chargeVoidTarget.id, reason } });
            setChargeVoidTarget(null);
            await refreshJobPage();
        } catch (err: any) {
            window.alert(formatGqlError(err, 'Could not void the charge.'));
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
    const invoiceLabel = invoiceVersionLabel(liveInvoices);
    const sowStatusPaneColor = chipStatusBackground(
        sowStatus.sow ? statusColor(sowStatus.active?.status ?? sowStatus.current?.status) : 'default'
    );
    // Keyed on standing invoices: a job whose only invoice was voided has not been
    // billed, and an info-coloured pane saying "1 invoice" would imply it had.
    const invoiceStatusPaneColor = chipStatusBackground(liveInvoices.length ? 'info' : 'default');

    /**
     * Why Create Invoice is unavailable, or null when it is not.
     *
     * The server refuses an invoice against anything but a countersigned SOW.
     * `useSowStaffStatus` already holds the state that decides it and drives the
     * SOW card above; the button used to ignore it entirely, so staff reached the
     * refusal by clicking through a dialog and picking service lines first.
     */
    const invoiceBlocked = invoiceBlockedMessage(sowFullData ? { activeStatus: sowStatus.active?.status ?? null, versions: sowStatus.sow?.versions ?? [] } : null);
    // Computed unconditionally so a not-yet-loaded SOW is blocked rather than
    // offered, which is the direction `invoiceGate.ts` documents. The *reason* is
    // held back while loading, though: before the query answers, `sowFullData` is
    // undefined and the reason reads "this job has no Statement of Work yet" —
    // true of a job that has none, and wrong about every job that does.
    const showInvoiceBlockedReason = !sowLoading && !sowStatus.loading && !!invoiceBlocked;
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
                apolloClient.refetchQueries({ include: [GET_SOW_EDITOR_STATE, GET_JOB_EQUIPMENT_BOOKING, GET_INVENTORY_AVAILABILITY] }),
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

                {/* Read-only for staff, plus the pause switch when they hold
                    billing:view. Booking is the customer's act; confirming usage
                    stays on the Inventory schedule. */}
                <JobEquipmentBookingPanel jobId={id || ''} staffView />

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
                                status={invoiceCountLabel(invoices)}
                                reference={invoiceLabel !== '—' ? invoiceLabel : undefined}
                                description={
                                    // The number is in the reference slot and the voided state is
                                    // in the status, so this line carries only the figure — and it
                                    // quotes the newest invoice that still stands, never a voided
                                    // one.
                                    newestLiveInvoice?.totalCost != null
                                        ? `Latest invoice · $${Number(newestLiveInvoice.totalCost).toFixed(2)}`
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
                            <Can permission={PERMISSIONS.BillingWrite}>
                                <Tooltip title={showInvoiceBlockedReason ? invoiceBlocked : ''} disableHoverListener={!showInvoiceBlockedReason}>
                                    {/* A span, because MUI cannot attach a tooltip to a disabled
                                        button — and the reason is the whole point of disabling it. */}
                                    <span style={{ display: 'block' }}>
                                        <Button
                                            color={sowFullData && !invoiceBlocked ? 'primary' : 'secondary'}
                                            variant="contained"
                                            size="small"
                                            startIcon={<ReceiptLongIcon />}
                                            disabled={!sowFullData || sowLoading || sowStatus.loading || !!invoiceBlocked}
                                            onClick={openInvoiceDialog}
                                            sx={{ ...railBtnSx, width: '100%' }}
                                        >
                                            Generate invoice
                                        </Button>
                                    </span>
                                </Tooltip>
                            </Can>
                            {showInvoiceBlockedReason && (
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                                    {invoiceBlocked}
                                </Typography>
                            )}
                            <Can permission={PERMISSIONS.BillingWrite}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    startIcon={<AddCardIcon />}
                                    onClick={openAddCharge}
                                    sx={railBtnSx}
                                >
                                    Add charge
                                </Button>
                            </Can>
                            {/* Gated on a *standing* invoice: with none, `invoice` would be
                                null and the document would fall back to the SOW's own services,
                                printing a total with no adjustments applied. */}
                            {liveInvoices.length > 0 && id && sowFullData ? (
                                <PDFDownloadLink
                                    document={
                                        <JobInvoiceDocument
                                            jobId={id}
                                            jobDisplayId={jobData?.jobId ?? null}
                                            jobName={jobName}
                                            customerCategory={jobData?.customerCategory ?? undefined}
                                            sow={sowFullData}
                                            invoice={newestLiveInvoice}
                                        />
                                    }
                                    fileName={`Invoice-${(newestLiveInvoice?.invoiceNumber ?? id) || id}.pdf`}
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
                        <>
                        {!invoices?.length ? (
                            <Typography variant="body2" color="text.secondary">
                                No invoices have been generated for this job yet.
                            </Typography>
                        ) : (
                            <List dense>
                                {invoices.map((inv: any, idx: number) => (
                                    /* A voided invoice stays listed and stays numbered — deleting one
                                       would hand its number to the next invoice, since numbering is a
                                       per-job count. It is still downloadable, stamped VOID, because
                                       the copy already sent to a client has to remain retrievable. */
                                    <ListItem
                                        key={inv.id || idx}
                                        sx={{ pl: 0, opacity: inv.voidedAt ? 0.6 : 1 }}
                                        secondaryAction={
                                            inv.voidedAt ? null : (
                                                <Can permission={PERMISSIONS.BillingWrite}>
                                                    <Button
                                                        size="small"
                                                        color="warning"
                                                        startIcon={<CancelIcon />}
                                                        disabled={voiding}
                                                        onClick={() => setVoidTarget({ id: String(inv.id), invoiceNumber: String(inv.invoiceNumber ?? inv.id ?? '') })}
                                                    >
                                                        Void
                                                    </Button>
                                                </Can>
                                            )
                                        }
                                    >
                                        <ListItemText
                                            slotProps={inv.voidedAt ? { primary: { sx: { textDecoration: 'line-through' } } } : undefined}
                                            primary={
                                                <Box component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}>
                                                    <Chip size="small" label={invoiceKindLabel(inv)} variant="outlined" color={invoiceKindOf(inv) === 'EQUIPMENT' ? 'info' : 'default'} />
                                                    {isLegacyInvoice(inv) && <Chip size="small" variant="outlined" color="default" label="Legacy" />}
                                                    <Box component="span">
                                                        {id && sowFullData ? (
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
                                                        )}
                                                    </Box>
                                                </Box>
                                            }
                                            secondary={
                                                <>
                                                    {`${inv.invoiceDate ? new Date(inv.invoiceDate).toLocaleString() : ''}${inv.totalCost != null ? ` • $${Number(inv.totalCost).toFixed(2)}` : ''}${dueDateLabel(inv.dueDate) ? ` • ${dueDateLabel(inv.dueDate)}` : ''}`}
                                                    {/* Says VOID in words, not by the strikethrough alone —
                                                        the reason is the part staff actually need. */}
                                                    {inv.voidedAt && (
                                                        <Typography component="span" variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5, fontWeight: 700 }}>
                                                            {`VOID — ${inv.voidReason || 'no reason recorded'}`}
                                                            {inv.voidedBy ? ` (${inv.voidedBy}` : ''}
                                                            {inv.voidedBy && inv.voidedAt ? `, ${new Date(inv.voidedAt).toLocaleDateString()})` : inv.voidedBy ? ')' : ''}
                                                        </Typography>
                                                    )}
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
                        )}

                        <Box sx={{ mt: 2 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                Charges
                            </Typography>
                            {charges.length === 0 ? (
                                chargesLoading ? null : chargesError ? (
                                    <Alert severity="error">{formatGqlError(chargesError, 'Could not load the charges.')}</Alert>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">
                                        No charges have been added to this job yet.
                                    </Typography>
                                )
                            ) : (
                                <List dense>
                                    {sortChargesForDisplay(charges).map((c: any) => {
                                        const voided = !!c.voidedAt;
                                        return (
                                            <ListItem
                                                key={c.id}
                                                sx={{ pl: 0, opacity: voided ? 0.6 : 1 }}
                                                secondaryAction={
                                                    voided ? null : (
                                                        <Can permission={PERMISSIONS.BillingWrite}>
                                                            <Tooltip title="Void this charge">
                                                                <IconButton
                                                                    size="small"
                                                                    color="warning"
                                                                    disabled={voidingCharge}
                                                                    onClick={() => setChargeVoidTarget({ id: String(c.id), label: String(c.label ?? '') })}
                                                                >
                                                                    <CancelIcon fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        </Can>
                                                    )
                                                }
                                            >
                                                <ListItemText
                                                    slotProps={voided ? { primary: { sx: { textDecoration: 'line-through' } } } : undefined}
                                                    primary={`${chargeKindLabel(c.kind)} · ${c.label} · ${formatMoney(c.amount)}`}
                                                    secondary={
                                                        voided ? (
                                                            <Typography component="span" variant="caption" color="error.main" sx={{ display: 'block', mt: 0.5, fontWeight: 700 }}>
                                                                {`VOID — ${c.voidReason || 'no reason recorded'}`}
                                                            </Typography>
                                                        ) : undefined
                                                    }
                                                />
                                            </ListItem>
                                        );
                                    })}
                                </List>
                            )}
                        </Box>
                        </>
                    }
                />

                {/* Payments read the invoice they settle, so this card sits below
                    the one that issues it. */}
                <JobPaymentsPanel jobId={id || ''} staffView />

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
                {voidTarget && (
                    <ReasonDialog
                        open
                        title={`Void invoice ${voidTarget.invoiceNumber}?`}
                        warning={
                            'The invoice is kept and keeps its number — nothing is deleted, so a later invoice can never reuse it.\n\n' +
                            'Its services become available to invoice again. The client sees the invoice marked VOID in their list, and the reason you give below is printed on the invoice itself.'
                        }
                        // ReasonDialog's default wording, deliberately: the reason is
                        // printed in the client's invoice list AND in the VOID banner on
                        // the downloadable PDF. Labelling it "recorded on the invoice"
                        // invites an internal note into a field the customer reads.
                        confirmLabel="Void invoice"
                        busy={voiding}
                        onCancel={() => setVoidTarget(null)}
                        onConfirm={handleVoidInvoice}
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

                <GenerateInvoiceDialog
                    open={invoiceDialogOpen}
                    busy={creatingInvoice}
                    error={invoiceError}
                    rows={releaseRows}
                    checked={checkedRows}
                    onToggle={toggleReleaseRow}
                    balance={balance}
                    balanceLoading={balanceLoading}
                    balanceError={balanceError}
                    dueDate={dueDate}
                    onDueDate={setDueDate}
                    documentStale={!!sowFullData?.documentStale}
                    onCancel={closeInvoiceDialog}
                    onConfirm={submitCreateInvoice}
                />

                <AddChargeDialog
                    open={addChargeOpen}
                    busy={addingCharge}
                    error={addChargeError}
                    onCancel={closeAddCharge}
                    onConfirm={submitAddCharge}
                />

                {chargeVoidTarget && (
                    <ReasonDialog
                        open
                        title={`Void the ${chargeVoidTarget.label} charge?`}
                        warning={
                            'The charge is kept and shown struck through with your reason, so the balance moving back down is explicable.\n\n' +
                            'Invoices already issued are not changed — each one states the balance as at its own date.'
                        }
                        confirmLabel="Void charge"
                        busy={voidingCharge}
                        onCancel={() => setChargeVoidTarget(null)}
                        onConfirm={handleVoidCharge}
                    />
                )}
            </div>
        </div>
    )
}
